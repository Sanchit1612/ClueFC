import {test} from 'node:test';import assert from 'node:assert/strict';
import {TestD1} from './helpers/d1.ts';
import {growthEvent,growthRevoke,resolveGrowthSession,recordStage,growthOverview} from '../apps/server/growth.ts';
import {adminLogin,hasAdminAccess,adminLogout} from '../apps/server/admin-auth.ts';
const NOW=Date.UTC(2026,10,11,12),DAY=86400000;
const env=(db:TestD1)=>({DB:db as any,IP_HASH_SECRET:'testing-growth-secret',ADMIN_TOKEN:'testing-owner-passphrase-with-32-characters'});
const req=(headers:Record<string,string>={})=>new Request('https://game.test/api/analytics/event',{headers});
function event(session='a'.repeat(32),visitor='b'.repeat(32),name='landing_view'){return {session,visitor,name,consent:true,source:'r-playmygame',medium:'community',campaign:'beta-launch',content:'launch-post',device:'mobile'}}
test('consent event dedupes sessions and stages, pseudonymises browser IDs and keeps first touch',async()=>{
 const db=new TestD1(),e=env(db);await growthEvent(req(),e,event(),NOW);await growthEvent(req(),e,event(),NOW+1);await growthEvent(req(),e,{...event(),source:'direct'},NOW+2);
 const rows=(await db.prepare('SELECT * FROM growth_sessions').all()).results;assert.equal(rows.length,1);assert.equal(rows[0].source,'r-playmygame');assert.notEqual(rows[0].id,'a'.repeat(32));assert.notEqual(rows[0].visitor,'b'.repeat(32));
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM growth_events').first() as any).n,1);db.close();
});
test('Do Not Track and missing consent cannot create optional traffic records',async()=>{
 const db=new TestD1(),e=env(db);assert.equal((await growthEvent(req({DNT:'1'}),e,{},NOW)).recorded,false);await assert.rejects(growthEvent(req(),e,{...event(),consent:false},NOW));assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM growth_sessions').first() as any).n,0);db.close();
});
test('campaign allowlists reject free-form personal values and unknown action names',async()=>{
 const db=new TestD1(),e=env(db);for(const changed of [{source:'person@example.com'},{campaign:'john-smith'},{content:'=IMPORTDATA(abc)'},{name:'tile_MESSI'},{device:'full-user-agent'}])await assert.rejects(growthEvent(req(),e,{...event(),...changed},NOW));db.close();
});
test('withdrawing consent blocks future stages and cannot be silently reactivated',async()=>{
 const db=new TestD1(),e=env(db);await growthEvent(req(),e,event(),NOW);const header=req({'X-Analytics-Session':'a'.repeat(32)}),id=await resolveGrowthSession(header,e,NOW);assert.ok(id);
 await growthRevoke(e,{session:'a'.repeat(32)});assert.equal(await resolveGrowthSession(header,e,NOW),undefined);await recordStage(e.DB,id,'match_started',NOW+1);await growthEvent(req(),e,event(),NOW+2);assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM growth_events WHERE name='match_started'").first() as any).n,0);assert.equal(await resolveGrowthSession(header,e,NOW),undefined);db.close();
});
test('cohort completion excludes pending games and reconciles daily totals',async()=>{
 const db=new TestD1(),e=env(db),from=Date.UTC(2026,10,5);
 const add=async(id:string,started:number,ended:number|null,expires:number,reason:string,humans=1,bots=3)=>db.prepare('INSERT INTO growth_matches VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,'room',started,ended,expires,humans>1?'friends':'solo',humans,bots,0,reason).run();
 await add('normal',from+100,NOW-100,NOW+DAY,'words',4,0);await add('abandoned',from+200,NOW-50,NOW,'abandoned');await add('pending',from+300,null,NOW+DAY,'');await add('expired',from+400,null,NOW-1,'');await add('outside',from-1,NOW-1,NOW,'words');
 const g=await growthOverview(e,from,NOW,NOW);assert.equal(g.games.started,4);assert.equal(g.games.completed,1);assert.equal(g.games.abandoned,2);assert.equal(g.games.pending,1);assert.equal(g.games.allHumanFriendMatches,1);assert.equal(g.games.humanParticipations,7);
 assert.equal(g.daily.reduce((n,d)=>n+d.started,0),g.games.started);assert.equal(g.daily.reduce((n,d)=>n+d.completed,0),g.games.completed);db.close();
});
test('campaign funnel uses matching opt-in session cohorts with ordered stages',async()=>{
 const db=new TestD1(),e=env(db),from=Date.UTC(2026,10,11);
 await growthEvent(req(),e,event(),from+1);const id=await resolveGrowthSession(req({'X-Analytics-Session':'a'.repeat(32)}),e,from+1);
 for(const stage of ['room_created','match_started','match_finished'])await recordStage(e.DB,id,stage,from+100);
 await growthEvent(req(),e,event('c'.repeat(32),'d'.repeat(32)),from+2);const id2=await resolveGrowthSession(req({'X-Analytics-Session':'c'.repeat(32)}),e,from+2);await recordStage(e.DB,id2,'match_finished',from+100);
 const g=await growthOverview(e,from,NOW,NOW);assert.equal(g.traffic.sessions,2);assert.equal(g.traffic.visitors,2);assert.deepEqual(g.traffic.funnel,{sessions:2,room_entered:1,match_started:1,match_finished:1});assert.equal(g.traffic.channels[0].finished,2);assert.equal(g.traffic.channels[0].sessions,2);assert.ok(!JSON.stringify(g).includes('a'.repeat(32)));db.close();
});
test('seven-day return excludes immature cohorts and future observations',async()=>{
 const db=new TestD1(),e=env(db);await growthEvent(req(),e,event('a'.repeat(32),'1'.repeat(32)),NOW-9*DAY);await growthEvent(req(),e,event('c'.repeat(32),'1'.repeat(32)),NOW-7*DAY);
 await growthEvent(req(),e,event('d'.repeat(32),'2'.repeat(32)),NOW-8*DAY);await growthEvent(req(),e,event('e'.repeat(32),'3'.repeat(32)),NOW-3*DAY);
 const g=await growthOverview(e,NOW-30*DAY,NOW,NOW);assert.equal(g.retention.eligible,2);assert.equal(g.retention.returned,1);
 const historical=await growthOverview(e,NOW-10*DAY,NOW-7*DAY,NOW);assert.equal(historical.retention.eligible,0);db.close();
});
test('owner login issues an HttpOnly session; expiry, tampering and logout revoke access',async()=>{
 const db=new TestD1(),e=env(db);const response=await adminLogin(req(),e,{password:e.ADMIN_TOKEN},'ip',NOW);assert.equal(response.status,200);const set=response.headers.get('Set-Cookie')!;assert.match(set,/HttpOnly/);assert.match(set,/Secure/);assert.match(set,/SameSite=Strict/);assert.ok(!set.includes(e.ADMIN_TOKEN));const pair=set.split(';')[0];
 assert.equal(await hasAdminAccess(req({Cookie:pair}),e,NOW),true);assert.equal(await hasAdminAccess(req({Cookie:pair}),e,NOW+13*3600000),false);assert.equal(await hasAdminAccess(req({Cookie:pair.slice(0,-1)+(pair.endsWith('a')?'b':'a')}),e,NOW),false);
 await adminLogout(req({Cookie:pair}),e);assert.equal(await hasAdminAccess(req({Cookie:pair}),e,NOW),false);db.close();
});
test('wrong owner passphrases are rejected and rate limited',async()=>{
 const db=new TestD1(),e=env(db);for(let i=0;i<5;i++)assert.equal((await adminLogin(req(),e,{password:'wrong'},'ip',NOW)).status,403);await assert.rejects(adminLogin(req(),e,{password:e.ADMIN_TOKEN},'ip',NOW),/RATE_LIMITED/);assert.equal(await hasAdminAccess(req({Cookie:'__Host-cluefc-admin=forged'}),e,NOW),false);db.close();
});
