import {z} from 'zod';
import {fail} from '../../packages/game-core/index.ts';
import {isAdmin,mac,type SecurityEnv} from './security.ts';
import type {Room} from './rooms.ts';
const dayOf=(now:number)=>new Date(now).toISOString().slice(0,10);
export async function metric(db:D1Database,name:string,value=1,now=Date.now()){
 await db.prepare('INSERT INTO metrics(day,name,value,samples) VALUES(?,?,?,1) ON CONFLICT(day,name) DO UPDATE SET value=value+excluded.value,samples=samples+1').bind(dayOf(now),name,value).run();
}
export async function persistEffects(db:D1Database,before:Room,after:Room,now:number){
 const jobs:Promise<unknown>[]=[];
 if(after.matches>before.matches){jobs.push(metric(db,'matches_started',1,now));if(after.matches>1)jobs.push(metric(db,'rematches',1,now));if(after.matches===2)jobs.push(metric(db,'groups_playing_second_match',1,now))}
 if(after.game?.phase==='ended'&&before.game?.phase!=='ended'){
  jobs.push(metric(db,'matches_finished',1,now),metric(db,'match_duration_ms',(after.game.endedAt??now)-after.game.started,now));
  if(['idle','abandoned'].includes(after.game.reason))jobs.push(metric(db,'matches_abandoned',1,now));
 }
 if(after.game?.clue&&!before.game?.clue&&after.game.turn===1&&before.game?.phase==='clue')jobs.push(metric(db,'invite_to_first_clue_ms',now-after.created,now));
 const reconnects=(after.reconnects??0)-(before.reconnects??0);if(reconnects>0)jobs.push(metric(db,'reconnect_successes',reconnects,now));
 const previous=new Set(before.reports.map(r=>r.reporter+':'+r.at+':'+r.target));
 for(const r of after.reports)if(!previous.has(r.reporter+':'+r.at+':'+r.target)){
  const id=await mac('report-deduplication',`${after.code}:${r.reporter}:${r.target}:${r.at}`);
  jobs.push(db.prepare('INSERT OR IGNORE INTO reports(id,room,reporter,target,nickname,clue,reason,created) VALUES(?,?,?,?,?,?,?,?)').bind(id,after.code,r.reporter,r.target,r.name,r.clue,r.reason,r.at).run(),metric(db,'player_reports',1,now));
 }
 await Promise.all(jobs);
}
export async function cleanup(db:D1Database,now=Date.now()){
 await db.batch([
  db.prepare('DELETE FROM rooms WHERE expires<?').bind(now),db.prepare('DELETE FROM limits WHERE expires<?').bind(now),
  db.prepare('DELETE FROM buckets WHERE expires<?').bind(now),db.prepare('DELETE FROM security_bans WHERE expires<?').bind(now),
  db.prepare('DELETE FROM reports WHERE created<?').bind(now-30*86400000),db.prepare('DELETE FROM analytics_visits WHERE created<?').bind(now-90*86400000),
  db.prepare('DELETE FROM operations_audit WHERE created<?').bind(now-90*86400000),db.prepare('DELETE FROM metrics WHERE day<?').bind(dayOf(now-365*86400000))
 ]);
}
export async function operationalOverview(env:SecurityEnv,now:number){
 const [rooms,reports,metrics]=await Promise.all([
  env.DB.prepare('SELECT state FROM rooms WHERE expires>? LIMIT 1000').bind(now).all<{state:string}>(),
  env.DB.prepare("SELECT COUNT(*) AS count FROM reports WHERE status='open' AND created>?").bind(now-30*86400000).first<{count:number}>(),
  env.DB.prepare('SELECT day,name,value,samples FROM metrics WHERE day>=? ORDER BY day DESC,name').bind(dayOf(now-30*86400000)).all()
 ]);
 let connected=0,active=0;for(const row of rooms.results){const room=JSON.parse(row.state) as Room;connected+=room.players.filter(p=>!p.left&&now-p.seen<25000).length;if(room.game&&room.game.phase!=='ended')active++}
 const errors=metrics.results.filter((m:any)=>m.name==='request_errors'&&m.day===dayOf(now)).reduce((n,m:any)=>n+m.value,0);
 return {rooms:rooms.results.length,connectedPlayers:connected,activeMatches:active,openReports:reports?.count??0,metrics:metrics.results,alerts:[...(errors>10?[{severity:'error',message:`${errors} request errors today. Review Worker logs.`}]:[]),...(reports&&reports.count>10?[{severity:'warning',message:`${reports.count} moderation reports await review.`}]:[])],serverTime:now};
}
export async function adminApi(req:Request,env:SecurityEnv,body:unknown,now:number){
 if(!isAdmin(req,env))return Response.json({error:'ADMIN_REQUIRED'},{status:403});
 const path=new URL(req.url).pathname;
 if(path==='/api/admin/overview'&&req.method==='GET')return Response.json(await operationalOverview(env,now));
 if(path==='/api/admin/reports'&&req.method==='GET'){
  const data=await env.DB.prepare('SELECT id,room,nickname,clue,reason,created,status,note FROM reports WHERE created>? ORDER BY created DESC LIMIT 100').bind(now-30*86400000).all();return Response.json(data.results);
 }
 if(path==='/api/admin/reports'&&req.method==='POST'){
  const data=z.object({id:z.string().regex(/^[a-f0-9]{64}$/),status:z.enum(['open','reviewed','dismissed']),note:z.string().max(500)}).parse(body);
  await env.DB.batch([env.DB.prepare('UPDATE reports SET status=?,note=? WHERE id=?').bind(data.status,data.note,data.id),env.DB.prepare('INSERT INTO operations_audit(id,action,target,created) VALUES(?,?,?,?)').bind(crypto.randomUUID(),'report.'+data.status,data.id,now)]);return Response.json({ok:true});
 }
 if(path==='/api/admin/maintenance'&&req.method==='POST'){await cleanup(env.DB,now);return Response.json({ok:true})}
 return Response.json({error:'NOT_FOUND'},{status:404});
}
export async function analyticsVisit(req:Request,env:SecurityEnv,body:unknown,now:number){
 if(req.headers.get('DNT')==='1')return {ok:true,recorded:false};
 const {visitor,consent}=z.object({visitor:z.string().regex(/^[a-f0-9]{32}$/),consent:z.literal(true)}).parse(body);
 if(!consent)return {ok:true,recorded:false};
 if(!env.IP_HASH_SECRET)fail('SECURITY_NOT_CONFIGURED');
 const hash=await mac(env.IP_HASH_SECRET,'analytics:'+visitor);const week=Math.floor(now/604800000);
 const inserted=await env.DB.prepare('INSERT OR IGNORE INTO analytics_visits(visitor,week,created) VALUES(?,?,?)').bind(hash,week,now).run();
 if(inserted.meta.changes){await metric(env.DB,'weekly_return_opt_in_visitors',1,now);const previous=await env.DB.prepare('SELECT week FROM analytics_visits WHERE visitor=? AND week=?').bind(hash,week-1).first();if(previous)await metric(env.DB,'weekly_returning_opt_in_visitors',1,now)}
 return {ok:true,recorded:true};
}
