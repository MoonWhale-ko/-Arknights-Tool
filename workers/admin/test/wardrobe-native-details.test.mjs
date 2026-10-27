import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const scene=JSON.parse(gunzipSync(readFileSync(new URL('../public/wardrobe/native-scene.json.gz',import.meta.url))));
test('portrait frame stretches only its middle while square frame remains simple',()=>{
 for(const nodes of Object.values(scene.layouts)){
  const frames=nodes.filter(n=>n.image?.name==='head_back');
  assert.equal(frames.length,2);
  assert.deepEqual(frames.map(n=>n.image.type).sort(),[0,1]);
  for(const n of frames)assert.deepEqual(n.image.border,{x:0,y:64,z:0,w:59});
 }
});
test('both outfit banners retain original text rectangles and fonts',()=>{
 for(const section of ['building_item','buyable_item'])for(const name of ['const_text','brand_name']){
  const node=Object.entries(scene.page).find(([path])=>path.endsWith('/'+section+'/'+name))?.[1];
  assert.ok(node?.rect[2]>0);assert.ok(node.fontName);assert.equal(node.font.m_FontSize,name==='const_text'?7:20);
 }
 assert.equal(scene.canvas.matchWidthOrHeight,1);
});
