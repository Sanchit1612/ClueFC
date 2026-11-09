export const TILE_LABELS:Record<string,string>={home:'H · HOME',away:'A · AWAY',bench:'— BENCH',yellow:'▥ YELLOW',red:'▥ RED CARD'};
export const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type TileView={word:string;type:string|null;revealed:boolean};
const pitch=`<svg viewBox="0 0 120 64" aria-hidden="true"><rect x="3" y="3" width="114" height="58" rx="2"/><path d="M60 3v58M3 18h17v28H3m114-28h-17v28h17"/><circle cx="60" cy="32" r="13"/><circle cx="60" cy="32" r="1"/></svg>`;
const shirt=`<svg viewBox="0 0 40 40" aria-hidden="true"><path d="m11 7-8 6 5 10 5-3v16h14V20l5 3 5-10-8-6-5-2q-4 7-8 0Z"/></svg>`;
const tick=`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg>`;
const status:Record<string,string>={home:'FOUND',away:'FOUND',bench:'BENCHED',yellow:'BOOKED',red:'SENT OFF'};
export function renderBoard(tiles:TileView[],spy:boolean,canGuess:boolean,revealedNow:Set<number>=new Set(),dealt=false){
 return `<div class="board" aria-label="Football word board">${tiles.map((tile,index)=>{
  const kind=tile.type&&TILE_LABELS[tile.type]?tile.type:'';
  const long=tile.word.split(/[ -]/).some(word=>word.length>9);
  const outcome=tile.revealed&&kind?status[kind]:'';
  const description=tile.word+(kind?', '+TILE_LABELS[kind]:', unrevealed')+(outcome?', '+outcome:'');
  return `<button class="tile ${kind} ${long?'long-word':''} ${spy?'spy':''} ${tile.revealed?'revealed':''} ${revealedNow.has(index)?'just-revealed':''} ${dealt?'dealt-card':''}"
   data-action="tile" data-index="${index}" ${!canGuess||tile.revealed?'disabled':''} aria-label="${escapeHtml(description)}">
   <span class="tile-n">${String(index+1).padStart(2,'0')}</span>
   <span class="tile-heading" aria-hidden="true">${kind?TILE_LABELS[kind]:'CLUE FC'}</span>
   <span class="card-pitch">${pitch}</span>
   ${kind?`<span class="card-emblem" aria-hidden="true">${kind==='home'||kind==='away'?shirt:kind==='red'||kind==='yellow'?'▰':'—'}</span>`:''}
   <span class="tile-word">${escapeHtml(tile.word)}</span>
   ${outcome?`<span class="tile-status ${kind==='home'||kind==='away'?'found-status':''}">${kind==='home'||kind==='away'?tick:'<span class="status-card" aria-hidden="true">▰</span>'}<span>${outcome}</span></span>`:kind?'<span class="tile-mark">SECRET KEY</span>':'<span class="tile-footer" aria-hidden="true"><i></i><b>FC</b><i></i></span>'}
  </button>`;
 }).join('')}</div>`;
}
