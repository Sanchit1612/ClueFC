import words from '../../data/words.en.json' with {type:'json'};
import {validateClue,normalize,submitClue,reveal,nextTurn,randomInt,type Game,type Player,type Team} from '../../packages/game-core/index.ts';
import type {Room} from './rooms.ts';
import {connected} from './lifecycle.ts';

// Association data stays on the server. Guessing accepts a word-only board.
const dictionary=new Map(words.map(w=>[w.word,w]));
const synonyms:Record<string,string[]>={
 finishing:['goals','scoring','striker'],attacking:['attack','forward'],legacy:['legend','greats','goat'],
 aerial:['heading','header','air'],power:['strength'],pace:['speed','fast'],wide:['wing','wings'],
 skill:['dribbling','flair','tricks'],creation:['creative','assist','playmaker'],midfield:['midfielder','passing'],
 technique:['control','touch'],leadership:['captain','leader'],defence:['defending','defender','tackle'],
 goalkeeping:['keeper','saves','gloves'],lastline:['goalkeeper'],tactics:['strategy','formation'],
 dressingroom:['manager','coach'],crowd:['fans','supporters','terrace'],europe:['european','continental'],
 academy:['youth','development'],rivalry:['derby','rivals'],international:['country','national'],
 stadium:['ground','venue'],occasions:['occasion'],referee:['official','whistle'],discipline:['booking','foul'],
 decisions:['decision','var'],setpiece:['deadball'],delivery:['crossing'],movement:['running','run'],
 equipment:['kit','gear'],matchday:['match'],awards:['trophy','prize'],tournament:['competition','cup'],
 drama:['comeback'],squad:['team','players'],transfers:['signing','market'],training:['practice'],recovery:['fitness','injury']
};
const groups:Record<string,string[]>={
 goat:['MESSI','RONALDO','PELÉ','MARADONA'],argentina:['MESSI','MARADONA','AGÜERO','BATISTUTA','DI MARÍA','BOMBONERA','LA BOMBONERA','RIVER PLATE','BOCA JUNIORS'],
 brazil:['PELÉ','RONALDINHO','NEYMAR','KAKÁ','RIVALDO','RONALDO NAZÁRIO','MARACANÃ','SANTOS'],
 france:['ZIDANE','HENRY','MBAPPÉ','BENZEMA','PLATINI','DESCHAMPS','MONACO','LYON','PSG'],
 spain:['XAVI','INIESTA','BUSQUETS','RAMOS','PUYOL','BARCELONA','REAL MADRID','SEVILLA','MESTALLA','CAMP NOU','TIKI TAKA'],
 england:['BECKHAM','ROONEY','GERRARD','LAMPARD','KANE','WEMBLEY','ANFIELD','OLD TRAFFORD','LIVERPOOL','ARSENAL','CHELSEA','MANCHESTER UNITED'],
 germany:['KLOPP','MÜLLER','BECKENBAUER','NEUER','LAHM','DORTMUND','BAYERN MUNICH','BUNDESLIGA'],
 italy:['PIRLO','MALDINI','BUFFON','TOTTI','CONTE','ANCELOTTI','SAN SIRO','JUVENTUS','AC MILAN','INTER MILAN','NAPOLI'],
 portugal:['RONALDO','FIGO','MOURINHO','BENFICA','PORTO','SPORTING'],
 barcelona:['MESSI','XAVI','INIESTA','PUYOL','BUSQUETS','RONALDINHO','CAMP NOU','LA MASIA','TIKI TAKA'],
 madrid:['RONALDO','ZIDANE','BENZEMA','RAMOS','MODRIĆ','BERNABÉU','GALÁCTICOS'],
 manchester:['ROONEY','BECKHAM','SCHOLES','GIGGS','FERGUSON','OLD TRAFFORD','ETIHAD','AGÜERO'],
 merseyside:['GERRARD','DALGLISH','SALAH','ANFIELD','KOP','EVERTON','LIVERPOOL']
};
const associationCache=new Map<string,ReadonlySet<string>>();
export function associations(word:string):ReadonlySet<string>{
 const cached=associationCache.get(word);if(cached)return cached;
 const entry=dictionary.get(word);const values=new Set<string>();
 if(entry){for(const tag of entry.tags){values.add(tag);for(const alias of synonyms[tag]??[])values.add(alias)}const kind=entry.kind;for(const alias of (kind==='player'?['footballer']:kind==='club'?['club']:kind==='venue'?['ground','venue']:kind==='manager'?['coach','manager']:[]))values.add(alias)}
 for(const [clue,members] of Object.entries(groups))if(members.some(w=>normalize(w)===normalize(word)))values.add(clue);
 associationCache.set(word,values);return values;
}
type Random=()=>number;
const random=()=>randomInt(10000)/10000;
export function chooseBotClue(game:Game,team:Team,rng:Random=random,style:Player['botStyle']='balanced'){
 const own=game.board.filter(t=>!t.revealed&&t.type===team);const candidates=new Set(own.flatMap(t=>[...associations(t.word)]));
 const ranked:{word:string;number:number;score:number}[]=[];
 for(const word of candidates){
  try{validateClue(word,1,game.board)}catch{continue}
  const hits=game.board.filter(t=>!t.revealed&&associations(t.word).has(word));
  const good=hits.filter(t=>t.type===team).length;if(!good)continue;
  const risk=hits.reduce((n,t)=>n+(t.type===team?0:t.type==='red'?12:t.type==='yellow'?5:3),0);
  const preferred=['goals','legend','heading','wing','playmaker','keeper','coach','ground','fans','strategy','trophy','competition'];
  const score=Math.min(good,3)*3-risk+(groups[word]?.length?0.2:preferred.includes(word)?0.1:0);
  ranked.push({word,number:Math.min(good,3),score});
 }
 ranked.sort((a,b)=>b.score-a.score);
 if(ranked.length){
  const adventurous=style==='bold'?0.4:style==='careful'?0.12:0.25;
  const alternatives=ranked.filter(c=>c.score>=ranked[0].score-3).slice(1,7);
  const pick=alternatives.length&&rng()<adventurous?alternatives[Math.floor(rng()*alternatives.length)]:ranked[0];
  let number=pick.number;
  if(number>1&&rng()<(style==='careful'?0.3:0.12))number--;
  else if(number<3&&rng()<(style==='bold'?0.25:0.1))number++;
  return {word:pick.word,number};
 }
 for(const word of ['Football','Sporting','Connection','Identity','History']){try{validateClue(word,1,game.board);return {word,number:1}}catch{}}
 return null;
}
export function chooseBotGuess(board:ReadonlyArray<{word:string;revealed:boolean}>,clue:string,rng:Random=random,style:Player['botStyle']='balanced'){
 const clean=normalize(clue);
 const tags=new Set(Object.entries(synonyms).filter(([tag,aliases])=>tag===clean||aliases.includes(clean)).map(([tag])=>tag));
 const group=groups[clean];if(group)for(const word of group)for(const tag of dictionary.get(word)?.tags??[])tags.add(tag);
 const neighbours=[['finishing','attacking','aerial','power','pace'],['skill','creation','technique','wide','midfield'],['defence','goalkeeping','lastline'],['tactics','leadership','dressingroom','squad','training'],['crowd','stadium','rivalry','matchday'],['referee','discipline','decisions'],['awards','tournament','occasions','international'],['setpiece','delivery','movement']];
 const related=new Set(neighbours.filter(group=>group.some(tag=>tags.has(tag))).flat());
 const candidates=board.map((tile,index)=>{
  const entry=dictionary.get(tile.word),direct=associations(tile.word).has(clean);
  const indirect=entry?.tags.some(tag=>tags.has(tag)||related.has(tag));
  return {index,revealed:tile.revealed,score:direct?1:indirect?0.3:0};
 }).filter(t=>!t.revealed&&t.score>0);
 const direct=candidates.filter(t=>t.score===1),near=candidates.filter(t=>t.score<1);
 const misread=style==='bold'?0.32:style==='careful'?0.14:0.23;
 // A plausible near-association can win over a literal match. No card types enter here.
 const pool=near.length&&rng()<misread?near:direct;
 if(!pool.length)return null;
 return pool[Math.floor(rng()*pool.length)]?.index??null;
}
function thinkTime(player:Player,phase:string,rng:Random=random){
 const base=player.botStyle==='careful'?4000:player.botStyle==='bold'?2500:3000;
 return base+Math.floor(rng()*(phase==='clue'?4500:3500));
}
export function tickBots(room:Room,now:number){
 const game=room.game;if(!game||game.phase==='ended'||game.pausedAt||room.emptyAt)return false;
 if(!room.players.some(p=>!p.bot&&connected(p,now)))return false;
 const team=room.players.filter(p=>p.team===game.active&&connected(p,now));
 let player:Player|undefined;
 if(game.phase==='clue')player=team.find(p=>p.bot&&p.spy);
 else if(!team.some(p=>!p.bot&&!p.spy))player=team.find(p=>p.bot&&!p.spy);
 if(!player){if(room.botNextAt){room.botNextAt=undefined;return true}return false}
 if(!room.botNextAt){room.botNextAt=now+thinkTime(player,game.phase);return true}
 if(now<room.botNextAt)return false;
 if(game.phase==='clue'){
  const clue=chooseBotClue(game,game.active,random,player.botStyle);
  if(clue)submitClue(game,player,clue.word,clue.number,room.settings,now);else nextTurn(game,room.settings,now);
 }else{
  const number=typeof game.clue?.number==='number'?game.clue.number:3;
  // Stop at the declared count. Never use types, key access or a clue intention list.
  const allowance=game.clue?.number==='unlimited'?99:number+1;
  const made=allowance-game.guesses;
  const cautiousPass=made>0&&random()<(player.botStyle==='careful'?0.2:0.08);
  const countReached=made>=Math.max(1,number);
  const extraChance=player.botStyle==='bold'?0.22:0.06;
  const stop=cautiousPass||countReached&&(game.guesses<=0||random()>=extraChance);
  const index=stop?null:chooseBotGuess(game.board.map(t=>({word:t.word,revealed:t.revealed})),game.clue?.word??'',random,player.botStyle);
  if(index===null){game.history.push({text:player.name+(stop?' plays safe and ends the turn.':' cannot connect this clue and passes.'),at:now});nextTurn(game,room.settings,now)}
  else reveal(game,player,index,room.settings,now);
 }
 room.lastAction=now;room.botNextAt=now+thinkTime(player,game.phase);return true;
}
