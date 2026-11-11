import {test} from 'node:test';import assert from 'node:assert/strict';
import {consent,saveConsent,visitorId} from '../apps/web/consent.ts';
test('expanded analytics requires renewed consent, respects DNT, and clears visitor storage on rejection',()=>{
 const values=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)}});Object.defineProperty(globalThis,'navigator',{configurable:true,value:{doNotTrack:'0'}});
 values.set('cluefc:consent',JSON.stringify({analytics:true,expires:Date.now()+100000}));assert.equal(consent().analytics,false);assert.equal(visitorId(),null);
 saveConsent(true);assert.equal(consent().analytics,true);assert.match(visitorId()!,/^[a-f0-9]{32}$/);saveConsent(false);assert.equal(visitorId(),null);assert.equal(values.has('cluefc:visitor'),false);
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{doNotTrack:'1'}});saveConsent(true);assert.equal(consent().analytics,false);assert.equal(visitorId(),null);
});
