import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{graphicFor,nativeTextLayout,ownsAnyMedal,windowRange}from'../public/medals/native-presentation.mjs';
import{medalState}from'../public/medals/model.mjs';import{sampleClip,resolveLayout}from'../public/medals/native-layout-engine.mjs';
const json=async p=>JSON.parse(await readFile(new URL('../public/medals/'+p,import.meta.url)));
const measure=(s,size)=>[...s].reduce((w,c)=>w+(c.charCodeAt(0)>127?1:.55)*size,0);
test('dynamic logo inherits the graphic alpha rather than becoming an opaque foreground',async()=>{
 const source=await json('native-scene.json'),dynamic=await json('native-dynamic.json');
 for(const id of[3174,2162,3038]){const n=source.scenes['medal_page-1969'].find(n=>n.id===id),v=graphicFor(n,dynamic);assert.ok(v.image?.file);assert.ok(Math.abs(v.color.a-.06)<1e-6);}
});
test('source BestFit and nowrap settings fit collection captions without losing characters',async()=>{
 const source=await json('native-scene.json');
 for(const id of[2277,2732,2788,3403]){
  const n=source.scenes['medal_page-1969'].find(n=>n.id===id),font=n.components.find(c=>c.font).font,text=id===2277||id===2732?'총 수집 개수':'확인된 모든 훈장이 수록되어 있습니다';
  const r=nativeTextLayout(text,font,n.size.x,n.size.y,measure);assert.ok(r.fits,'text '+id);assert.equal(r.lines.join(''),text);assert.equal(r.lines.length,1);assert.ok(r.fontSize<=font.m_FontSize);
 }
});
test('MultilineBestFit keeps long collection descriptions inside the source text rectangle',async()=>{
 const source=await json('native-scene.json'),n=source.scenes['medal_group_obj-3733'].find(n=>n.name==='desc'),font=n.components.find(c=>c.font).font;
 const text='탐구한 모든 기록을 남긴 훈장 세트입니다.\n긴 설명과 다음 줄의 내용도 원본 패널의 높이 안에 표시되어야 합니다.';
 const r=nativeTextLayout(text,font,n.size.x,n.size.y,measure,true);assert.ok(r.fits);assert.equal(r.lines.join(''),text.replaceAll('\n',''));
});
test('summary initial animation changes only the native state, not other same-named nodes',async()=>{
 const source=await json('native-scene.json'),clips=await json('native-animations.json'),nodes=source.scenes['medal_page-1969'];
 const a=sampleClip(nodes,clips.medal_progress_switch,0,'medal_page/state_engine/medal_list_state');
 assert.equal(a.find(n=>n.id===1334).position.x,90);assert.equal(a.find(n=>n.id===2821).position.x,-306);assert.equal(a.find(n=>n.id===3581).active,false);
 assert.equal(a.find(n=>n.id===3147).active,nodes.find(n=>n.id===3147).active);assert.deepEqual(a.find(n=>n.id===2608),nodes.find(n=>n.id===2608));
});
test('unearned groups remain locked; advanced acquisition also unlocks their original background',()=>{
 const medals=[{id:'a',advanced:'a_advanced'},{id:'b'}];
 assert.equal(ownsAnyMedal(medals,null,medalState),false);assert.equal(ownsAnyMedal(medals,{a:{fts:0}},medalState),false);assert.equal(ownsAnyMedal(medals,{a_advanced:{fts:123}},medalState),true);
});
test('virtual rows retain full list height while changing the mounted range at top and bottom',()=>{
 const first=windowRange(0,715,144,1000),last=windowRange(144000-715,715,144,1000);
 assert.equal(first.height,144000);assert.equal(last.height,first.height);assert.equal(first.first,0);assert.equal(last.last,1000);assert.ok(first.last<20&&last.last-last.first<20);
});
test('expiry switch uses recovered sprites and bounds rather than a text check glyph',async()=>{
 const controls=await json('native-controls.json'),nodes=controls.scenes['medal_hide_expire_switch-3003'];assert.equal(controls.source.rootPathID,3003);
 for(const name of['img_select','img_unselect']){const n=nodes.find(n=>n.name===name);assert.deepEqual(n.size,{x:30,y:30});const image=n.components.find(c=>c.image).image,bytes=await readFile(new URL('../public/medals/native/'+image.file,import.meta.url));assert.equal(bytes.readUInt32BE(16),30);assert.equal(bytes.readUInt32BE(20),30);}
 const r=resolveLayout(nodes,{w:100,h:100});assert.equal(r.get(2455).rect.w,30);assert.equal(r.get(2159).rect.h,30);
});
