import {test} from 'node:test';
import assert from 'node:assert/strict';
import words from '../data/words.en.json' with {type:'json'};
import {newGame,selectBoardWords} from '../packages/game-core/index.ts';
test('pack has distinct tagged entries, medium majority and several kinds',()=>{
 assert.ok(words.length>=300);
 assert.equal(new Set(words.map(w=>w.word.normalize('NFD').replace(/\p{M}/gu,'').toUpperCase())).size,words.length);
 assert.ok(words.filter(w=>w.difficulty==='medium').length>words.length*.6);
 for(const kind of ['player','club','venue','term'])assert.ok(words.some(w=>w.kind===kind));
 for(const w of words){assert.ok(['easy','medium','hard'].includes(w.difficulty));assert.ok(new Set(w.tags).size>=2);assert.match(w.word,/^[\p{L}\p{N} ’’'’&.-]+$/u)}
});
test('deals have medium difficulty and several overlapping associations',()=>{
 for(let n=0;n<100;n++){
  const board=selectBoardWords();assert.equal(board.length,25);assert.equal(new Set(board.map(w=>w.word)).size,25);
  for(const [difficulty,count] of Object.entries({easy:6,medium:16,hard:3}))assert.equal(board.filter(w=>w.difficulty===difficulty).length,count);
  const themes=new Map<string,number>();for(const w of board)for(const t of w.tags)themes.set(t,(themes.get(t)??0)+1);
  assert.ok([...themes.values()].filter(n=>n>=2).length>=4);
 }
});
test('four consecutive boards avoid the previous three while retaining difficulty',()=>{
 const history:string[][]=[];
 for(let round=0;round<12;round++){
  const recent=history.slice(-3).flat();const board=selectBoardWords(recent);
  assert.ok(board.every(w=>!recent.includes(w.word)));
  assert.equal(board.filter(w=>w.difficulty==='medium').length,16);
  history.push(board.map(w=>w.word));
 }
});
test('association metadata never enters game snapshots or the board key',()=>{
 const g=newGame({timer:90,yellows:true,protectLast:true});
 for(const tile of g.board)assert.deepEqual(Object.keys(tile).sort(),['revealed','type','word']);
});
