import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile,cp} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
const web=await build({entryPoints:['apps/web/client.ts'],bundle:true,write:false,minify:true,format:'iife',target:'es2022'});
await build({entryPoints:['apps/server/worker.ts'],bundle:true,outfile:'dist/server/index.js',loader:{'.html':'text','.css':'text','.png':'binary'},format:'esm',platform:'neutral',target:'es2022',minify:true,define:{CLIENT_JS:JSON.stringify(web.outputFiles[0].text)}});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');await cp('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Built client and server. Hidden board types remain in the server bundle.');
