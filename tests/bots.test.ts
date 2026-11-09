import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makePlayer,makeRoom,apply,start,tick,snapshot,addPlayer,canStart} from '../apps/server/rooms.ts';
import {roomExpiresAt,touch} from '../apps/server/lifecycle.ts';
import {chooseBotClue,chooseBotGuess} from '../apps/server/bots.ts';
import {validateClue,newGame,type Tile} from '../packages/game-core/index.ts';
import {parseMessage} from '../packages/protocol/index.ts';
function setup(){const p=makePlayer('Human',1000),r=makeRoom('ABC-23',p,false,1000);apply(r,p,'bots.fill',{},1000);return {p,r}}
test('solo fill produces exactly four seats with a human guesser and labelled bots',()=>{
 const {r,p}=setup();assert.equal(r.players.length,4);assert.equal(r.players.filter(p=>p.bot).length,3);assert.equal(p.team,'home');assert.equal(p.spy,false);assert.ok(canStart(r,1000));
 apply(r,p,'bots.fill',{},1000);assert.equal(r.players.length,4);for(const bot of r.players.filter(p=>p.bot))assert.match(bot.name,/^Bot /);
 assert.equal(parseMessage({type:'bots.fill',payload:{},seq:1}).type,'bots.fill');
});
test('bot controls are restricted to private hosts and cannot alter a running match',()=>{
 const {r,p}=setup();const q=makePlayer('Guest',1000);addPlayer(r,q,1000);for(const type of ['bots.fill','bots.remove'])assert.throws(()=>apply(r,q,type,{},1000),/HOST_ONLY/);
 r.public=true;assert.throws(()=>apply(r,p,'bots.fill',{},1000),/HOST_ONLY/);r.public=false;start(r,1000);
 assert.throws(()=>apply(r,p,'bots.remove',{},1000),/MATCH_IN_PROGRESS/);assert.throws(()=>apply(r,p,'bots.fill',{},1000),/MATCH_IN_PROGRESS/);
});
test('human may take the bot key before kick-off and bots can be removed without bans',()=>{
 const {r,p}=setup();apply(r,p,'role.claim',{},1000);assert.equal(p.spy,true);assert.equal(r.players.filter(q=>q.team==='home'&&q.spy).length,1);
 const bot=r.players.find(q=>q.bot)!;apply(r,p,'vote.kick',{targetId:bot.id},1000);assert.equal(r.bans.length,0);
 apply(r,p,'bots.remove',{},1000);assert.deepEqual(r.players,[p]);
});
test('bot clues remain legal across all word packs and avoid leaking their intended cards',()=>{
 for(const pack of ['classic','terrace','tactics'] as const)for(let n=0;n<50;n++){const g=newGame({timer:90,yellows:true,protectLast:true,pack},[],1000);for(const team of ['home','away'] as const){const c=chooseBotClue(g,team);assert.ok(c);assert.ok(validateClue(c.word,c.number,g.board));assert.ok(c.number>=1&&c.number<=3)}}
 const {r,p}=setup();start(r,1000);tick(r,1000);tick(r,11000);const s=snapshot(r,p,11000);assert.ok(s.game!.board.every(t=>t.revealed||t.type===null));assert.ok(!('botNextAt' in s));assert.ok(s.players.filter(q=>q.bot).length===3);
 for(const q of r.players){assert.ok(!JSON.stringify(s).includes(q.token));assert.ok(!JSON.stringify(s).includes(q.session))}
});
test('bot guess depends only on visible words, never the secret key',()=>{
 const board:Tile[]=[{word:'MESSI',revealed:false,type:'red'},{word:'RONALDO',revealed:false,type:'home'},{word:'GLOVES',revealed:false,type:'away'}];
 assert.equal(chooseBotGuess(board,'GOAT',()=>0.4),0);board[0].type='home';board[1].type='red';assert.equal(chooseBotGuess(board,'GOAT',()=>0.4),0);
 board[0].revealed=true;assert.equal(chooseBotGuess(board,'GOAT',()=>0.4),1);assert.equal(chooseBotGuess(board,'Unrecognisable',()=>0.5),null);
});
test('bots take paced turns but leave picks to a connected human guesser',()=>{
 const {r,p}=setup();start(r,1000);r.game!.active='home';tick(r,1000);assert.equal(r.game!.phase,'clue');tick(r,3000);assert.equal(r.game!.phase,'clue');tick(r,11000);assert.equal(r.game!.phase,'guess');
 const before=r.game!.board.filter(t=>t.revealed).length;touch(r,p,14000);tick(r,14000);assert.equal(r.game!.board.filter(t=>t.revealed).length,before);
});
test('bots freeze and expire when all humans leave; they never inherit host',()=>{
 const {r,p}=setup();start(r,1000);tick(r,40000);assert.equal(r.emptyAt,26000);assert.equal(r.host,p.id);assert.equal(roomExpiresAt(r),626000);
 const old=r.game!.endsAt;touch(r,p,45000);tick(r,45000);assert.equal(r.emptyAt,null);assert.equal(r.game!.endsAt,old!+19000);
});
test('solo Spymaster can finish full games with bots, stats and rematch',()=>{
 let ended=0;
 for(let run=0;run<15;run++){
  const {r,p}=setup();apply(r,p,'role.claim',{},1000);r.settings.timer=0;start(r,1000);
  for(let now=2000;now<500000&&r.game!.phase!=='ended';now+=5000){
   touch(r,p,now);const g=r.game!;if(g.phase==='clue'&&g.active===p.team){const c=chooseBotClue(g,p.team!);assert.ok(c);apply(r,p,'clue.submit',c,now)}
   tick(r,now);
  }
  if(r.game!.phase==='ended'){touch(r,p,500000);ended++;assert.ok(snapshot(r,p,500000).game!.report);apply(r,p,'match.rematch',{},500000);assert.equal(r.game!.phase,'clue');assert.ok(canStart(r,500000))}
 }
 assert.ok(ended>=13,'most matches must reach a result with automated turns');
});
test('fill respects the twelve-seat cap without partially assigning a spectator host',()=>{
 const p=makePlayer('Host Player',1000),r=makeRoom('ABC-23',p,false,1000);
 for(let i=0;i<12;i++){const q=makePlayer('Player '+i,1000);addPlayer(r,q,1000)}
 assert.throws(()=>apply(r,p,'bots.fill',{},1000),/SEATS_FULL/);assert.equal(p.team,null);assert.equal(r.players.filter(q=>q.bot).length,0);
});
test('human-like misreads select a plausible near-association without checking colours',()=>{
 const board:Tile[]=[{word:'MESSI',revealed:false,type:'home'},{word:'RONALDO',revealed:false,type:'home'},{word:'NEYMAR',revealed:false,type:'away'}];
 assert.equal(chooseBotGuess(board,'GOAT',()=>0.05),2);
 board[2].type='red';assert.equal(chooseBotGuess(board,'GOAT',()=>0.05),2);
 assert.ok([0,1].includes(chooseBotGuess(board,'GOAT',()=>0.7)!));
});
test('bold personalities misread more often than careful personalities; neither is perfect',()=>{
 const board=[{word:'MESSI',revealed:false},{word:'RONALDO',revealed:false},{word:'NEYMAR',revealed:false}];
 const count=(style:'careful'|'bold')=>{let misses=0;for(let n=0;n<1000;n++){let calls=0;const rng=()=>++calls===1?(n+0.5)/1000:0.4;if(chooseBotGuess(board,'GOAT',rng,style)===2)misses++}return misses};
 const careful=count('careful'),bold=count('bold');assert.equal(careful,140);assert.equal(bold,320);
});
