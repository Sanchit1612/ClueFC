import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const production=JSON.parse(await readFile(new URL('wrangler.production.jsonc',root),'utf8'));
if(!production.d1_databases?.[0]?.database_id)throw Error('Configure the production database first.');
const name=process.argv[2]??'cluefc';if(!/^[a-z0-9][a-z0-9-]{0,57}[a-z0-9]$/.test(name))throw Error('Invalid Pages project name');
await mkdir(new URL('.cloudflare-pages/',root),{recursive:true});await mkdir(new URL('dist/pages/',root),{recursive:true});
const config={name,pages_build_output_dir:'../dist/pages',compatibility_date:production.compatibility_date,
 d1_databases:production.d1_databases.map(db=>({...db,migrations_dir:'../drizzle'})),
 vars:{PUBLIC_MODE:'true',OWNER_CONTACT:production.vars.OWNER_CONTACT}};
await writeFile(new URL('.cloudflare-pages/wrangler.jsonc',root),JSON.stringify(config,null,2)+'\n');
await copyFile(new URL('dist/server/index.js',root),new URL('dist/pages/_worker.js',root));
await copyFile(new URL('apps/web/index.html',root),new URL('dist/pages/index.html',root));
await writeFile(new URL('dist/pages/_routes.json',root),JSON.stringify({version:1,include:['/*'],exclude:[]})+'\n');
console.log('Prepared full-stack Pages deployment with the existing production D1 database. No secrets written.');
