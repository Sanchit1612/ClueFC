import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderBoard} from '../apps/web/cards.ts';
test('accessible card labels contain text, with no nested markup or broken attributes',()=>{
 const html=renderBoard([{word:'MESSI',type:'home',revealed:false}],true,false);
 assert.ok(html.includes('aria-label="MESSI, H · HOME"'));
 assert.ok(html.includes('<span class="tile-word">MESSI</span>'));
 assert.ok(!html.includes('aria-label="<'));
 assert.equal((html.match(/<button/g)??[]).length,1);
});
test('word content cannot escape either the text or accessible attribute',()=>{
 const html=renderBoard([{word:'" onclick="alert(1)<img>',type:null,revealed:false}],false,true);
 assert.ok(!html.includes('<img>'));
 assert.ok(!html.includes('aria-label="" onclick='));
 assert.ok(html.includes('&quot; onclick=&quot;alert(1)&lt;img&gt;'));
});
test('only actionable unrevealed guesser cards are enabled',()=>{
 const cards=[{word:'MESSI',type:null,revealed:false},{word:'KEEPER',type:'bench',revealed:true}];
 const active=renderBoard(cards,false,true);assert.equal((active.match(/ disabled/g)??[]).length,1);
 const spy=renderBoard(cards,true,false);assert.equal((spy.match(/ disabled/g)??[]).length,2);
});
