import test from 'node:test';import assert from 'node:assert/strict';
import {shadeEffectPixel,anchorMainUV,vertexAlphaGrid,sampleEffectImage} from '../public/wardrobe/illust-effects-canvas.mjs';
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
test('anchor distortion uses original red-channel displacement before main texture tiling',()=>{
 const uniforms={_UVTween:[0,0,-.08,0],_MainTex_ST:[1.99,1.04,-.05,0],_AnchorU:1,_AnchorV:.5,_IntensityU:.159,_IntensityV:0};
 const a=anchorMainUV(.5,.5,0,0,uniforms),b=anchorMainUV(.5,.5,0,1,uniforms);
 assert.ok(Math.abs(b[0]-a[0]-.159*1.99)<1e-8);assert.equal(a[1],b[1]);
});
test('vertex alpha is interpolated across triangles rather than using a transparent first vertex',()=>{
 const l={uv:[[0,0],[1,0],[0,1]],triangles:[[0,1,2]],vertexAlpha:[0,1,1]},a=vertexAlphaGrid(l,4,4);
 assert.ok(Math.abs(a[0]-.25)<1e-8);assert.ok(a[2]>a[0]);assert.equal(a[15],0);
});
test('clamped edge sampling preserves the original alpha rather than wrapping the opposite edge',()=>{
 const image={width:2,height:1,data:new Uint8ClampedArray([255,0,0,0,0,0,255,255])},out=[];
 sampleEffectImage(image,0,.5,out,false);assert.equal(out[3],0);
 sampleEffectImage(image,1,.5,out,false);assert.equal(out[3],1);
 sampleEffectImage(image,0,.5,out,true);assert.equal(out[3],.5);
});
import {readFileSync} from 'node:fs';
test('Mizuki distortion uses both original meshes, their varying alpha and the resolved original map',()=>{
 const scene=JSON.parse(readFileSync(new URL('../public/wardrobe/effects/mizuki-sale7/scene.json',import.meta.url)));
 for(const name of ['sekuai_dm','sekua3_dm']){const l=scene.layers.find(l=>l.name===name);assert.ok(l);assert.equal(l.vertices.length,35);assert.ok(l.vertexAlpha.includes(0)&&l.vertexAlpha.includes(1));assert.equal(l.textures._DisturTex.name,'TX_WaterNoise');assert.equal(l.textures._DisturTex.sourcePathId,'3598337627453241146');assert.ok(l.colorsUniform._UVTween.b<0);const a=vertexAlphaGrid(l,32,32);assert.ok(a.some(v=>v>0)&&a.some(v=>v===0));}
 const sea=scene.layers.find(l=>l.name==='hai_dm');assert.ok(sea.referenceClip);assert.equal(sea.textures._ReferenceMask.file,'texture-90.png');
});
