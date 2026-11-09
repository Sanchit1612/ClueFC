import {z} from 'zod';
import {parseMessage,codeSchema,nameSchema} from '../../packages/protocol/index.ts';
import {fail} from '../../packages/game-core/index.ts';
import {makePlayer,makeRoom,roomCode,addPlayer,apply,snapshot,tick,type Room} from './rooms.ts';
import {roomExpiresAt,touch} from './lifecycle.ts';
import {ipHashes,banCheck,bucket,counter,mac,violation,verifyGate,makeChallenge,isAdmin,type SecurityEnv} from './security.ts';
import {persistEffects,cleanup,metric,adminApi,analyticsVisit} from './operations.ts';
export type Env=SecurityEnv;
const proofSchema=z.union([z.string().max(2048),z.object({nonce:z.string().max(1024),proof:z.number().int().nonnegative()})]);
const joinSchema=z.object({nickname:nameSchema,token:z.string().max(64).optional(),challenge:proofSchema.optional(),ageConfirmed:z.boolean().optional()});
export const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function readBody(req:Request){
 if(Number(req.headers.get('content-length'))>2048)fail('MESSAGE_TOO_LARGE');
 const reader=req.body?.getReader();if(!reader)return {};
 const chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();fail('MESSAGE_TOO_LARGE')}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{fail('INVALID_MESSAGE')}
}
export async function mutate<T>(db:D1Database,code:string,fn:(r:Room)=>{value:T;changed:boolean},now:number):Promise<T>{
 for(let attempt=0;attempt<8;attempt++){
  const row=await db.prepare('SELECT state,version,expires FROM rooms WHERE code=?').bind(code).first<{state:string;version:number;expires:number}>();
  if(!row)fail('ROOM_NOT_FOUND');const r:Room=JSON.parse(row.state);
  if(roomExpiresAt(r)<=now)fail('ROOM_NOT_FOUND');
  const before=structuredClone(r);const timed=tick(r,now);const out=fn(r);
  if(!out.changed&&!timed)return out.value;
  r.version=row.version+1;r.updated=now;
  const res=await db.prepare('UPDATE rooms SET state=?,version=?,updated=?,expires=? WHERE code=? AND version=?').bind(JSON.stringify(r),r.version,now,roomExpiresAt(r),code,row.version).run();
  if(res.meta.changes){const response=out.value as any;if(response&&typeof response==='object'){if('roomVersion' in response)response.roomVersion=r.version;if(response.snapshot)response.snapshot.roomVersion=r.version}try{await persistEffects(db,before,r,now)}catch{console.error(JSON.stringify({event:'operation_record_failed',room:code}))}return out.value}
 }
 fail('PLEASE_RETRY');
}
function authenticate(r:Room,req:Request,now:number){
 const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');const p=r.players.find(q=>q.token===token);
 if(!p||p.bot||p.left||r.bans.some(b=>b.token===token&&b.until>now))fail('NOT_IN_ROOM');
 if(p.session!==req.headers.get('X-Session'))fail('OPENED_ELSEWHERE');return p;
}
const bannedFrom=(r:Room,token:string|undefined,ips:string[],now:number)=>r.bans.some(b=>b.until>now&&(!!token&&b.token===token||!!b.ipHash&&ips.includes(b.ipHash)));
export async function api(req:Request,env:Env,ctx:ExecutionContext){
 const u=new URL(req.url),now=Date.now(),path=u.pathname;const origin=req.headers.get('Origin');let ips:string[]=[];
 if(origin&&origin!==u.origin)return json({error:'ORIGIN_REJECTED'},403);
 try{
  if(path==='/health'){
   if(!env.DB)fail('STORAGE_UNAVAILABLE');await env.DB.prepare('SELECT 1 AS healthy').first();ctx.waitUntil(cleanup(env.DB,now));
   return json({ok:true,service:'clue-fc',storage:true,botProtection:env.TURNSTILE_SECRET?'turnstile':env.PUBLIC_MODE==='true'?'connection-proof':'private'});
  }
  if(path==='/api/config')return json({turnstileSiteKey:env.TURNSTILE_SITE_KEY??null,botProtection:env.TURNSTILE_SECRET?'turnstile':env.PUBLIC_MODE==='true'?'proof':'none',ownerContact:env.OWNER_CONTACT??'sanchitgoeldev@gmail.com',public:env.PUBLIC_MODE==='true',admin:isAdmin(req,env),adsEnabled:false});
  if(!env.DB)fail('STORAGE_UNAVAILABLE');
  ips=await ipHashes(req,env,now);await banCheck(env.DB,ips,now);
  if(path.startsWith('/api/admin/'))return await adminApi(req,env,req.method==='POST'?await readBody(req):null,now);
  if(path==='/api/challenge'&&req.method==='GET'){await counter(env.DB,'challenge-issue:'+ips[0],30,60000,now);return json(await makeChallenge(env,ips[0],now))}
  if(path==='/api/analytics/visit'&&req.method==='POST'){await counter(env.DB,'analytics:'+ips[0],10,60000,now);return json(await analyticsVisit(req,env,await readBody(req),now))}
  if(req.method==='POST'&&(path==='/api/rooms'||path==='/api/quick')){
   await counter(env.DB,'create:'+ips[0],5,600000,now);const data=joinSchema.parse(await readBody(req));
   if(env.PUBLIC_MODE==='true'&&!data.ageConfirmed)fail('AGE_CONFIRMATION_REQUIRED');
   await verifyGate(req,env,ips[0],data.challenge,now);
   const p=makePlayer(data.nickname,now);p.ipHash=ips[0];let code:string|undefined;
   if(path==='/api/quick'){
    const rows=await env.DB.prepare('SELECT code FROM rooms WHERE public=1 AND expires>? ORDER BY updated DESC LIMIT 30').bind(now).all<{code:string}>();
    for(const row of rows.results){try{
     await mutate(env.DB,row.code,r=>{
      if(r.game||r.players.filter(q=>!q.left&&q.team).length>=12||bannedFrom(r,undefined,ips,now))fail('ROOM_FULL');
      addPlayer(r,p,now);tick(r,now);return {value:true,changed:true};
     },now);code=row.code;break;
    }catch(e){if(['ROOM_NOT_FOUND','ROOM_FULL'].includes((e as Error).message))continue;throw e}}
   }
   if(!code){
    const r=makeRoom('',p,path==='/api/quick',now);if(r.public){p.team='home';p.spy=true}
    for(let attempt=0;attempt<10;attempt++){
     r.code=roomCode();const inserted=await env.DB.prepare('INSERT OR IGNORE INTO rooms(code,version,public,updated,expires,state) VALUES(?,?,?,?,?,?)').bind(r.code,1,r.public?1:0,now,roomExpiresAt(r),JSON.stringify(r)).run();
     if(inserted.meta.changes){code=r.code;break}
    }
    if(code)ctx.waitUntil(metric(env.DB,'rooms_created',1,now));
   }
   if(!code)fail('PLEASE_RETRY');ctx.waitUntil(cleanup(env.DB,now));return json({code,token:p.token,session:p.session,id:p.id});
  }
  const match=path.match(/^\/api\/rooms\/([^/]+)(?:\/(join|action))?$/);if(!match)return json({error:'NOT_FOUND'},404);
  const code=codeSchema.parse(match[1]);
  if(match[2]==='join'&&req.method==='POST'){
   await counter(env.DB,'join:'+ips[0],30,60000,now);const data=joinSchema.parse(await readBody(req));
   if(env.PUBLIC_MODE==='true'&&!data.token&&!data.ageConfirmed)fail('AGE_CONFIRMATION_REQUIRED');
   return json(await mutate(env.DB,code,r=>{
    if(bannedFrom(r,data.token,ips,now))fail('NOT_IN_ROOM');let p=r.players.find(q=>q.token===data.token);
    if(p&&!p.left){p.session=crypto.randomUUID();touch(r,p,now);p.ipHash=ips[0]}
    else{p=makePlayer(data.nickname,now);p.ipHash=ips[0];addPlayer(r,p,now)}tick(r,now);
    return {value:{code,token:p.token,session:p.session,id:p.id,seq:p.seq},changed:true};
   },now));
  }
  if(!match[2]&&req.method==='GET'){
   await bucket(env.DB,'read:'+ips[0],now,240,120);
   return json(await mutate(env.DB,code,r=>{
    const p=authenticate(r,req,now);let changed=now-p.seen>8000;if(changed)touch(r,p,now);changed=tick(r,now)||changed;
    const value=snapshot(r,p,now);if(changed)value.roomVersion++;return {value,changed};
   },now));
  }
  if(match[2]==='action'&&req.method==='POST'){
   await bucket(env.DB,'message-ip:'+ips[0],now);const token=await mac(env.IP_HASH_SECRET??'local-development-only','token:'+(req.headers.get('Authorization')??''));await bucket(env.DB,'message-token:'+token,now);
   const msg=parseMessage(await readBody(req));
   if(msg.type==='clue.submit'){await counter(env.DB,'clue-ip:'+ips[0],20,60000,now);await counter(env.DB,'clue-token:'+token,5,60000,now)}
   if(msg.type==='report.player'){await counter(env.DB,'report-ip:'+ips[0],5,600000,now);await counter(env.DB,'report-token:'+token,5,600000,now)}
   const result=await mutate(env.DB,code,r=>{
    const p=authenticate(r,req,now);touch(r,p,now);tick(r,now);
    if(msg.seq<=p.seq)return {value:p.lastError?.seq===msg.seq?{error:p.lastError.code}:snapshot(r,p,now),changed:true};
    let error:string|null=null;try{apply(r,p,msg.type,msg.payload,now)}catch(e){error=(e as Error).message;if(!/^[A-Z_]+$/.test(error))throw e}
    p.seq=msg.seq;p.lastError=error?{seq:msg.seq,code:error}:undefined;
    if(!error&&msg.type!=='ping')r.lastAction=now;tick(r,now);
    const value=error?{error,snapshot:snapshot(r,p,now)}:snapshot(r,p,now);if('roomVersion' in value)value.roomVersion++;
    return {value,changed:true};
   },now);
   return json(result,'error' in result?400:200);
  }
  return json({error:'METHOD_NOT_ALLOWED'},405);
 }catch(e){
  const error=e instanceof z.ZodError?'INVALID_MESSAGE':(e as Error).message;
  const known=/^[A-Z_]+$/.test(error);
  if(['RATE_LIMITED','MESSAGE_TOO_LARGE'].includes(error)&&ips[0])ctx.waitUntil(violation(env.DB,ips[0],now));
  if(!known){console.error(JSON.stringify({event:'request_failed',path}));if(env.DB)ctx.waitUntil(metric(env.DB,'request_errors',1,now).catch(()=>{}))}
  return json({error:known?error:'SERVER_ERROR'},['RATE_LIMITED','TEMPORARILY_BANNED'].includes(error)?429:error==='ROOM_NOT_FOUND'?404:known?400:500);
 }
}
