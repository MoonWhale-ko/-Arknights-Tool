import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,access,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {buildRewards} from '../scripts/build_rewards_site.mjs';
test('public reward bundle supports Pages subpaths and contains all calculator dependencies',async()=>{
 const out=await mkdtemp(path.join(tmpdir(),'zoot-public-rewards-'));
 try{
  await buildRewards(out);
  const medalHtml=await readFile(path.join(out,'medals.html'),'utf8'),medalUi=await readFile(path.join(out,'medals/ui.js'),'utf8');
  assert.doesNotMatch(medalHtml,/\/preview\/|["']\/medals\//);assert.doesNotMatch(medalUi,/["']\/medals\/|demo.*complete/);
  for(const file of ['model.mjs','medal-scroll.mjs','medal-backing.mjs','catalog.json','native-layout.json','native-backgrounds.json','native/sets/medalgroupactivity51side.webp'])await access(path.join(out,'medals',file));
  const html=await readFile(path.join(out,'rewards.html'),'utf8'),ui=await readFile(path.join(out,'assets/js/rewards.mjs'),'utf8');
  assert.match(html,/src="assets\/js\/rewards.mjs/);assert.match(html,/href="assets\/css\/rewards.css/);
  assert.doesNotMatch(ui,/from '\/(?:mining|orundum)\//);assert.doesNotMatch(html,/type="file"|\/style.css/);
  for(const kind of ['mining','orundum']){
   const catalog=JSON.parse(await readFile(path.join(out,'data/rewards',kind+'.json'),'utf8'));assert.ok(catalog.revision);
   const engine=await import(pathToFileURL(path.join(out,'assets/js/rewards',kind,'engine.mjs')));assert.equal(typeof engine.calculate,'function');
  }
  for(const match of ui.matchAll(/from '(\.\/[^']+)'/g)){
   const dep=match[1].split('?')[0];
   await access(dep.startsWith('./rewards/')?path.join(out,'assets/js',dep):new URL('../assets/js/'+dep,import.meta.url));
  }
 }finally{await rm(out,{recursive:true,force:true});}
});
