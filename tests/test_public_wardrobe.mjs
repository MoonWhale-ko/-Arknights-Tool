import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildWardrobe} from '../scripts/build_wardrobe_site.mjs';
test('public wardrobe works on Pages subpaths and includes account import and guide',async()=>{
 const out=await mkdtemp(path.join(tmpdir(),'wardrobe-site-'));
 try{
  await buildWardrobe(out);
  const html=await readFile(path.join(out,'wardrobe.html'),'utf8'),ui=await readFile(path.join(out,'wardrobe/ui.js'),'utf8'),css=await readFile(path.join(out,'wardrobe/style.css'),'utf8');
  assert.match(html,/assets\/js\/guide-tour.mjs/);assert.doesNotMatch(html,/(?:src|href)="\//);
  assert.match(ui,/import\('\.\.\/assets\/js\/account-menu.mjs'\)/);assert.match(ui,/fetch\('\.\/wardrobe\/catalog.json'\)/);assert.match(ui,/const root='\.\/'/);
  assert.doesNotMatch(css,/url\(['"]?\/preview\//);
  for(const name of ['catalog.json','sd-models.json','native-scene.json.gz'])assert.ok((await readFile(path.join(out,'wardrobe',name))).length>0);
 }finally{await rm(out,{recursive:true,force:true});}
});
