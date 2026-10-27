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
