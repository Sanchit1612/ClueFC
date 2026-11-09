import {tickBots} from './bots.ts';
import {lifecycle,connected} from './lifecycle.ts';
export {connected} from './lifecycle.ts';
import {matchReport} from '../../packages/game-core/report.ts';
import {newGame,rematchPlayers,fail,nextTurn,finish,other,submitClue,reveal,validateName,randomInt,type Player,type Game,type Settings,type Team} from '../../packages/game-core/index.ts';
export type Room={code:string;version:number;public:boolean;host:string;players:Player[];settings:Settings;game:Game|null;recent:string[][];created:number;updated:number;lastAction:number;countdown:number|null;emptyAt:number|null;teamEmpty:Record<Team,number|null>;bans:{token:string;ipHash?:string;until:number}[];votes:Record<string,string[]>;reports:{reporter:string;target:string;name:string;clue:string|null;reason:string;at:number}[];matches:number;botNextAt?:number;reconnects?:number;reportedMatch?:number;rematchRequested?:boolean;reactions:{name:string;text:string;at:number}[]};
export function makePlayer(name:string,now:number):Player{return {id:crypto.randomUUID(),token:Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join(''),session:crypto.randomUUID(),name:validateName(name),team:null,spy:false,seen:now,joined:now,seq:0,ready:false,invalid:0}}
export function makeRoom(code:string,p:Player,isPublic:boolean,now:number):Room{return {code,version:1,public:isPublic,host:p.id,players:[p],settings:{timer:90,yellows:true,protectLast:true},game:null,recent:[],created:now,updated:now,lastAction:now,countdown:null,emptyAt:null,teamEmpty:{home:null,away:null},bans:[],votes:{},reports:[],matches:0,reactions:[]}}
export function seats(r:Room){return r.players.filter(p=>p.team&&!p.left)}
export function canStart(r:Room,now:number){return (['home','away'] as Team[]).every(t=>r.players.filter(p=>p.team===t&&connected(p,now)).length>=2&&r.players.some(p=>p.team===t&&p.spy&&connected(p,now)))}
export function autoTeam(r:Room,p:Player){if(seats(r).length>=12)return;const home=seats(r).filter(p=>p.team==='home').length;const away=seats(r).length-home;p.team=home<=away?'home':'away';p.spy=!r.players.some(q=>q.id!==p.id&&q.team===p.team&&q.spy&&!q.left)}
export function start(r:Room,now:number,existingSeats=false){if(!existingSeats&&!canStart(r,now))fail('NEED_FOUR_PLAYERS');r.game=newGame(r.settings,r.recent.flat(),now);r.game.participants=r.players.filter(p=>p.team&&!p.left).map(({id,name,team,spy})=>({id,name,team,spy}));r.recent=[...r.recent,r.game.board.map(t=>t.word)].slice(-3);r.matches++;r.players.forEach(p=>p.ready=false);r.countdown=null;r.votes={};r.rematchRequested=false;r.teamEmpty={home:null,away:null};r.botNextAt=undefined}
export function addPlayer(r:Room,p:Player,now:number){
 if(r.players.filter(p=>!p.left).length>=20)fail('ROOM_FULL');
 const original=p.name;let suffix=2;while(r.players.some(q=>q.name===p.name&&!q.left))p.name=`${original.slice(0,13)} ${suffix++}`;
 r.players=r.players.filter(q=>!q.left||r.game&&r.game.phase!=='ended');r.players.push(p);
 if(!r.game||r.game.phase==='ended')autoTeam(r,p);r.lastAction=now;
}
export function tick(r:Room,now:number){
 let changed=lifecycle(r,now);
 if(r.emptyAt)return changed;
 const g=r.game;
 if(r.public&&!g){
  for(const p of r.players.filter(p=>!p.team&&!p.left&&connected(p,now)))autoTeam(r,p);
  if(canStart(r,now)){
   if(!r.countdown){r.countdown=now+20000;changed=true}
   if(now>=r.countdown||r.players.filter(p=>p.team&&connected(p,now)).every(p=>p.ready)){start(r,now);changed=true}
  }else if(r.countdown){r.countdown=null;changed=true}
 }
 if(r.public&&g?.phase==='ended'&&now-(g.endedAt??now)>=15000&&r.players.filter(p=>p.team&&connected(p,now)).length<4){returnToLobby(r,now);return true}
 if(r.public&&g?.phase==='ended'&&r.rematchRequested){
  const both=(['home','away'] as Team[]).every(t=>r.players.some(p=>p.team===t&&p.ready&&connected(p,now)));
  if(canStart(r,now)&&both){
   if(!r.countdown){r.countdown=now+20000;changed=true}
   if(now>=r.countdown||r.players.filter(p=>p.team&&connected(p,now)).every(p=>p.ready)){rematchPlayers(r.players);start(r,now);changed=true}
  }else if(r.countdown){r.countdown=null;changed=true}
 }
 return tickBots(r,now)||changed;
}
export function returnToLobby(r:Room,now:number){
 r.game=null;r.countdown=null;r.rematchRequested=false;r.votes={};
 for(const p of r.players){p.ready=false;if(p.left||!connected(p,now)&&now-p.seen>=85000){p.team=null;p.spy=false;p.left=true}}
 if(r.public)for(const p of r.players.filter(p=>!p.left&&!p.team&&connected(p,now)))autoTeam(r,p);
}
export function apply(r:Room,p:Player,type:string,d:any,now:number){
 const g=r.game;const live=g&&g.phase!=='ended';
 if(type==='ping')return;
 if(type==='bots.fill'||type==='bots.remove'){
  if(r.public||r.host!==p.id)fail('HOST_ONLY');if(live)fail('MATCH_IN_PROGRESS');
  if(type==='bots.remove'){r.players=r.players.filter(q=>!q.bot);r.botNextAt=undefined;return}
  const needed=(['home','away'] as Team[]).reduce((n,team)=>{
   const ps=r.players.filter(q=>!q.left&&q.team===team);const count=ps.length+(!p.team&&team==='home'?1:0);
   const spy=ps.some(q=>q.spy)?0:1;return n+spy+Math.max(0,2-count-spy);
  },0);
  if(seats(r).length+(!p.team?1:0)+needed>12)fail('SEATS_FULL');
  if(r.players.filter(q=>!q.left).length+needed>20)fail('ROOM_FULL');
  if(!p.team){p.team='home';p.spy=false}
  const names=['Bot Pep','Bot Alex','Bot Carlo','Bot Sam','Bot Ada','Bot Rio'];
  const add=(team:Team,spy:boolean)=>{const bot=makePlayer(names.find(n=>!r.players.some(q=>!q.left&&q.name===n))??'Bot Coach',now);bot.bot=true;bot.botStyle=(['careful','balanced','bold'] as const)[r.players.filter(q=>q.bot&&!q.left).length%3];bot.team=team;bot.spy=spy;r.players.push(bot)};
  for(const team of ['home','away'] as Team[]){
   if(!r.players.some(q=>!q.left&&q.team===team&&q.spy))add(team,true);
   while(r.players.filter(q=>!q.left&&q.team===team).length<2)add(team,false);
  }
  return;
 }
 if(type==='room.leave'){p.left=true;p.leftAt=now;p.seen=now;return}
 if(type==='team.join'){
  if(live){const vacant=r.players.find(q=>q.left&&!q.spy&&q.team===d.team);if(p.team||!vacant)fail('MATCH_IN_PROGRESS');vacant.team=null;p.team=d.team;p.spy=false;g.participants??=[];g.participants.push({id:p.id,name:p.name,team:p.team,spy:false});return}
  if(seats(r).filter(q=>q.id!==p.id).length>=12)fail('SEATS_FULL');p.team=d.team;p.spy=false;p.ready=false;return;
 }
 if(type==='role.claim'){
  if(live)fail('MATCH_IN_PROGRESS');if(!p.team)fail('CHOOSE_TEAM');const old=r.players.find(q=>q.id!==p.id&&q.team===p.team&&q.spy&&!q.left);if(old&&!old.bot)fail('SPYMASTER_TAKEN');if(old)old.spy=false;p.spy=!p.spy;return;
 }
 if(type==='settings.update'){if(r.public||r.host!==p.id)fail('HOST_ONLY');if(live)fail('MATCH_IN_PROGRESS');r.settings=d;return}
 if(type==='match.start'){if(r.public||r.host!==p.id)fail('HOST_ONLY');if(live)fail('MATCH_IN_PROGRESS');start(r,now);return}
 if(type==='player.ready'){p.ready=!p.ready;return}
 if(type==='lobby.return'){if(live)fail('MATCH_IN_PROGRESS');if(!p.team&&r.host!==p.id)fail('SPECTATOR');returnToLobby(r,now);return}
 if(type==='match.rematch'){
  if(!g||g.phase!=='ended')fail('MATCH_NOT_FINISHED');if(!p.team)fail('SPECTATOR');
  if(r.public){p.ready=true;r.rematchRequested=true;if(!canStart(r,now))returnToLobby(r,now);return}
  const sufficient=(['home','away'] as Team[]).every(t=>r.players.filter(q=>q.team===t&&!q.left).length>=2);
  if(sufficient){rematchPlayers(r.players);start(r,now,true)}else returnToLobby(r,now);return;
 }
 if(type==='reaction'){if(r.reactions.some(q=>q.name===p.name&&now-q.at<5000))fail('RATE_LIMITED');r.reactions=[...r.reactions,{name:p.name,text:d.text,at:now}].slice(-5);return}
 if(type==='report.player'){
  const target=r.players.find(q=>q.id===d.targetId);if(!target)fail('PLAYER_NOT_FOUND');if(r.reports.filter(x=>x.reporter===p.id&&now-x.at<600000).length>=5)fail('RATE_LIMITED');
  r.reports.push({reporter:p.id,target:target.id,name:target.name,clue:g?.clue?.word??null,reason:d.reason,at:now});r.reports=r.reports.slice(-100);return;
 }
 if(type==='vote.kick'||type==='role.replace'){
  const target=r.players.find(q=>q.id===d.targetId);if(!target||(type==='vote.kick'&&target.id===p.id))fail('INVALID_TARGET');if(target.bot&&live)fail('MATCH_IN_PROGRESS');
  if(type==='role.replace'){
   if(!live||target.team!==p.team||!target.team||target.spy)fail('INVALID_TARGET');const old=r.players.find(q=>q.team===p.team&&q.spy);
   if(!old||connected(old,now)||(!old.left&&g.autoPasses[p.team!]<2))fail('REPLACEMENT_NOT_AVAILABLE');
   // Only the majority of connected teammates can replace a missing Spymaster.
   const key=`replace:${target.id}`;r.votes[key]=Array.from(new Set([...(r.votes[key]??[]),p.id]));
   if(r.votes[key].length>r.players.filter(q=>q.team===p.team&&connected(q,now)).length/2){old.spy=false;target.spy=true;delete r.votes[key]}return;
  }
  if(r.public){if(!p.team||p.team!==target.team)fail('TEAM_ONLY');const eligible=r.players.filter(q=>q.team===p.team&&q.id!==target.id&&connected(q,now));r.votes[target.id]=Array.from(new Set([...(r.votes[target.id]??[]),p.id]));if(r.votes[target.id].length<=eligible.length/2)return}
  else if(r.host!==p.id)fail('HOST_ONLY');
  target.left=true;target.leftAt=now;target.seen=now;if(!target.bot)r.bans.push({token:target.token,ipHash:target.ipHash,until:now+1800000});return;
 }
 if(!live)fail('NO_ACTIVE_MATCH');
 if(type==='clue.submit'){try{submitClue(g,p,d.word,d.number,r.settings,now);p.invalid=0}catch(e){p.invalid++;if(p.invalid>=3)p.warnings=Array.from(new Set([...(p.warnings??[]),'Repeated invalid clues. Teammates may vote to remove you.']));throw e}return}
 if(type==='tile.reveal'){const card=g.board[d.index];reveal(g,p,d.index,r.settings,now);if(card?.type==='red'&&g.turn===1)p.warnings=Array.from(new Set([...(p.warnings??[]),'First-turn Red Card. Review the player if this repeats.']));return}
 if(type==='turn.end'){if(p.team!==g.active||p.spy)fail('NOT_YOUR_TURN');if(g.phase!=='guess')fail('NO_ACTIVE_CLUE');nextTurn(g,r.settings,now);return}
 fail('UNKNOWN_ACTION');
}
export function snapshot(r:Room,p:Player,now:number){
 const g=r.game;const key=!!p.spy&&!!p.team||g?.phase==='ended';
 return {code:r.code,roomVersion:r.version,public:r.public,host:r.host,you:p.id,serverTime:now,settings:r.settings,rematchRequested:r.rematchRequested??false,countdown:r.countdown,canStart:canStart(r,now),matches:r.matches,
 players:r.players.filter(q=>!q.left||!!g&&g.phase!=='ended').map(q=>({id:q.id,name:q.name,team:q.team,spy:q.spy,bot:q.bot??false,botStyle:q.bot?q.botStyle:undefined,connected:connected(q,now),ready:q.ready,away:!q.bot&&now-q.seen>85000,left:q.left??false,invalid:q.invalid,warnings:q.warnings??[],replaceable:!!g&&!!q.spy&&!connected(q,now)&&(q.left||g.autoPasses[q.team!]>=2)})),
 votes:r.votes,reactions:r.reactions.filter(q=>now-q.at<8000),game:g?{...g,report:g.phase==='ended'?matchReport(g,r.players):null,board:g.board.map(t=>({word:t.word,revealed:t.revealed,type:t.revealed||key?t.type:null}))}:null};
}
export function roomCode(){const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789';return Array.from({length:3},()=>a[randomInt(a.length)]).join('')+'-'+(randomInt(8)+2)+(randomInt(8)+2)}
