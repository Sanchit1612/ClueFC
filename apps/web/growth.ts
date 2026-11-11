import {consent,visitorId} from './consent.ts';
import {SOURCES,MEDIUMS,CAMPAIGNS,CONTENTS,type GrowthContext,type CLIENT_EVENTS} from '../../packages/protocol/analytics.ts';
const query=new URLSearchParams(location.search);
const pick=<T extends readonly string[]>(values:T,value:string|null,fallback:T[number]):T[number]=>value&&values.includes(value)?value:fallback;
function source(){if(query.get('utm_source'))return pick(SOURCES,query.get('utm_source'),'other');try{const host=new URL(document.referrer).hostname;if((host==='reddit.com'||host.endsWith('.reddit.com')))return 'reddit';if(['google.com','www.google.com'].includes(host))return 'google';if((host==='bing.com'||host.endsWith('.bing.com')))return 'bing';if(host&&host!==location.hostname)return 'referral'}catch{}return 'direct'}
const firstSource=source(),attribution={source:firstSource,medium:pick(MEDIUMS,query.get('utm_medium'),firstSource==='direct'?'direct':['google','bing'].includes(firstSource)?'organic-search':firstSource==='reddit'?'community':'referral'),campaign:pick(CAMPAIGNS,query.get('utm_campaign'),'unspecified'),content:pick(CONTENTS,query.get('utm_content'),'unspecified')};
let current:({id:string;expires:number})|null=null,registered:Promise<boolean>|null=null;
function context():GrowthContext|null{
 const visitor=visitorId();if(!consent().analytics||!visitor)return null;
 try{current??=JSON.parse(sessionStorage.getItem('cluefc:analytics-session')??'null');if(!current||current.expires<Date.now()){current={id:Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''),expires:Date.now()+1800000};registered=null}
 if(current.expires-Date.now()<1740000){current.expires=Date.now()+1800000;sessionStorage.setItem('cluefc:analytics-session',JSON.stringify(current))}else if(!sessionStorage.getItem('cluefc:analytics-session'))sessionStorage.setItem('cluefc:analytics-session',JSON.stringify(current));
 return {session:current.id,visitor,...attribution,device:matchMedia('(max-width:767px)').matches?'mobile':'desktop'};
 }catch{return null}
}
export async function recordGrowth(name:typeof CLIENT_EVENTS[number]){const c=context();if(!c)return false;try{const r=await fetch('/api/analytics/event',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(1500),body:JSON.stringify({...c,consent:true,name})});return r.ok}catch{return false}}
export async function growthHeaders(){const c=context();if(!c)return {};registered??=recordGrowth('session_started');const ok=await registered;if(!ok)registered=null;return ok?{'X-Analytics-Session':c.session}:{}}
export async function revokeGrowth(){
 let id=current?.id;try{id??=JSON.parse(sessionStorage.getItem('cluefc:analytics-session')??'null')?.id;sessionStorage.removeItem('cluefc:analytics-session')}catch{}
 current=null;registered=null;if(id)try{await fetch('/api/analytics/revoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:id})})}catch{}
}
