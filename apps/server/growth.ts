import {z} from 'zod';
import {mac,type SecurityEnv} from './security.ts';
import {roomExpiresAt} from './lifecycle.ts';
import type {Room} from './rooms.ts';
import {SOURCES,MEDIUMS,CAMPAIGNS,CONTENTS,CLIENT_EVENTS} from '../../packages/protocol/analytics.ts';
const identifier=z.string().regex(/^[a-f0-9]{32}$/);
const eventSchema=z.object({session:identifier,visitor:identifier,consent:z.literal(true),name:z.enum(CLIENT_EVENTS),source:z.enum(SOURCES),medium:z.enum(MEDIUMS),campaign:z.enum(CAMPAIGNS),content:z.enum(CONTENTS),device:z.enum(['mobile','desktop'])});
export async function growthEvent(req:Request,env:SecurityEnv,body:unknown,now:number){
 if(req.headers.get('DNT')==='1')return {ok:true,recorded:false};
 const e=eventSchema.parse(body),secret=env.IP_HASH_SECRET;if(!secret)throw Error('SECURITY_NOT_CONFIGURED');
 const [id,visitor]=await Promise.all([mac(secret,'growth-session:'+e.session),mac(secret,'growth-visitor:'+e.visitor)]);
 await env.DB.prepare('INSERT INTO growth_sessions(id,visitor,started,updated,source,medium,campaign,content,device) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated').bind(id,visitor,now,now,e.source,e.medium,e.campaign,e.content,e.device).run();
 await recordStage(env.DB,id,e.name,now);return {ok:true,recorded:true};
}
export async function growthRevoke(env:SecurityEnv,body:unknown){
 const {session}=z.object({session:identifier}).parse(body);if(!env.IP_HASH_SECRET)return {ok:true};
 const id=await mac(env.IP_HASH_SECRET,'growth-session:'+session);await env.DB.prepare('UPDATE growth_sessions SET active=0 WHERE id=?').bind(id).run();return {ok:true};
}
export async function resolveGrowthSession(req:Request,env:SecurityEnv,now:number){
 const raw=req.headers.get('X-Analytics-Session');if(req.headers.get('DNT')==='1'||!raw||!identifier.safeParse(raw).success||!env.IP_HASH_SECRET)return undefined;
 const id=await mac(env.IP_HASH_SECRET,'growth-session:'+raw);
 const session=await env.DB.prepare('SELECT id FROM growth_sessions WHERE id=? AND active=1 AND updated>?').bind(id,now-2*3600000).first();
 return session?id:undefined;
}
export async function recordStage(db:D1Database,id:string|undefined,name:string,now:number){
 if(!id)return;await db.prepare('INSERT OR IGNORE INTO growth_events(session,name,created) SELECT id,?,? FROM growth_sessions WHERE id=? AND active=1').bind(name,now,id).run();
}
export async function growthEffects(db:D1Database,before:Room,after:Room,now:number){
 const added=after.players.filter(p=>!p.bot&&!before.players.some(q=>q.id===p.id));
 for(const p of added)await recordStage(db,p.analyticsSession,'room_joined',now);
 const g=after.game;if(!g)return;
 const id=await mac('growth-match-identifier',after.code+':'+g.started),room=await mac('growth-room-identifier',after.code);
 const humans=after.players.filter(p=>!p.bot&&g.participants?.some(q=>q.id===p.id)).length;
 const bots=after.players.filter(p=>p.bot&&g.participants?.some(q=>q.id===p.id)).length;
 const mode=after.public?'quick':humans<=1?'solo':'friends';
 await db.prepare('INSERT INTO growth_matches(id,room,started,ended,expires,mode,humans,bots,rematch,reason) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET ended=excluded.ended,expires=excluded.expires,reason=excluded.reason').bind(id,room,g.started,g.endedAt??null,roomExpiresAt(after),mode,humans,bots,after.matches>1?1:0,g.reason).run();
 const started=before.game?.started!==g.started,ended=g.phase==='ended'&&(before.game?.started!==g.started||before.game.phase!=='ended');
 if(started||ended)for(const p of after.players.filter(p=>!p.bot&&g.participants?.some(q=>q.id===p.id))){if(started){await recordStage(db,p.analyticsSession,'match_started',now);if(after.matches>1)await recordStage(db,p.analyticsSession,'rematch_started',now)}if(ended&&!['idle','abandoned'].includes(g.reason))await recordStage(db,p.analyticsSession,'match_finished',now)}
}
export async function growthOverview(env:SecurityEnv,from:number,to:number,now:number){
 const end=Math.min(to,now),db=env.DB;
 const [sessions,events,matches,meta,metrics]=await Promise.all([
 db.prepare('SELECT id,visitor,started,source,medium,campaign,content,device FROM growth_sessions WHERE started>=? AND started<? ORDER BY started').bind(from,end).all<any>(),
 db.prepare('SELECT e.session,e.name,e.created FROM growth_events e JOIN growth_sessions s ON s.id=e.session WHERE s.started>=? AND s.started<? AND e.created<?').bind(from,end,end).all<any>(),
 db.prepare('SELECT started,ended,expires,mode,humans,bots,rematch,reason FROM growth_matches WHERE started>=? AND started<?').bind(from,end).all<any>(),
 db.prepare("SELECT value FROM analytics_meta WHERE key='started_at'").first<{value:number}>(),
 db.prepare('SELECT day,name,value,samples FROM metrics WHERE day>=? AND day<=?').bind(new Date(from).toISOString().slice(0,10),new Date(end-1).toISOString().slice(0,10)).all<any>()
 ]);
 const es=new Map<string,Set<string>>();for(const e of events.results){if(!es.has(e.session))es.set(e.session,new Set());es.get(e.session)!.add(e.name)}
 const visitors=new Set(sessions.results.map(s=>s.visitor));
 const stages=['landing_view','room_created','room_joined','match_started','match_finished','rematch_started','invite_shared','scorecard_downloaded','practice_started'];
 const funnel=Object.fromEntries(stages.map(name=>[name,sessions.results.filter(s=>es.get(s.id)?.has(name)).length]));
 const entered=sessions.results.filter(s=>es.get(s.id)?.has('room_created')||es.get(s.id)?.has('room_joined'));const startedSessions=entered.filter(s=>es.get(s.id)?.has('match_started'));const finishedSessions=startedSessions.filter(s=>es.get(s.id)?.has('match_finished'));
 const orderedFunnel={sessions:sessions.results.length,room_entered:entered.length,match_started:startedSessions.length,match_finished:finishedSessions.length};
 const daily=new Map<string,any>();for(let t=from;t<end;t+=86400000){const day=new Date(t).toISOString().slice(0,10);daily.set(day,{day,sessions:0,visitors:new Set(),started:0,completed:0,abandoned:0})}
 const channels=new Map<string,any>();for(const s of sessions.results){const day=daily.get(new Date(s.started).toISOString().slice(0,10));if(day){day.sessions++;day.visitors.add(s.visitor)}const key=[s.source,s.medium,s.campaign,s.content].join('|');if(!channels.has(key))channels.set(key,{source:s.source,medium:s.medium,campaign:s.campaign,content:s.content,sessions:0,visitors:new Set(),started:0,finished:0});const c=channels.get(key);c.sessions++;c.visitors.add(s.visitor);if(es.get(s.id)?.has('match_started'))c.started++;if(es.get(s.id)?.has('match_finished'))c.finished++}
 let completed=0,abandoned=0,pending=0,rematches=0,humanParticipations=0;const modes:Record<string,number>={solo:0,friends:0,quick:0};
 for(const m of matches.results){modes[m.mode]=(modes[m.mode]??0)+1;rematches+=m.rematch;humanParticipations+=m.humans;const day=daily.get(new Date(m.started).toISOString().slice(0,10));if(day)day.started++;
  if(m.ended!==null&&m.ended<end){if(['idle','abandoned'].includes(m.reason)){abandoned++;if(day)day.abandoned++}else{completed++;if(day)day.completed++}}
  else if(m.ended===null&&m.expires<end){abandoned++;if(day)day.abandoned++}else pending++;
 }
 // Return-rate denominator contains only visitors old enough to complete its seven-day window.
 const retention=await db.prepare(`SELECT COUNT(*) AS eligible,COALESCE(SUM(CASE WHEN EXISTS(SELECT 1 FROM growth_sessions s WHERE s.visitor=v.visitor AND s.started>=v.first+86400000 AND s.started<v.first+604800000) THEN 1 ELSE 0 END),0) AS returned FROM (SELECT visitor,MIN(started) AS first FROM growth_sessions GROUP BY visitor HAVING first>=? AND first<?) v`).bind(from,end-7*86400000).first<{eligible:number;returned:number}>();
 return {from,to:end,measuredSince:meta?.value??now,serverTime:now,traffic:{sessions:sessions.results.length,visitors:visitors.size,funnel:orderedFunnel,interactions:funnel,channels:[...channels.values()].map(c=>({...c,visitors:c.visitors.size})).sort((a,b)=>b.finished-a.finished||b.sessions-a.sessions)},games:{started:matches.results.length,completed,abandoned,pending,rematches,humanParticipations,modes,allHumanFriendMatches:matches.results.filter(m=>m.mode==='friends'&&m.bots===0).length},daily:[...daily.values()].map(d=>({...d,visitors:d.visitors.size})),retention:{eligible:retention?.eligible??0,returned:retention?.returned??0,window:'Return on days 1–6 after first observed visit; seven-day-mature cohorts only.'},operational:metrics.results};
}
