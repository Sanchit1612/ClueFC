import {finish,nextTurn,type Team} from '../../packages/game-core/index.ts';
import type {Room} from './rooms.ts';
export const PRESENCE_TIMEOUT=25000;
export const connected=(p:Room['players'][number],now:number)=>!p.left&&now-p.seen<PRESENCE_TIMEOUT;
const lostAt=(p:Room['players'][number])=>p.left?(p.leftAt??p.seen):p.seen+PRESENCE_TIMEOUT;
export function roomExpiresAt(r:Room){
 const latest=Math.max(r.created,...r.players.map(lostAt));
 return (r.emptyAt??latest)+(r.game&&r.game.phase!=='ended'?600000:300000);
}
export function touch(r:Room,p:Room['players'][number],now:number){
 const wasAway=!connected(p,now);p.seen=now;
 if(wasAway)r.reconnects=(r.reconnects??0)+1;
}
export function lifecycle(r:Room,now:number){
 let changed=false;const online=r.players.filter(p=>connected(p,now));
 if(!online.length){if(!r.emptyAt){r.emptyAt=Math.min(now,Math.max(r.created,...r.players.map(lostAt)));changed=true}return changed}
 const g=r.game;
 if(r.emptyAt){
  const pause=Math.max(0,now-r.emptyAt);
  if(g?.endsAt)g.endsAt+=pause;if(g?.pausedAt)g.pausedAt+=pause;
  r.lastAction+=pause;r.emptyAt=null;r.teamEmpty={home:null,away:null};changed=true;
 }
 const host=r.players.find(p=>p.id===r.host);
 if(!host||host.left||now-host.seen>=30000){r.host=[...online].sort((a,b)=>a.joined-b.joined)[0].id;changed=true}
 if(!g||g.phase==='ended'){
  if(!g)for(const p of r.players)if(p.team&&!connected(p,now)&&now-lostAt(p)>=60000){p.team=null;p.spy=false;p.left=true;changed=true}
  return changed;
 }
 if(now-r.lastAction>=900000){finish(g,null,'idle',r.lastAction+900000);return true}
 for(const team of ['home','away'] as Team[]){
  if(online.some(p=>p.team===team)){if(r.teamEmpty[team]){r.teamEmpty[team]=null;changed=true}}
  else{
   if(!r.teamEmpty[team]){r.teamEmpty[team]=Math.min(now,Math.max(g.started,...r.players.filter(p=>p.team===team).map(lostAt)));changed=true}
   if(now-r.teamEmpty[team]!>=120000){finish(g,null,'abandoned',r.teamEmpty[team]!+120000);return true}
  }
 }
 const spy=r.players.find(p=>p.team===g.active&&p.spy);
 if(g.phase==='clue'){
  if(spy&&!connected(spy,now)&&!g.pausedAt&&!g.pauseUsed){g.pausedAt=Math.min(now,lostAt(spy));g.pauseUsed=true;changed=true}
  if(g.pausedAt){
   if(spy&&connected(spy,now)){if(g.endsAt)g.endsAt+=now-g.pausedAt;g.pausedAt=null;changed=true}
   else if(now-g.pausedAt>=60000||spy?.left){g.autoPasses[g.active]++;nextTurn(g,r.settings,now);changed=true}
  }
 }
 if(!g.pausedAt&&g.endsAt&&now>=g.endsAt){if(g.phase==='clue')g.autoPasses[g.active]++;nextTurn(g,r.settings,now);changed=true}
 return changed;
}
