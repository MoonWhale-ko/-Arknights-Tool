import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
test('preview builds the exact public pages and assets, with unpublished rewards kept in private output',()=>{
 execFileSync(process.execPath,['scripts/build-preview.mjs'],{cwd:new URL('../',import.meta.url)});
 for(const path of ['operators.html','assets/css/zoot.css','assets/js/zoot.js','data/items.json'])assert.equal(readFileSync(new URL('../public/preview/'+path,import.meta.url),'utf8'),readFileSync(new URL('../../../'+path,import.meta.url),'utf8'));
 const home=readFileSync(new URL('../public/preview/index.html',import.meta.url),'utf8');assert.match(home,/href="rewards.html"/);assert.match(home,/mashirozx\/arknights-ui\/master\/img\/UI_HOME.png/);assert.ok(home.indexOf('Base_iconv2')<home.indexOf('<h2>광산</h2>'));
 const rewards=readFileSync(new URL('../public/preview/rewards.html',import.meta.url),'utf8');
 assert.match(rewards,/assets\/css\/zoot.css/);assert.match(rewards,/id="mineResult"/);assert.match(rewards,/id="orGrandTotal"/);
});
