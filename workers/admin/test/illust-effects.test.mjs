import test from 'node:test';import assert from 'node:assert/strict';
import {shadeEffectPixel} from '../public/wardrobe/illust-effects-canvas.mjs';
test('original additive shader doubles tint and preserves straight-alpha output',()=>{
 const pixel=shadeEffectPixel([.5,.25,1,.4],1,[.5,1,0,.5]);assert.deepEqual(pixel,[.5,.5,0,.4]);
});
test('original dissolve shader rejects and reveals pixels around the saved threshold',()=>{
 assert.equal(shadeEffectPixel([1,1,1,1],.4,[.5,.5,.5,.5],.574,.386,true)[3],0);
 assert.equal(shadeEffectPixel([1,1,1,1],1,[.5,.5,.5,.5],.574,.386,true)[3],1);
 assert.ok(Math.abs(shadeEffectPixel([1,1,1,1],.767,[.5,.5,.5,.5],.574,.386,true)[3]-.5)<1e-12);
});
import {applyBoneFollower} from '../public/wardrobe/illust-effects-transform.mjs';
const mesh=()=>({position:{set(x,y){this.x=x;this.y=y;}},scale:{set(x,y){this.x=x;this.y=y;}}});
test('native bone follower uses animated bone position and saved rotation flags',()=>{
 const m=mesh();applyBoneFollower(m,{matrix:{tx:30,ty:-20,a:0,b:1},scaleX:2,scaleY:3},{followBoneRotation:true,followLocalScale:false},{scaleX:1,scaleY:1});
 assert.deepEqual([m.position.x,m.position.y,m.rotation,m.scale.x,m.scale.y],[30,-20,Math.PI/2,1,1]);
});
test('native bone follower handles local reflection and skeleton flip',()=>{
 const m=mesh();applyBoneFollower(m,{matrix:{tx:0,ty:0,a:-1,b:0},scaleX:-2,scaleY:3},{followBoneRotation:true,followLocalScale:true,followSkeletonFlip:true},{scaleX:-1,scaleY:1});
 assert.equal(m.rotation,2*Math.PI);assert.deepEqual([m.scale.x,m.scale.y],[-2,-3]);
});
import {effectIsBehind} from '../public/wardrobe/illust-effects-transform.mjs';
test('native explicit sorting order overrides depth, keeping Mizuki ocean behind the character',()=>{
 assert.equal(effectIsBehind({sortingOrder:-2,depth:-.05},0),true);
 assert.equal(effectIsBehind({sortingOrder:1,depth:2},0),false);
 assert.equal(effectIsBehind({sortingOrder:0,depth:.21},0),true);
 assert.equal(effectIsBehind({sortingOrder:0,depth:-.07},0),false);
});
