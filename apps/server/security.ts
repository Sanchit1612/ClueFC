import {fail} from '../../packages/game-core/index.ts';
export type SecurityEnv={DB:D1Database;IP_HASH_SECRET?:string;BOT_SECRET?:string;TURNSTILE_SECRET?:string;TURNSTILE_SITE_KEY?:string;PUBLIC_MODE?:string;REDIRECT_ORIGIN?:string;ADMIN_EMAIL?:string;ADMIN_TOKEN?:string;OWNER_CONTACT?:string};
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export async function mac(secret:string,value:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))}
export async function ipHashes(req:Request,env:SecurityEnv,now:number){
 if(env.PUBLIC_MODE==='true'&&!env.IP_HASH_SECRET)fail('SECURITY_NOT_CONFIGURED');
 const raw=req.headers.get('CF-Connecting-IP')??'local';const day=Math.floor(now/86400000);
 return Promise.all([day,day-1].map(d=>mac(env.IP_HASH_SECRET??'local-development-only',`${d}:${raw}`)));
}
export async function counter(db:D1Database,key:string,max:number,window:number,now:number){
 const k=key+':'+Math.floor(now/window);
 const result=await db.prepare('INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(k,now+window).first<{count:number}>();
 if(result!.count>max)fail('RATE_LIMITED');
}
export async function banCheck(db:D1Database,ips:string[],now:number){
 for(const ip of ips){const row=await db.prepare('SELECT until_at FROM security_bans WHERE key=? AND expires>?').bind(ip,now).first<{until_at:number}>();if(row&&row.until_at>now)fail('TEMPORARILY_BANNED')}
}
export async function violation(db:D1Database,ip:string,now:number){
 const row=await db.prepare('INSERT INTO security_bans(key,strikes,until_at,expires) VALUES(?,1,0,?) ON CONFLICT(key) DO UPDATE SET strikes=strikes+1, expires=excluded.expires RETURNING strikes').bind(ip,now+86400000).first<{strikes:number}>();
 if(row!.strikes>=3){const duration=Math.min(7200000,900000*2**Math.min(3,row!.strikes-3));await db.prepare('UPDATE security_bans SET until_at=? WHERE key=?').bind(now+duration,ip).run()}
}
export async function bucket(db:D1Database,key:string,now:number,capacity=40,refillPerSecond=4){
 const row=await db.prepare('INSERT INTO buckets(key,tokens,updated,expires) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET tokens=MIN(?,buckets.tokens+(excluded.updated-buckets.updated)*?)-1, updated=excluded.updated, expires=excluded.expires WHERE MIN(?,buckets.tokens+(excluded.updated-buckets.updated)*?)>=1 RETURNING tokens').bind(key,capacity-1,now,now+86400000,capacity,refillPerSecond/1000,capacity,refillPerSecond/1000).first();
 if(!row)fail('RATE_LIMITED');
}
export function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
function leadingZeroBits(hexValue:string,bits:number){const n=Math.floor(bits/4);return hexValue.startsWith('0'.repeat(n))&&(! (bits%4)||parseInt(hexValue[n],16)<2**(4-bits%4))}
export async function makeChallenge(env:SecurityEnv,ip:string,now:number){
 if(!env.BOT_SECRET)fail('SECURITY_NOT_CONFIGURED');
 const value=btoa(JSON.stringify({ip,at:now,random:crypto.randomUUID()}));return {nonce:value+'.'+await mac(env.BOT_SECRET,value),bits:14,expiresAt:now+120000};
}
export async function verifyGate(req:Request,env:SecurityEnv,ip:string,challenge:unknown,now:number){
 if(env.TURNSTILE_SECRET){
  if(typeof challenge!=='string'||!challenge)fail('BOT_CHECK_REQUIRED');
  const form=new FormData();form.set('secret',env.TURNSTILE_SECRET);form.set('response',challenge);
  const res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form}).then(r=>r.json()) as {success:boolean;hostname?:string};
  if(!res.success||res.hostname!==new URL(req.url).hostname)fail('BOT_CHECK_FAILED');return;
 }
 if(env.PUBLIC_MODE!=='true')return;
 if(!env.BOT_SECRET||!challenge||typeof challenge!=='object')fail('BOT_CHECK_REQUIRED');
 const {nonce,proof}=challenge as {nonce:string;proof:number};
 if(typeof nonce!=='string'||nonce.length>1024||!Number.isSafeInteger(proof)||proof<0)fail('BOT_CHECK_FAILED');
 const [payload,signature]=nonce.split('.');if(!signature||!safeEqual(signature,await mac(env.BOT_SECRET,payload)))fail('BOT_CHECK_FAILED');
 let data:{ip:string;at:number};try{data=JSON.parse(atob(payload))}catch{fail('BOT_CHECK_FAILED')}
 if(data.ip!==ip||now-data.at>120000||data.at>now)fail('BOT_CHECK_FAILED');
 const digest=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(nonce+':'+proof)));
 if(!leadingZeroBits(digest,14))fail('BOT_CHECK_FAILED');
 const used=await env.DB.prepare('INSERT OR IGNORE INTO limits(key,count,expires) VALUES(?,1,?)').bind('challenge:'+signature,data.at+120000).run();if(!used.meta.changes)fail('BOT_CHECK_FAILED');
}
export function isAdmin(req:Request,env:SecurityEnv){
 const identity=req.headers.get('oai-authenticated-user-email')?.toLowerCase();
 return !!env.ADMIN_EMAIL&&identity===env.ADMIN_EMAIL.toLowerCase()||!!env.ADMIN_TOKEN&&safeEqual(req.headers.get('X-Admin-Token')??'',env.ADMIN_TOKEN);
}
