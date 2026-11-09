const KEY='cluefc:consent';
export type Consent={analytics:boolean;advertising:boolean;expires:number};
export function consent():Consent{
 try{const c=JSON.parse(localStorage.getItem(KEY)??'null');if(c&&c.expires>Date.now())return {analytics:!!c.analytics&&navigator.doNotTrack!=='1',advertising:false,expires:c.expires}}catch{}
 return {analytics:false,advertising:false,expires:0};
}
export function saveConsent(analytics:boolean){const c={analytics:analytics&&navigator.doNotTrack!=='1',advertising:false,expires:Date.now()+180*86400000};try{localStorage.setItem(KEY,JSON.stringify(c));if(!c.analytics)localStorage.removeItem('cluefc:visitor')}catch{}return c}
export async function recordReturnVisit(){
 if(!consent().analytics)return;
 try{
  let visitor=JSON.parse(localStorage.getItem('cluefc:visitor')??'null');
  if(!visitor||visitor.expires<Date.now()){visitor={id:Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''),expires:Date.now()+90*86400000};localStorage.setItem('cluefc:visitor',JSON.stringify(visitor))}
  await fetch('/api/analytics/visit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor:visitor.id,consent:true})});
 }catch{}
}
export function AdSlot(_placement:'landing'|'lobby'|'results'){return ''}
