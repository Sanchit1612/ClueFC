import {cleanup,operationalOverview} from './operations.ts';
import {api,type Env} from './api.ts';
import html from '../web/index.html';
import css from '../web/style.css';
declare const CLIENT_JS:string;
const headers={
 'Content-Security-Policy':"default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://wa.me",
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Strict-Transport-Security':'max-age=31536000; includeSubDomains','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Cache-Control':'no-store'
};
export default {async scheduled(_event:ScheduledEvent,env:Env,ctx:ExecutionContext){ctx.waitUntil((async()=>{await cleanup(env.DB);const status=await operationalOverview(env,Date.now());for(const alert of status.alerts)console.error(JSON.stringify({event:'operational_alert',...alert}))})())},async fetch(req:Request,env:Env,ctx:ExecutionContext){
 const path=new URL(req.url).pathname;let res:Response;
 if(path.startsWith('/api/')||path==='/health')res=await api(req,env,ctx);
 else if(path==='/app.js')res=new Response(typeof CLIENT_JS==='undefined'?'console.log("Run npm run build first")':CLIENT_JS,{headers:{'Content-Type':'text/javascript; charset=utf-8'}});
 else if(path==='/style.css')res=new Response(css,{headers:{'Content-Type':'text/css; charset=utf-8'}});
 else if(path==='/favicon.svg')res=new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#183c30"/><text x="32" y="44" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="38" fill="#d6ef8d">C</text></svg>',{headers:{'Content-Type':'image/svg+xml'}});
 else if(path==='/'||/^\/r\/[^/]+$/.test(path)||['/how','/privacy','/terms','/admin'].includes(path))res=new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}});
 else res=new Response('Not found',{status:404});
 const h=new Headers(res.headers);for(const [k,v] of Object.entries(headers))h.set(k,v);return new Response(res.body,{status:res.status,headers:h});
}};
