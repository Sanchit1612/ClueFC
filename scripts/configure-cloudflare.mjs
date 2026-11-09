import {writeFile} from 'node:fs/promises';
const databaseId=process.argv[2];
if(!databaseId||!/^([a-f\d]{8}-)([a-f\d]{4}-){3}[a-f\d]{12}$/i.test(databaseId)||/^0+$/.test(databaseId.replaceAll('-',''))){
 console.error('Usage: node scripts/configure-cloudflare.mjs <real D1 database UUID>');process.exit(1);
}
const config={name:'clue-fc',main:'dist/server/index.js',compatibility_date:'2026-01-01',workers_dev:true,preview_urls:false,
 d1_databases:[{binding:'DB',database_name:'clue-fc-production',database_id:databaseId,migrations_dir:'drizzle'}],
 vars:{PUBLIC_MODE:'true',OWNER_CONTACT:'sanchitgoeldev@gmail.com'},triggers:{crons:['*/5 * * * *']}};
await writeFile(new URL('../wrangler.production.jsonc',import.meta.url),JSON.stringify(config,null,2)+'\n');
console.log('Configured independent Cloudflare hosting in wrangler.production.jsonc. No secrets written.');
