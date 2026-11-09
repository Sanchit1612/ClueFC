export type PlayerMatchStats={guesses:number;correct:number;opponent:number;bench:number;yellow:number;red:number;clues:number;assists:number;bestClue:number;fastestMs:number|null};
export type MatchStats={cards:number;fastest:number|null;howler:string|null;correct:Record<string,number>;spymasters:Record<string,number>;players:Record<string,PlayerMatchStats>};
export function playerStats(stats:MatchStats,id:string){stats.players??={};return stats.players[id]??=( {guesses:0,correct:0,opponent:0,bench:0,yellow:0,red:0,clues:0,assists:0,bestClue:0,fastestMs:null} )}
export function matchReport(game:any,players:{id:string;name:string;team:string|null;spy:boolean}[]){
 const participants:typeof players=game.participants??players;
 const rows=participants.filter(p=>p.team).map((p:{id:string;name:string;team:string|null;spy:boolean})=>{
  const s={guesses:0,correct:0,opponent:0,bench:0,yellow:0,red:0,clues:0,assists:0,bestClue:0,fastestMs:null,...game.stats.players?.[p.id]} as PlayerMatchStats;
  const mistakes=s.opponent+s.bench+s.yellow;
  return {id:p.id,name:p.name,team:p.team,spy:p.spy,...s,accuracy:s.guesses?Math.round(100*s.correct/s.guesses):null,score:s.correct*3+s.assists*2-mistakes*2-s.red*5};
 }).sort((a,b)=>b.score-a.score||b.correct-a.correct||b.assists-a.assists||a.name.localeCompare(b.name));
 const active=rows.filter(p=>p.guesses||p.clues);
 const mostGuesses=[...active].filter(p=>p.guesses).sort((a,b)=>b.guesses-a.guesses||b.correct-a.correct)[0]??null;
 const topGuesser=[...active].filter(p=>p.correct).sort((a,b)=>b.correct-a.correct||(b.accuracy??0)-(a.accuracy??0))[0]??null;
 const bestSpy=[...active].filter(p=>p.clues).sort((a,b)=>b.assists-a.assists||b.bestClue-a.bestClue)[0]??null;
 const fastest=[...active].filter(p=>p.fastestMs!==null).sort((a,b)=>a.fastestMs!-b.fastestMs!)[0]??null;
 return {mvp:active.find(p=>p.score>0)??null,mostGuesses,topGuesser,bestSpy,fastest,howler:game.stats.howler??null,rows,durationMs:Math.max(0,(game.endedAt??game.history.at(-1)?.at??game.started)-game.started),turns:game.turn,cards:game.stats.cards,scoring:'3 per correct guess + 2 per word found from your clues − 2 per opponent/bench/Yellow − 5 per Red'};
}
