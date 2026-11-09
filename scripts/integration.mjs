import assert from 'node:assert/strict';
const base=process.env.TEST_URL??'http://localhost:8787';
async function call(path,body,auth){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:'Bearer '+auth.token,'X-Session':auth.session}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();return {status:r.status,data}}
let a=(await call('/api/rooms',{nickname:'Test Alpha'})).data;assert.ok(a.code);const code=a.code;const players=[a];
for(const name of ['Test Bravo','Test Charlie','Test Delta'])players.push((await call('/api/rooms/'+code+'/join',{nickname:name})).data);
players.forEach(p=>p.seq=0);
const act=async(p,type,payload={})=>{const r=await call('/api/rooms/'+code+'/action',{seq:++p.seq,type,payload},p);assert.equal(r.status,200,JSON.stringify(r.data));return r.data};
for(const [i,p] of players.entries())await act(p,'team.join',{team:i%2===0?'home':'away'});
await act(a,'role.claim');await act(players[1],'role.claim');
await act(a,'settings.update',{timer:0,yellows:true,protectLast:true});let state=await act(a,'match.start');
assert.ok(state.game.board.every(t=>t.type));
let guess=(await call('/api/rooms/'+code,undefined,players[2])).data;assert.ok(guess.game.board.every(t=>t.type===null));
const late=(await call('/api/rooms/'+code+'/join',{nickname:'Test Spectator'})).data;let spec=(await call('/api/rooms/'+code,undefined,late)).data;assert.equal(spec.players.find(p=>p.id===spec.you).team,null);assert.ok(spec.game.board.every(t=>t.type===null));
const before=(await call('/api/rooms/'+code+'/action',{seq:++players[2].seq,type:'tile.reveal',payload:{index:0}},players[2]));assert.equal(before.data.error,'NO_ACTIVE_CLUE');
const active=state.game.active;const spy=active==='home'?a:players[1];const guesser=active==='home'?players[2]:players[3];state=await act(spy,'clue.submit',{word:'Astronaut',number:9});const key=state.game.board;const indices=key.flatMap((t,i)=>t.type===active?[i]:[]);
for(const [n,index] of indices.entries()){
 state=await act(guesser,'tile.reveal',{index});
 if(n===0){const duplicate=await call('/api/rooms/'+code+'/action',{seq:guesser.seq,type:'tile.reveal',payload:{index:indices[1]}},guesser);assert.equal(duplicate.status,200);assert.equal(duplicate.data.game.board[indices[1]].revealed,false)}
 if(state.game.phase!=='ended')for(const player of [guesser,late]){const view=(await call('/api/rooms/'+code,undefined,player)).data;assert.ok(view.game.board.every(t=>t.revealed||t.type===null));assert.ok(!JSON.stringify(view).includes(a.token))}
}
assert.equal(state.game.winner,active);assert.equal(state.game.phase,'ended');
state=await act(guesser,'match.rematch');assert.equal(state.game.phase,'clue');assert.ok(state.game.board.every(t=>!t.revealed));
const reconnected=(await call('/api/rooms/'+code+'/join',{nickname:'Test Alpha',token:a.token})).data;assert.equal(reconnected.id,a.id);const old=await call('/api/rooms/'+code,undefined,a);assert.equal(old.data.error,'OPENED_ELSEWHERE');const fresh=await call('/api/rooms/'+code,undefined,reconnected);assert.equal(fresh.status,200);
const invalid=await call('/api/rooms/'+code+'/action',{seq:100,type:'tile.reveal',payload:{index:30}},reconnected);assert.equal(invalid.data.error,'INVALID_MESSAGE');
const cross=await fetch(base+'/api/rooms',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({nickname:'Hacker'})});assert.equal(cross.status,403);
console.log('PASS: real HTTP / D1 full match, secrecy, late spectator, idempotency, rematch, reconnect takeover, schema and origin checks. Room '+code);
