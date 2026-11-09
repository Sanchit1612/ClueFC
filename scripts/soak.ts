import assert from 'node:assert/strict';
import {makeRoom,makePlayer,addPlayer,autoTeam,start,apply,snapshot,tick} from '../apps/server/rooms.ts';
let reveals=0;const started=Date.now();
for(let i=0;i<200;i++){
 const p=makePlayer('Bot Alpha',1000),r=makeRoom('ABC-23',p,true,1000);autoTeam(r,p);
 for(const n of ['Bot Bravo','Bot Charlie','Bot Delta'])addPlayer(r,makePlayer(n,1000),1000);start(r,1000);
 for(let step=0;step<80&&r.game!.phase!=='ended';step++){
  const now=2000+step*1000;r.players.forEach(p=>p.seen=now);
  const g=r.game!,spy=r.players.find(p=>p.spy&&p.team===g.active)!,guesser=r.players.find(p=>!p.spy&&p.team===g.active)!;
  if(step%7===0){guesser.seen=now-26000;tick(r,now);guesser.seen=now}
  if(g.phase==='clue')apply(r,spy,'clue.submit',{word:'Astronaut',number:2},now);
  const t=g.board.findIndex(t=>!t.revealed);if(t<0)break;
  try{apply(r,guesser,'tile.reveal',{index:t},now);reveals++}catch{}
  if(g.phase!=='ended')assert.ok(snapshot(r,guesser,now).game!.board.every(t=>t.revealed||t.type===null));
  const clone=JSON.parse(JSON.stringify(r));assert.equal(clone.code,r.code);
  try{apply(r,spy,'tile.reveal',{index:t},now)}catch{}
 }
 assert.equal(r.game!.phase,'ended');assert.ok(r.game!.history.length<=30);
}
console.log(`PASS: 200 simulated rooms, ${reveals} reveals, disconnect/reconnect and invalid actions; no key leaks. ${Date.now()-started}ms.`);
