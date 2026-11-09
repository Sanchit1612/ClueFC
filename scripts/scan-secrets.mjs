import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
const staged=process.argv.includes('--staged');
const names=execFileSync('git',staged?['diff','--cached','--name-only','--diff-filter=ACMR','-z']:['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const checks=[['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['GitHub token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],['OpenAI key',/\bsk-(?:proj-)?[A-Za-z0-9_-]{35,}\b/],['AWS access key',/\bAKIA[A-Z0-9]{16}\b/],['Sites credential',/\bart_v2_[A-Za-z0-9_]{20,}\b/],['assigned credential',/(?:TURNSTILE_SECRET|ADMIN_TOKEN|IP_HASH_SECRET|BOT_SECRET)\s*=\s*["']?[A-Za-z0-9_-]{32,}/]];
let count=0;
for(const name of names){if(!existsSync(name)||/\.(png|jpe?g|gif|pdf|webp|ico|woff2?)$/i.test(name))continue;const body=staged?execFileSync('git',['show',':'+name],{encoding:'utf8'}):readFileSync(name,'utf8');for(const [label,pattern] of checks)if(pattern.test(body)){console.error(`Potential ${label} in ${name}. Remove it before committing.`);count++}}
if(count)process.exit(1);console.log(`Secret scan passed (${names.length} tracked files).`);
