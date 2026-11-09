import {playerStats,type MatchStats} from './report.ts';
import words from '../../data/words.en.json' with {type:'json'};
import blocklist from '../../data/blocklist.json' with {type:'json'};
export {APP_NAME} from '../protocol/constants.ts';
export type Team='home'|'away';
export type Kind=Team|'bench'|'yellow'|'red';
export type Player={id:string;token:string;name:string;team:Team|null;spy:boolean;seen:number;joined:number;seq:number;session:string;ready:boolean;left?:boolean;leftAt?:number;ipHash?:string;warnings?:string[];lastError?:{seq:number;code:string};invalid:number;bot?:boolean;botStyle?:'careful'|'balanced'|'bold'};
export type Tile={word:string;type:Kind;revealed:boolean};
export type Settings={timer:number;yellows:boolean;protectLast:boolean;pack?:'classic'|'terrace'|'tactics'};
export type Game={participants?:{id:string;name:string;team:Team|null;spy:boolean}[];board:Tile[];starting:Team;active:Team;phase:'clue'|'guess'|'ended';clue:{word:string;number:number|'unlimited'}|null;guesses:number;endsAt:number|null;winner:Team|null;reason:string;turn:number;started:number;history:{text:string;at:number}[];stats:MatchStats;lastClueAt:number;clueBy:string|null;clueHits:number;lastGuessAt:number;endedAt:number|null;pausedAt:number|null;pauseUsed:boolean;autoPasses:Record<Team,number>};
export const other=(t:Team):Team=>t==='home'?'away':'home';
export const label=(t:Team)=>t==='home'?'Home':'Away';
export function fail(code:string):never {throw new Error(code)}
export function randomInt(n:number){if(n<1)fail('EMPTY_RANDOM');const max=2**32-(2**32%n);let x:number;do{x=crypto.getRandomValues(new Uint32Array(1))[0]}while(x>=max);return x%n}
export function shuffle<T>(arr:T[]):T[]{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
export const normalize=(s:string)=>s.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
export function blocked(s:string){const n=normalize(s).replace(/[013457@$]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s'}[c]!)).replace(/[^\p{L}]/gu,'');return blocklist.some(w=>n.includes(normalize(w).replace(/[^\p{L}]/gu,'')))}
export function validateName(s:string){if(!/^[\p{L}\p{N} ]{2,16}$/u.test(s)||blocked(s)||/^(host|admin|referee|system)$/i.test(s.trim()))fail('INVALID_NICKNAME');return s.trim()}
function stem(s:string){return s.replace(/ies$/,'y').replace(/(es|s)$/,'')}
export function validateClue(word:string,number:unknown,board:Tile[]){
 const w=word.trim();if(!/^\p{L}{2,20}$/u.test(w))fail('CLUE_LETTERS_ONLY');
 if(number!=='unlimited'&&(!Number.isInteger(number)||Number(number)<0||Number(number)>9))fail('INVALID_NUMBER');
 if(blocked(w))fail('CLUE_BLOCKED');const n=normalize(w);
 if(board.some(t=>{const b=normalize(t.word).replace(/[^\p{L}]/gu,'');return b.includes(n)||n.includes(b)||stem(b)===stem(n)}))fail('CLUE_MATCHES_BOARD');return w.toUpperCase();
}
const lines:Record<string,string[]>={
 own:['A lovely finish. Keep the move going.','Right on the money. That is your word.','Beautiful link-up play.','Clinical. Straight into the back of the net.','The crowd enjoyed that one.','Another one for the highlight reel.'],
 opponent:['An own goal. That word belongs to the opposition.','A gift for the other side. Turn over.','A costly mix-up in midfield.','The opposition will take that.','Wrong shirt. The other team gets the point.'],
 bench:['Straight to the bench. The turn is over.','Nothing doing. A quiet end to that move.','Offside. Time for the other team.','Out of play. A chance to regroup.','The move breaks down.'],
 yellow:['Yellow card! A free word for the opposition.','A booking, and a costly one.','The referee reaches for a yellow.','A rash challenge. Penalty to the other side.','Into the book you go.'],
 red:['Red card. Off you go. That is full time.','A straight red. The match is over.','Sent off! A dramatic finish.','The referee has seen enough.'],
 penalty:['Penalty converted. A free word revealed.','The opposition makes the penalty count.','A gift from the spot.'],
 protected:['Last word protected. No penalty word awarded.','Only one left: the penalty becomes a bench.'],
 turn:['Possession changes hands. A new clue awaits.','Time to regroup. Over to the opposition.','A fresh attack begins.'],
 win:['Full time. What a performance.','The final whistle! A win to remember.','All the right connections. Well played.']};
export function say(g:Game,event:string,now=Date.now()){const choices=lines[event].filter(s=>!g.history.slice(-4).some(h=>h.text===s));g.history.push({text:choices[randomInt(choices.length)],at:now});g.history=g.history.slice(-30)}
export const left=(g:Game,t:Team)=>g.board.filter(x=>x.type===t&&!x.revealed).length;
export function selectBoardWords(recent:string[]=[],pack:string='classic'){
 const packWords=pack==='terrace'?words.filter(w=>w.kind!=='manager'&&!w.tags.includes('training')):pack==='tactics'?words.filter(w=>w.kind==='term'||w.kind==='manager'||w.tags.some(t=>['creation','defence','midfield','goalkeeping'].includes(t))):words;
 let pool=packWords.filter(word=>!recent.includes(word.word));
 if(pool.length<25)pool=packWords;
 const budget:Record<string,number>={easy:6,medium:16,hard:3};
 const selected:typeof words=[];
 const used=new Set<string>();
 const take=(candidates:typeof words)=>{
  const word=shuffle(candidates.filter(w=>!used.has(w.word)&&budget[w.difficulty]>0))[0];
  if(word){selected.push(word);used.add(word.word);budget[word.difficulty]--}
  return word;
 };
 // Seed overlapping connections across word kinds; team colours are assigned independently.
 const themes=shuffle([...new Set(pool.flatMap(w=>w.tags))].filter(tag=>pool.filter(w=>w.tags.includes(tag)).length>=8));
 for(const tag of themes.slice(0,4)){
  const candidates=pool.filter(w=>w.tags.includes(tag));
  const first=take(candidates);
  if(first)take(candidates.filter(w=>w.kind!==first.kind))??take(candidates);
 }
 for(const difficulty of ['easy','medium','hard']){
  while(budget[difficulty]>0){if(!take(pool.filter(w=>w.difficulty===difficulty)))break}
 }
 for(const word of shuffle(pool.filter(w=>!used.has(w.word)))){
  if(selected.length===25)break;
  selected.push(word);
 }
 return shuffle(selected);
}
export function newGame(settings:Settings,recent:string[]=[],now=Date.now()):Game{
 const active:Team=randomInt(2)?'home':'away';const selected=selectBoardWords(recent,settings.pack??'classic');
 const types:Kind[]=[...Array(9).fill(active),...Array(8).fill(other(active)),...Array(settings.yellows?4:7).fill('bench'),...Array(settings.yellows?3:0).fill('yellow'),'red'];const kinds=shuffle(types);
 return {board:selected.map((w,i)=>({word:w.word,type:kinds[i],revealed:false})),starting:active,active,phase:'clue',clue:null,guesses:0,endsAt:settings.timer?now+settings.timer*1000:null,winner:null,reason:'',turn:1,started:now,history:[{text:`Kick-off! ${label(active)} starts with nine words.`,at:now}],stats:{cards:0,fastest:null,howler:null,correct:{},spymasters:{},players:{}},lastClueAt:0,clueBy:null,clueHits:0,lastGuessAt:0,endedAt:null,pausedAt:null,pauseUsed:false,autoPasses:{home:0,away:0}};
}
export function finish(g:Game,winner:Team|null,reason:string,now:number){g.phase='ended';g.endedAt=now;g.winner=winner;g.reason=reason;g.endsAt=null;say(g,'win',now)}
export function nextTurn(g:Game,s:Settings,now:number){g.active=other(g.active);g.phase='clue';g.clue=null;g.guesses=0;g.turn++;g.pausedAt=null;g.pauseUsed=false;g.endsAt=s.timer?now+s.timer*1000:null;say(g,'turn',now)}
export function submitClue(g:Game,p:Player,word:string,number:number|'unlimited',s:Settings,now:number){
 if(g.phase!=='clue')fail('CLUE_ALREADY_ACTIVE');if(!p.spy||p.team!==g.active)fail('NOT_SPYMASTER');
 const clean=validateClue(word,number,g.board);g.clue={word:clean,number};g.guesses=number==='unlimited'?99:number+1;g.phase='guess';g.endsAt=s.timer?now+s.timer*1000:null;g.lastClueAt=now;g.clueBy=p.id;g.clueHits=0;g.lastGuessAt=now;playerStats(g.stats,p.id).clues++;g.autoPasses[g.active]=0;g.pausedAt=null;
 g.history.push({text:`${label(g.active)} clue: ${clean} · ${number==='unlimited'?'∞':number}`,at:now});
}
export function reveal(g:Game,p:Player,index:number,s:Settings,now:number){
 if(g.phase!=='guess')fail('NO_ACTIVE_CLUE');if(p.spy||p.team!==g.active)fail('NOT_YOUR_TURN');if(g.guesses<=0)fail('GUESS_LIMIT');
 const tile=g.board[index];if(!tile)fail('INVALID_TILE');if(tile.revealed)fail('TILE_ALREADY_REVEALED');
 tile.revealed=true;g.guesses--;const performance=playerStats(g.stats,p.id);performance.guesses++;const guessMs=Math.max(0,now-(g.lastGuessAt||g.lastClueAt));g.lastGuessAt=now;
 if(tile.type===g.active){performance.correct++;performance.fastestMs=performance.fastestMs===null?guessMs:Math.min(performance.fastestMs,guessMs);g.stats.fastest=g.stats.fastest===null?guessMs:Math.min(g.stats.fastest,guessMs);if(g.clueBy){const spy=playerStats(g.stats,g.clueBy);spy.assists++;g.clueHits=(g.clueHits??0)+1;spy.bestClue=Math.max(spy.bestClue,g.clueHits)}}else if(tile.type==='home'||tile.type==='away')performance.opponent++;else performance[tile.type]++;
 if(tile.type==='red'){g.stats.cards++;g.stats.howler=p.name;say(g,'red',now);finish(g,other(g.active),'red',now);return}
 if(tile.type==='home'||tile.type==='away'){
  say(g,tile.type===g.active?'own':'opponent',now);if(tile.type===g.active){g.stats.correct[p.id]=(g.stats.correct[p.id]??0)+1;if(g.clueBy)g.stats.spymasters[g.clueBy]=(g.stats.spymasters[g.clueBy]??0)+1;}
  if(left(g,tile.type)===0){finish(g,tile.type,'words',now);return}
 }
 if(tile.type==='yellow'){
  g.stats.cards++;say(g,'yellow',now);const opponent=other(g.active);const available=g.board.filter(t=>t.type===opponent&&!t.revealed);
  if(available.length>(s.protectLast?1:0)){const t=available[randomInt(available.length)];t.revealed=true;say(g,'penalty',now);if(!left(g,opponent)){finish(g,opponent,'penalty',now);return}}else say(g,'protected',now);
 }
 if(tile.type==='bench')say(g,'bench',now);
 if(tile.type!==g.active||g.guesses===0)nextTurn(g,s,now);
}
export function rematchPlayers(players:Player[]){for(const p of players){if(p.team)p.team=other(p.team);p.ready=false}for(const team of ['home','away'] as Team[]){const ps=players.filter(p=>p.team===team&&!p.left);const previous=ps.findIndex(p=>p.spy);ps.forEach(p=>p.spy=false);if(ps.length)ps[(previous+1)%ps.length].spy=true}}
