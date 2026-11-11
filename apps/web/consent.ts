const KEY='cluefc:consent';
export type Consent={analytics:boolean;advertising:boolean;expires:number;version?:number};
export function consent():Consent{
 try{const c=JSON.parse(localStorage.getItem(KEY)??'null');if(c&&c.version===2&&c.expires>Date.now())return {analytics:!!c.analytics&&navigator.doNotTrack!=='1',advertising:false,expires:c.expires}}catch{}
 return {analytics:false,advertising:false,expires:0};
}
export function saveConsent(analytics:boolean){const c={version:2,analytics:analytics&&navigator.doNotTrack!=='1',advertising:false,expires:Date.now()+180*86400000};try{localStorage.setItem(KEY,JSON.stringify(c));if(!c.analytics)localStorage.removeItem('cluefc:visitor')}catch{}return c}
export function visitorId(){
 if(!consent().analytics)return null;
 try{let visitor=JSON.parse(localStorage.getItem('cluefc:visitor')??'null');if(!visitor||visitor.expires<Date.now()){visitor={id:Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''),expires:Date.now()+90*86400000};localStorage.setItem('cluefc:visitor',JSON.stringify(visitor))}return visitor.id as string}catch{return null}
}
export async function recordReturnVisit(){
 const visitor=visitorId();if(!visitor)return;
 try{await fetch('/api/analytics/visit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor,consent:true})})}catch{}
}
export function AdSlot(_placement:'landing'|'lobby'|'results'){return ''}
