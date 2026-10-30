import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {nativeCurve,nativeScalar,nativeGradient,nativeNoise,perlinNoise,createNativeEmitter} from '../public/wardrobe/illust-particles.mjs';
import {illustrationViewport} from '../public/wardrobe/illust-model-map.mjs';
const scene=JSON.parse(readFileSync(new URL('../public/wardrobe/effects/mizuki-sale7/scene.json',import.meta.url)));
test('native Hermite curve preserves tangents and randomized constant endpoints',()=>{
 const c={m_Curve:[{time:0,value:0,outSlope:1},{time:1,value:1,inSlope:1}]};assert.equal(nativeCurve(c,.25),.25);
 assert.equal(nativeScalar({minMaxState:3,minScalar:2,scalar:5},0,0),2);assert.equal(nativeScalar({minMaxState:3,minScalar:2,scalar:5},0,1),5);
});
test('native gradient uses independent RGB and alpha key times',()=>{
 const g={key0:{r:1,g:0,b:0,a:0},key1:{r:0,g:0,b:1,a:1},ctime0:0,ctime1:65535,atime0:0,atime1:32767.5,m_NumColorKeys:2,m_NumAlphaKeys:2,m_Mode:0};assert.deepEqual(nativeGradient(g,.5),[.5,0,.5,1]);
});
const point=()=>({set(x,y=x){this.x=x;this.y=y;}});
class Container{children=[];addChild(s){s.parent=this;this.children.push(s);}}
class Sprite{anchor=point();position=point();scale=point();destroy(){this.parent.children.splice(this.parent.children.indexOf(this),1);}}
const P={Container,Sprite,BLEND_MODES:{ADD:1}},texture={orig:{width:128,height:128}};
test('native prewarm produces particles and lifetime curves animate their visible sizes',()=>{
 const source=scene.emitters.find(e=>e.name==='xx2_dm'),e=createNativeEmitter(P,source,texture,()=>.5);
 assert.ok(e.box.children.length>0);assert.ok(e.box.children.length<=source.initial.maxNumParticles);
 const p=e.box.children[0],size=p.scale.x,y=p.position.y;e.update(.1);assert.notEqual(p.scale.x,size);assert.notEqual(p.position.y,y);
 for(const p of e.box.children)assert.ok([p.scale.x,p.scale.y,p.position.x,p.position.y,p.alpha].every(Number.isFinite));
});
test('native population remains bounded through repeated lifetime and burst cycles',()=>{
 const source=scene.emitters[1],e=createNativeEmitter(P,source,texture,()=>.5);for(let i=0;i<100;i++)e.update(.1);
 assert.ok(e.box.children.length>0&&e.box.children.length<=source.initial.maxNumParticles);
});
test('original camera anchors the skeleton at its world position rather than the pose centre',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../public/wardrobe/illust-models.json',import.meta.url))),f=manifest['dyn_illust_437_mizuki_sale#7'].nativeCameraFrame;
 assert.ok(Math.abs(f.y+2000)<.001);const v=illustrationViewport(2400,2400,f);assert.ok(Math.abs(v.x-1200)<.001);assert.ok(Math.abs(v.y-2000)<.001);
});
test('action particles stay dormant, honor native delays, stop emitting and replay on the next action',()=>{
 const source=structuredClone(scene.emitters.find(e=>e.action==='interact'&&e.name==='deng_01_dm'));
 source.delay=.3;source.duration=.2;source.initial.startLifetime={minMaxState:0,scalar:1};source.emission.rateOverTime={minMaxState:0,scalar:0};source.emission.bursts=[{time:0,countCurve:{minMaxState:0,scalar:1}}];
 const e=createNativeEmitter(P,source,texture,()=>.5);e.update(2);assert.equal(e.box.children.length,0);
 e.setPlaying(true);e.update(.2);assert.equal(e.box.children.length,0);e.update(.15);assert.equal(e.box.children.length,1);
 e.update(.3);assert.equal(e.box.children.length,1);e.update(1);assert.equal(e.box.children.length,0);
 e.setPlaying(false);e.setPlaying(true);e.update(.35);assert.equal(e.box.children.length,1);
});
test('all exported systems keep finite positions and bounded populations during idle, special and interact',()=>{
 assert.equal(scene.particleSource.platform,'Windows');assert.equal(scene.emitters.length,27);
 assert.ok(scene.emitters.some(e=>e.bone?.boneName==='Mizuki_Bubble'));
 assert.ok(scene.emitters.some(e=>e.action==='special'&&e.bone?.boneName==='BG_BulbA'));
 for(const source of scene.emitters){const e=createNativeEmitter(P,source,texture,()=>.5);if(source.action){e.update(1);assert.equal(e.box.children.length,0);e.setPlaying(true);}for(let i=0;i<300;i++)e.update(1/30);assert.ok(e.box.children.length<=source.initial.maxNumParticles);for(const p of e.box.children)assert.ok([p.scale.x,p.scale.y,p.position.x,p.position.y,p.alpha].every(Number.isFinite));}
});
test('curl noise is smooth, deterministic, zero at zero strength, and changes particle paths',()=>{
 const source=scene.emitters.find(e=>e.noise?.enabled),module=structuredClone(source.noise);
 const a=nativeNoise(module,[.3,.4,.5],0,.5),b=nativeNoise(module,[.3001,.4,.5],0,.5);
 assert.deepEqual(a,nativeNoise(module,[.3,.4,.5],0,.5));assert.ok(Math.hypot(...a)>0);assert.ok(Math.hypot(...a.map((v,i)=>v-b[i]))<.02);
 module.strength={minMaxState:0,scalar:0};assert.ok(nativeNoise(module,[.3,.4,.5],0,.5).every(v=>v===0));
 assert.ok(Math.abs(perlinNoise(.1,.2,.3)-perlinNoise(.1001,.2,.3))<.01);
 const clean=structuredClone(source);clean.noise.enabled=false;const e=createNativeEmitter(P,source,texture,()=>.5),f=createNativeEmitter(P,clean,texture,()=>.5);e.setPlaying(true);f.setPlaying(true);
 for(let i=0;i<20;i++){e.update(1/30);f.update(1/30);}assert.ok(e.box.children.length>0);assert.notEqual(e.box.children[0].position.x,f.box.children[0].position.x);
});
test('noise damping retains field scale and octave/axis settings affect the field',()=>{
 const n=structuredClone(scene.emitters.find(e=>e.noise?.enabled).noise),p=[0,0,0];
 n.frequency=1;const a=nativeNoise(n,p,0,.5);n.frequency=2;assert.deepEqual(nativeNoise(n,p,0,.5),a);
 n.damping=false;const b=nativeNoise(n,p,0,.5);b.forEach((v,i)=>assert.ok(Math.abs(v-a[i]*2)<1e-8));
 n.octaves=2;assert.notDeepEqual(nativeNoise(n,p,0,.5),b);
 n.separateAxes=true;n.strengthY={minMaxState:0,scalar:0};assert.equal(nativeNoise(n,p,0,.5)[1],0);
});
test('ocean quad maps independently to the original illustration reference',()=>{
 const sea=scene.layers.find(l=>l.name==='hai_dm'),a=sea.referenceAlignment;
 assert.ok(a.inliers>=6&&a.medianResidual<1);
 const manifest=JSON.parse(readFileSync(new URL('../public/wardrobe/illust-models.json',import.meta.url))),f=manifest['dyn_illust_437_mizuki_sale#7'].frame;
 sea.vertices.forEach((v,i)=>{assert.ok(Math.abs((v[0]-f.x)*2048/f.width-a.desiredCorners[i][0])<.001);assert.ok(Math.abs((v[1]-f.y)*2048/f.height-a.desiredCorners[i][1])<.001);});
 assert.ok(sea.vertices[0][1]<sea.originalVertices[0][1]);
});
