import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {illustrationEntry,decodeSpineModel,illustrationViewport} from '../public/wardrobe/illust-model-map.mjs';
const manifest=JSON.parse(await readFile(new URL('../public/wardrobe/illust-models.json',import.meta.url)));
const skins=JSON.parse(await readFile(new URL('../public/wardrobe/catalog.json',import.meta.url))).skins;
test('all 96 resources are registered and 92 map to existing wardrobe outfits',()=>{
 assert.equal(Object.keys(manifest).length,96);assert.equal(Object.values(manifest).filter(e=>e.format==='json').length,4);
 assert.equal(skins.filter(s=>illustrationEntry(s,manifest)).length,92);
 assert.ok(illustrationEntry(skins.find(s=>s.id==='char_4087_ines@ambienceSynesthesia#5'),manifest));
 assert.equal(illustrationEntry(skins.find(s=>s.id==='char_2023_ling#1'),manifest),null);
});
test('extensionless JSON and binary models select their proper parsers',()=>{
 const json=new TextEncoder().encode(' {"skeleton":{"spine":"3.8.99"}}');
 assert.equal(decodeSpineModel(json.buffer).format,'json');assert.equal(decodeSpineModel(json.buffer,'json').data.skeleton.spine,'3.8.99');
 const bytes=new Uint8Array([0,1,2]);assert.equal(decodeSpineModel(bytes.buffer).format,'binary');
});

test('large special motions expand the surface without shrinking the initial pose',()=>{
 const frame={x:-100,y:-200,width:200,height:200},bounds={x:-300,y:-400,width:600,height:600};
 const original=illustrationViewport(400,400,frame),expanded=illustrationViewport(400,400,frame,bounds);
 assert.equal(expanded.scale,original.scale);
 assert.equal(expanded.x+expanded.left,original.x);assert.equal(expanded.y+expanded.top,original.y);
 assert.ok(expanded.x+bounds.x*expanded.scale>=0);assert.ok(expanded.x+(bounds.x+bounds.width)*expanded.scale<=expanded.width);
});
