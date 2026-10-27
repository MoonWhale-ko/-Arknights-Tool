import test from 'node:test';import assert from 'node:assert/strict';
import {illustrationRect} from '../public/wardrobe/original-layout.js';
const scale=862/810,viewport=1280/1535;
const node={w:100,h:100,x:397.28376,y:335.4,scale:{x:.68068,y:.68068}};
test('Ling E2 uses the original prefab instead of screenshot calibration',()=>{
 const m=native.illustrations.illust_char_2023_ling_2;
 assert.equal(m.sourceCategory,'chararts');
 const r=illustrationRect('illust_char_2023_ling_2',2275,2125,node,scale,m);
 assert.deepEqual(r,nativeIllustrationRect(m,2275,2125,node));
 const full=illustrationRect('illust_char_2023_ling_2',m.sprite.rect.width,m.sprite.rect.height,node,scale,m);
 assert.equal(full.width,m.skinOffset.size.x*m.scale.x);
 assert.equal(full.left,node.w/2+m.skinOffset.position.x-full.width/2);
});
test('uncalibrated art stays inside the viewport at large texture resolutions without distortion',()=>{
 for(const [w,h]of [[4096,4096],[1800,3000],[6000,2000]]){
  const r=illustrationRect('unknown',w,h,node,scale);
  assert.ok(r.width*node.scale.x<=962/scale);assert.ok(r.height*node.scale.y<=810);
  assert.ok(Math.abs(r.width/r.height-w/h)<.00001);
 }
});

import {nativeIllustrationRect} from '../public/wardrobe/original-layout.js';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
const native=JSON.parse(gunzipSync(readFileSync(new URL('../public/wardrobe/native-scene.json.gz',import.meta.url))));
test('all three purchased Ling skins use source skin offsets and preserve sprite trimming',()=>{
 for(const [id,w,h]of [['illust_char_2023_ling_nian#12',2363,2543],['illust_char_2023_ling_nian#9',2048,2048],['illust_char_2023_ling_ncg#1',2557,2115]]){
  const metric=native.illustrations[id],r=illustrationRect(id,w,h,node,scale,metric);
  assert.deepEqual(r,nativeIllustrationRect(metric,w,h,node));
  const full=nativeIllustrationRect(metric,metric.sprite.rect.width,metric.sprite.rect.height,node);
  assert.equal(full.width,metric.skinOffset.size.x);assert.equal(full.height,metric.skinOffset.size.y);
  assert.equal(full.left,node.w/2+metric.skinOffset.position.x-full.width/2);
  assert.equal(full.top,node.h/2-metric.skinOffset.position.y-full.height/2);
  if(w!==Math.round(metric.sprite.rect.width)){assert.ok(r.left>=full.left);assert.ok(r.top>=full.top);assert.ok(r.width<=full.width);}
 }
});

test('native basic skins retain prefab size when the custom-size override is disabled',()=>{
 for(const id of ['illust_char_502_nblade_1','illust_char_503_rang_1','illust_char_500_noirc_1']){
  const m=native.illustrations[id];assert.equal(m.skinOffset.enableSize,0);
  const r=illustrationRect(id,m.sprite.rect.width,m.sprite.rect.height,node,scale,m);
  assert.equal(r.width,m.size.x*m.scale.x);assert.equal(r.height,m.size.y*m.scale.y);
  assert.equal(r.left,node.w/2+m.skinOffset.position.x-r.width*m.pivot.x);
 }
});
test('provided Amiya variants each resolve their own prefab rather than inheriting Ling calibration',()=>{
 for(const id of ['illust_char_002_amiya_1','illust_char_002_amiya_1+','illust_char_002_amiya_2']){
  const m=native.illustrations[id];assert.ok(m.sourceAsset.endsWith(id+'.prefab'));
  assert.deepEqual(illustrationRect(id,1340,1340,node,scale,m),nativeIllustrationRect(m,1340,1340,node));
 }
});

const catalog=JSON.parse(readFileSync(new URL('../public/wardrobe/catalog.json',import.meta.url))).skins;
test('every catalogued basic or evolved appearance has its own usable native layout',()=>{
 const basic=catalog.filter(s=>s.charId.startsWith('char_')&&s.basic);assert.equal(basic.length,833);
 for(const skin of basic){
  const m=native.illustrations[skin.illustration];assert.ok(m?.sprite,skin.id);
  for(const [w,h]of [[m.sprite.rect.width,m.sprite.rect.height],[Math.round(m.sprite.textureRect.width),Math.round(m.sprite.textureRect.height)]]){
   const rect=illustrationRect(skin.illustration,w,h,node,scale,m);
   assert.ok(Object.values(rect).every(Number.isFinite),skin.id);assert.ok(rect.width>0&&rect.height>0,skin.id);
  }
 }
});

test('all catalogued purchased skins resolve native placement, including case-normalized music skins',()=>{
 const purchased=catalog.filter(s=>s.charId.startsWith('char_')&&!s.basic);assert.equal(purchased.length,486);
 for(const skin of purchased){
  const m=native.illustrations[skin.illustration];assert.ok(m?.sprite,skin.id);
  assert.equal(m.sourceAsset.toLowerCase().endsWith(skin.illustration.toLowerCase()+'.prefab'),true,skin.id);
  const r=illustrationRect(skin.illustration,Math.round(m.sprite.textureRect.width),Math.round(m.sprite.textureRect.height),node,scale,m);
  assert.ok(Object.values(r).every(Number.isFinite),skin.id);assert.ok(r.width>0&&r.height>0,skin.id);
 }
});
