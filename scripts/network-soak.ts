import {createServer} from 'node:http';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {TestD1,execution} from '../tests/helpers/d1.ts';
import {api} from '../apps/server/api.ts';
const count=Number(process.argv[process.argv.indexOf('--rooms')+1])||200;
const db=new TestD1(),ctx=execution();const env={DB:db as any,IP_HASH_SECRET:'network-soak-secret',BOT_SECRET:'network-soak-bot-secret',PUBLIC_MODE:'true'};
const server=createServer(async(req,res)=>{
 try{const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks);const request=new Request('http://127.0.0.1'+req.url,{method:req.method,headers:req.headers as any,body:body.length?body:undefined});const response=await api(request,env,ctx as any);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}
 catch(error){res.writeHead(500);res.end(JSON.stringify({error:String(error)}))}
});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+(server.address() as any).port;
let requests=0,failures=0,reveals=0;
async function call(path:string,body:any=undefined,auth:any=undefined,ip='192.0.2.1'){
 const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'CF-Connecting-IP':ip,...(body?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:'Bearer '+auth.token,'X-Session':auth.session}:{})},body:body?JSON.stringify(body):undefined});requests++;const data:any=await r.json();if(r.status>=500)failures++;return {status:r.status,data};
}
async function proof(ip:string){const c=(await call('/api/challenge',undefined,undefined,ip)).data;for(let n=0;;n++){const hash=createHash('sha256').update(c.nonce+':'+n).digest();if(hash[0]===0&&hash[1]<4)return {nonce:c.nonce,proof:n}}}
async function action(code:string,p:any,type:string,payload:any={}){const r=await call('/api/rooms/'+code+'/action',{type,payload,seq:++p.seq},p,p.ip);assert.equal(r.status,200,JSON.stringify(r.data));return r.data}
const started=Date.now(),memoryBefore=process.memoryUsage().heapUsed;
try{
 const jobs=Array.from({length:count},(_,n)=>n);let cursor=0;
 await Promise.all(Array.from({length:Math.min(20,count)},async()=>{
  while(cursor<jobs.length){const n=jobs[cursor++],ip=`198.51.${Math.floor(n/250)}.${n%250+1}`;
   const created=await call('/api/rooms',{nickname:'Alpha '+n,ageConfirmed:true,challenge:await proof(ip)},undefined,ip);assert.equal(created.status,200,JSON.stringify(created.data));
   const code=created.data.code;const players=[{...created.data,ip,seq:0}];
   for(let i=1;i<4;i++){const playerIp=`172.${16+i}.${Math.floor(n/250)}.${n%250+1}`;const joined=await call('/api/rooms/'+code+'/join',{nickname:'Player '+i,ageConfirmed:true},undefined,playerIp);assert.equal(joined.status,200);players.push({...joined.data,ip:playerIp,seq:0})}
   for(const [i,p] of players.entries())await action(code,p,'team.join',{team:i%2?'away':'home'});
   await action(code,players[0],'role.claim');await action(code,players[1],'role.claim');await action(code,players[0],'settings.update',{timer:0,yellows:true,protectLast:true});
   let state=await action(code,players[0],'match.start');const active=state.game.active;const spy=active==='home'?players[0]:players[1];let guesser=active==='home'?players[2]:players[3];
   state=await action(code,spy,'clue.submit',{word:'Astronaut',number:9});const targets=state.game.board.flatMap((t:any,i:number)=>t.type===active?[i]:[]);
   for(const [turn,index] of targets.entries()){
    state=await action(code,guesser,'tile.reveal',{index});reveals++;
    if(turn===2){const old={...guesser};const fresh=(await call('/api/rooms/'+code+'/join',{nickname:'Player',token:guesser.token},undefined,guesser.ip)).data;guesser={...fresh,ip:guesser.ip,seq:fresh.seq};const takeover=await call('/api/rooms/'+code,undefined,old,old.ip);assert.equal(takeover.data.error,'OPENED_ELSEWHERE')}
    if(state.game.phase!=='ended'){const view=(await call('/api/rooms/'+code,undefined,guesser,guesser.ip)).data;assert.ok(view.game.board.every((t:any)=>t.revealed||t.type===null));assert.ok(!JSON.stringify(view).includes(spy.token))}
   }
   assert.equal(state.game.phase,'ended');assert.equal(state.game.report.topGuesser.correct,targets.length);assert.equal(state.game.report.topGuesser.accuracy,100);
   const duplicate=await call('/api/rooms/'+code+'/action',{type:'tile.reveal',seq:guesser.seq,payload:{index:0}},guesser,guesser.ip);assert.equal(duplicate.status,200);
  }
 }));
 // Twenty independent public clients must find rooms, balance and start when ready.
 const publicPlayers:any[]=[];
 for(let i=0;i<20;i++){const ip='203.0.113.'+(i+1);const r=await call('/api/quick',{nickname:'Public '+i,ageConfirmed:true,challenge:await proof(ip)},undefined,ip);assert.equal(r.status,200,JSON.stringify(r.data));publicPlayers.push({...r.data,ip,seq:0})}
 for(const p of publicPlayers)await action(p.code,p,'player.ready');
 const codes=[...new Set(publicPlayers.map(p=>p.code))];for(const code of codes){const p=publicPlayers.find(p=>p.code===code);const view=(await call('/api/rooms/'+code,undefined,p,p.ip)).data;assert.equal(view.game.phase,'clue');assert.ok(view.players.filter((p:any)=>p.team==='home').length>=2);assert.ok(view.players.filter((p:any)=>p.team==='away').length>=2)}
 await ctx.drain();
 assert.equal(failures,0);const memoryGrowth=Math.round((process.memoryUsage().heapUsed-memoryBefore)/1048576);assert.ok(memoryGrowth<512,'Unexpected memory growth '+memoryGrowth+'MB');
 console.log(JSON.stringify({pass:true,transport:'real local HTTP',database:'SQLite D1-compatible adapter',concurrentRoomWorkers:Math.min(20,count),rooms:count,players:count*4,requests,reveals,publicPlayers:20,publicRooms:codes.length,serverErrors:failures,memoryGrowthMB:memoryGrowth,elapsedMs:Date.now()-started}));
}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));db.close()}
