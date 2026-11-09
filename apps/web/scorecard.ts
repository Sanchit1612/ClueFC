export async function downloadScorecard(state:any,layout:'story'|'post'='story'){
 const g=state.game,r=g.report;if(!r)throw Error('REPORT_UNAVAILABLE');
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=layout==='story'?1920:1350;
 const ctx=canvas.getContext('2d')!;const scale=canvas.height/1920;
 const text=(value:string,x:number,y:number,size:number,color='#f0e8cf',weight='400')=>{ctx.fillStyle=color;ctx.font=`${weight} ${Math.max(12,size*scale)}px Arial, sans-serif`;ctx.fillText(value,x,y*scale)};
 const line=(y:number)=>{ctx.strokeStyle='#43513a';ctx.beginPath();ctx.moveTo(80,y*scale);ctx.lineTo(1000,y*scale);ctx.stroke()};
 const box=(x:number,y:number,w:number,h:number,fill:string)=>{ctx.fillStyle=fill;ctx.fillRect(x,y*scale,w,h*scale)};
 box(0,0,1080,1920,'#14251a');box(40,40,1000,1840,'#192d20');ctx.strokeStyle='#63794b';ctx.strokeRect(40,40*scale,1000,1840*scale);
 for(let x=80;x<=1000;x+=115){ctx.fillStyle='#ffffff02';ctx.fillRect(x,80*scale,57,1760*scale)}
 text('CLUE FC',80,130,38,'#ead8a3','800');text('OFFICIAL MATCH REPORT',80,179,14,'#aabd96','700');text('FULL TIME',820,130,22,'#aabd96','700');line(215);
 text(g.winner?`${g.winner.toUpperCase()} WINS`:'MATCH DRAWN',80,303,62,'#f0e8cf','800');
 const scored=(team:string)=>g.board.filter((t:any)=>t.revealed&&t.type===team).length;
 text(String(scored('home')),175,458,116,'#91b7dd','800');text(':',511,450,82,'#a1af90');text(String(scored('away')),805,458,116,'#e4b375','800');
 text('HOME WORDS',156,505,20,'#a8bed0','700');text('AWAY WORDS',775,505,20,'#d7bc98','700');
 text(`ROOM ${state.code}   /   ${r.durationMs<60000?'<1':Math.round(r.durationMs/60000)} MIN   /   ${r.turns} ${r.turns===1?'TURN':'TURNS'}`,80,570,18,'#aabd96');
 box(80,615,920,190,'#32452a');box(80,615,8,190,'#d5bd76');text('MATCH MVP',115,658,17,'#dfc785','700');
 text(r.mvp?.name??'No award this match',115,724,48,'#f3e9cf','800');
 text(r.mvp?`${r.mvp.score} rating points · ${r.mvp.correct} correct guesses · ${r.mvp.assists} clue assists`:'Awards are based on completed, server-recorded actions.',115,770,20,'#c3d0b4');
 const awards=[['TOP GUESSER',r.topGuesser?.name??'—',r.topGuesser?`${r.topGuesser.correct} correct · ${r.topGuesser.accuracy}% accuracy`:'No correct guesses'],['MOST GUESSES',r.mostGuesses?.name??'—',r.mostGuesses?`${r.mostGuesses.guesses} words attempted`:'No guesses'],['BEST SPYMASTER',r.bestSpy?.name??'—',r.bestSpy?`${r.bestSpy.assists} words found · best clue ${r.bestSpy.bestClue}`:'No clues']];
 awards.forEach(([title,name,detail],i)=>{const x=80+i*312;text(title,x,869,13,'#a6bb92','700');text(name,x,913,25,'#e9e9d8','700');text(detail,x,946,14,'#aebda0')});
 line(985);text('THE TEAM SHEET',80,1038,22,'#dfd8bf','700');
 const columns=[['PLAYER',80],['GUESSES',485],['CORRECT',635],['ACCURACY',790],['RATING',930]] as const;
 columns.forEach(([t,x])=>text(t,x,1080,12,'#9eaf8d','700'));
 r.rows.slice(0,12).forEach((p:any,i:number)=>{const y=1128+i*43;box(80,y-24,5,24,p.team==='home'?'#75a1c9':'#d5a369');text(p.name,96,y,19,'#e9e9d8',p.id===r.mvp?.id?'700':'400');text(String(p.guesses),514,y,18);text(String(p.correct),667,y,18);text(p.accuracy===null?'—':p.accuracy+'%',820,y,18);text(String(p.score),954,y,18,'#d9c185','700')});
 const bottom=Math.max(1500,1140+r.rows.length*43);line(bottom);
 text('FASTEST CORRECT GUESS',80,bottom+45,13,'#a4b68d','700');text(r.fastest?`${r.fastest.name} · ${(r.fastest.fastestMs/1000).toFixed(1)}s`:'—',80,bottom+82,24);
 text('CARDS SHOWN',665,bottom+45,13,'#a4b68d','700');text(String(r.cards),665,bottom+82,24);text('HOWLER',80,bottom+130,13,'#a4b68d','700');text(r.howler??'No red-card howler',80,bottom+165,23);
 text('Rating: +3 correct · +2 clue assist · −2 wrong/bench/yellow · −5 red',80,1785,13,'#a8b398');text('clue-fc-matchday.moistcrown2.chatgpt.site',80,1830,16,'#c5d4b5');
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('IMAGE_FAILED')),'image/jpeg',.94));
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`clue-fc-${state.code.toLowerCase()}-${layout}.jpg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
