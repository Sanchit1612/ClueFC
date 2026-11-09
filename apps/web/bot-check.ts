export async function connectionProof(){
 const challenge=await fetch('/api/challenge').then(r=>r.json()) as {nonce:string;bits:number;error?:string};
 if(challenge.error)throw Error(challenge.error);
 const prefix=new TextEncoder();
 for(let proof=0;proof<2000000;proof++){
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',prefix.encode(challenge.nonce+':'+proof)));
  const full=Math.floor(challenge.bits/8),partial=challenge.bits%8;
  if(bytes.slice(0,full).every(b=>b===0)&&(!partial||bytes[full]<(1<<(8-partial))))return {nonce:challenge.nonce,proof};
  if(proof%1000===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 throw Error('BOT_CHECK_FAILED');
}
