import test from 'node:test';import assert from 'node:assert/strict';
import {illustrationRect} from '../public/wardrobe/original-layout.js';
const scale=862/810,viewport=1280/1535;
const node={w:100,h:100,x:397.28376,y:335.4,scale:{x:.68068,y:.68068}};
test('Ling E2 static PNG matches the supplied game screenshot scale rather than raw texture pixels',()=>{
 const r=illustrationRect('illust_char_2023_ling_2',2275,2125,node,scale);
 const screenWidth=r.width*node.scale.x*scale*viewport;
 assert.ok(Math.abs(screenWidth-720.53)<1);
 const x=(node.x+50+(r.left-50)*node.scale.x)*scale*viewport;
 const y=(node.y+50+(r.top-50)*node.scale.y)*scale*viewport;
 assert.ok(Math.abs(x-11.58)<.01);assert.ok(Math.abs(y-26.42)<.01);
 assert.ok(Math.abs(r.width/r.height-2275/2125)<.00001);
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
