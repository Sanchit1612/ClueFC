import {mac,isAdmin,safeEqual,counter,type SecurityEnv} from './security.ts';
const COOKIE='__Host-cluefc-admin',TTL=12*60*60*1000;
export async function hasAdminAccess(req:Request,env:SecurityEnv,now=Date.now()){
 if(isAdmin(req,env))return true;if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<24)return false;
 const value=req.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)??'';
 const match=value.match(/^(\d{13})\.([a-f0-9]{32})\.([a-f0-9]{64})$/);if(!match)return false;
 const expiry=Number(match[1]);if(expiry<=now||expiry>now+TTL)return false;
 if(!safeEqual(match[3],await mac(env.ADMIN_TOKEN,'admin:'+match[1]+'.'+match[2])))return false;
 const id=await mac(env.ADMIN_TOKEN,'owner-session:'+match[2]);return !!await env.DB.prepare('SELECT id FROM admin_sessions WHERE id=? AND expires>?').bind(id,now).first();
}
export async function adminLogin(req:Request,env:SecurityEnv,body:unknown,ip:string,now:number){
 await counter(env.DB,'admin-login:'+ip,5,15*60*1000,now);
 if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<24)return Response.json({error:'ADMIN_NOT_CONFIGURED'},{status:503});
 const password=(body as {password?:unknown})?.password;
 if(typeof password!=='string'||password.length>256||!safeEqual(password,env.ADMIN_TOKEN))return Response.json({error:'ADMIN_REQUIRED'},{status:403});
 const expiry=now+TTL,nonce=crypto.randomUUID().replaceAll('-','');const payload=expiry+'.'+nonce;
 const token=payload+'.'+await mac(env.ADMIN_TOKEN,'admin:'+payload);
 const id=await mac(env.ADMIN_TOKEN,'owner-session:'+nonce);await env.DB.prepare('INSERT INTO admin_sessions(id,expires) VALUES(?,?)').bind(id,expiry).run();
 return Response.json({ok:true},{headers:{'Set-Cookie':`${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${TTL/1000}`}});
}
export async function adminLogout(req:Request,env:SecurityEnv){const cookie=req.headers.get('Cookie')?.match(/__Host-cluefc-admin=\d{13}\.([a-f0-9]{32})\./);if(cookie&&env.ADMIN_TOKEN){const id=await mac(env.ADMIN_TOKEN,'owner-session:'+cookie[1]);await env.DB.prepare('DELETE FROM admin_sessions WHERE id=?').bind(id).run()}return Response.json({ok:true},{headers:{'Set-Cookie':`${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`}})}
