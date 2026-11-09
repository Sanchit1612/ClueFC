import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {renderBoard} from '../apps/web/cards.ts';
const css=readFileSync(new URL('../apps/web/style.css',import.meta.url),'utf8');
const luminance=(hex:string)=>{const rgb=hex.match(/\w\w/g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
for(const kind of ['home','away','bench','yellow','red'])test(kind+' revealed card has readable contrast and a non-colour label',()=>{
 const rule=css.match(new RegExp('\\.tile\\.'+kind+'\\{([^}]+)'))![1];const bg=rule.match(/background:#([a-f0-9]{6})/)![1],fg=rule.match(/(?:^|;)color:#([a-f0-9]{6})/)![1];const a=luminance(bg),b=luminance(fg);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5);
 const html=renderBoard([{word:'FOOTBALL',type:kind,revealed:true}],false,false);assert.ok(html.includes('tile-status'));assert.ok(html.includes('aria-label="FOOTBALL, '));
});
test('motion preferences disable deal and reveal animation',()=>{assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*just-revealed[\s\S]*animation:none!important/)});
