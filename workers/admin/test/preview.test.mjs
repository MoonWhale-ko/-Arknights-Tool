import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
test('preview builds the exact public pages and assets, including the published rewards page',()=>{
 execFileSync(process.execPath,['scripts/build-preview.mjs'],{cwd:new URL('../',import.meta.url)});
 for(const path of ['index.html','rewards.html','operators.html','assets/css/zoot.css','assets/js/zoot.js','data/items.json'])assert.equal(readFileSync(new URL('../public/preview/'+path,import.meta.url),'utf8'),readFileSync(new URL('../../../'+path,import.meta.url),'utf8'));
 const home=readFileSync(new URL('../public/preview/index.html',import.meta.url),'utf8');assert.match(home,/href="rewards.html"/);assert.match(home,/mashirozx\/arknights-ui\/master\/img\/UI_HOME.png/);assert.ok(home.indexOf('Base_iconv2')<home.indexOf('<h2>광산</h2>'));
 assert.deepEqual([...home.matchAll(/data-feature-number="(\d)"/g)].map(m=>m[1]),['1','2','3','4','5']);
 const links=[...home.match(/<nav class="grid"[\s\S]*?<\/nav>/)[0].matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(links,['recruitment.html','operators.html','base.html','rewards.html','backpack.html']);
 const layout=readFileSync(new URL('../public/preview/assets/css/zoot.css',import.meta.url),'utf8');
 assert.match(layout,/repeat\(3,minmax/);assert.match(layout,/@media\(max-width:600px\).*repeat\(2,minmax/s);
 const rewards=readFileSync(new URL('../public/preview/rewards.html',import.meta.url),'utf8');
 assert.match(rewards,/assets\/css\/zoot.css/);assert.match(rewards,/id="rewardsOriginite"/);assert.match(rewards,/id="rewardsOrundum"/);assert.doesNotMatch(rewards,/type="file"|data-reward=|id="orWeekly"/);
});
