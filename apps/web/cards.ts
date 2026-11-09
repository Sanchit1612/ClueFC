export const TILE_LABELS:Record<string,string>={home:'H · HOME',away:'A · AWAY',bench:'— BENCH',yellow:'▥ YELLOW',red:'▥ RED CARD'};
export const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type TileView={word:string;type:string|null;revealed:boolean};
export function renderBoard(tiles:TileView[],spy:boolean,canGuess:boolean,revealedNow:Set<number>=new Set(),dealt=false){
 return `<div class="board" aria-label="Football word board">${tiles.map((tile,index)=>{
  const kind=tile.type&&TILE_LABELS[tile.type]?tile.type:'';
  const long=tile.word.split(/[ -]/).some(word=>word.length>9);
  const description=tile.word+(kind?', '+TILE_LABELS[kind]:', unrevealed');
  return `<button class="tile ${kind} ${long?'long-word':''} ${spy?'spy':''} ${tile.revealed?'revealed':''} ${revealedNow.has(index)?'just-revealed':''} ${dealt?'dealt-card':''}"
   data-action="tile" data-index="${index}" ${!canGuess||tile.revealed?'disabled':''} aria-label="${escapeHtml(description)}">
   <span class="tile-n">${String(index+1).padStart(2,'0')}</span>
   ${kind?`<span class="card-emblem" aria-hidden="true">${kind==='home'||kind==='away'?'<svg viewBox="0 0 40 40"><path d="m11 7-8 6 5 10 5-3v16h14V20l5 3 5-10-8-6-5-2q-4 7-8 0Z"/></svg>':kind==='red'||kind==='yellow'?'▰':'—'}</span>`:''}
   <span class="tile-word">${escapeHtml(tile.word)}</span>
   ${kind?`<span class="tile-mark">${TILE_LABELS[kind]}${spy&&!tile.revealed?' · KEY':''}</span>`:''}
  </button>`;
 }).join('')}</div>`;
}
