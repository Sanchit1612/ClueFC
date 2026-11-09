import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
const res=await worker.fetch(new Request('https://game.test/app.js'),{},{});
assert.equal(res.status,200);const script=await res.text();
for(const privateValue of ['IP_HASH_SECRET','ADMIN_TOKEN','BOT_SECRET','security_bans','CREATE TABLE rooms','REGISTA'])assert.ok(!script.includes(privateValue),'Server-only content in browser bundle: '+privateValue);
console.log('Browser bundle secrecy checks passed.');
