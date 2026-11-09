import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
const res=await worker.fetch(new Request('https://game.test/app.js'),{},{});
assert.equal(res.status,200);const script=await res.text();
for(const privateValue of ['IP_HASH_SECRET','ADMIN_TOKEN','BOT_SECRET','security_bans','CREATE TABLE rooms','REGISTA'])assert.ok(!script.includes(privateValue),'Server-only content in browser bundle: '+privateValue);
console.log('Browser bundle secrecy checks passed.');

const redirect=await worker.fetch(new Request('https://old.test/r/ABC-23?invite=yes'),{REDIRECT_ORIGIN:'https://new.test'},{});
assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'https://new.test/r/ABC-23?invite=yes');
const safeRedirect=await worker.fetch(new Request('https://old.test//other.test/path'),{REDIRECT_ORIGIN:'https://new.test'},{});
assert.equal(new URL(safeRedirect.headers.get('location')).origin,'https://new.test');
console.log('Canonical redirects preserve invite paths and cannot change the configured host.');
