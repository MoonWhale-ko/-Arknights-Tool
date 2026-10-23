import {createHash} from 'node:crypto';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {INVENTORY_KEY,readInventory,saveCount,countOf,categoryOf,tierOf,compareItems} from '../assets/js/inventory-state.mjs';
const store=initial=>{const data=new Map(Object.entries(initial));return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data}};
test('quantity edits preserve imported metadata, unknown items, operator state and latest changes',()=>{const s=store({[INVENTORY_KEY]:JSON.stringify({version:1,server:'kr',importedAt:'keep',items:{4001:120,unknown:9}}),arknightsOperatorProgressV1:'untouched'});assert.equal(countOf(readInventory(s),'4001'),120);saveCount(s,'30011','5');let latest=readInventory(s);latest.items.unknown=10;s.setItem(INVENTORY_KEY,JSON.stringify(latest));latest=saveCount(s,'30011','0');assert.equal(latest.items.unknown,10);assert.equal(latest.importedAt,'keep');assert.equal(latest.items['4001'],120);assert.equal(latest.items['30011'],0);assert.equal(s.data.get('arknightsOperatorProgressV1'),'untouched')});
test('invalid counts and malformed storage do not write',()=>{const s=store({[INVENTORY_KEY]:'broken'});assert.throws(()=>saveCount(s,'30011','5'));assert.equal(s.getItem(INVENTORY_KEY),'broken');for(const value of ['-1','1.2','','1e3','9007199254740992'])assert.throws(()=>saveCount(store({}),'30011',value));assert.throws(()=>saveCount(store({}),'__proto__','1'));assert.deepEqual(readInventory(store({})).items,{})});
test('all bundled items have matched names, safe configured image URLs and valid display groups',()=>{const items=JSON.parse(fs.readFileSync(new URL('../data/items.json',import.meta.url))).items;const images=JSON.parse(fs.readFileSync(new URL('../data/item-images.json',import.meta.url))).items;for(const item of Object.values(items)){assert.equal(images[item.id].name,item.name);const url=images[item.id].url;assert.ok(/^https:\/\/[^\s]+$/.test(url)||(/^assets\/[a-zA-Z0-9_./-]+$/.test(url)&&!url.split('/').includes('..')));if(url.startsWith('https:')){const parsed=new URL(url);assert.equal(parsed.username,'');assert.equal(parsed.password,'')}assert.ok(tierOf(item)>=1&&tierOf(item)<=5)}assert.equal(categoryOf(items['3211']),'chip');assert.equal(categoryOf(items['4001']),'currency');assert.equal(categoryOf(items['3301']),'skill')});

test('grade remains descending and similar items group only within each grade',()=>{const ids=['3213','30014','3303','3221','30011','30024','3211','30012','3301','3212','30021'];const result=ids.map(id=>({id})).sort(compareItems).map(i=>i.id);assert.deepEqual(result,['3213','30014','30024','3212','3211','3221','3301','3303','30012','30011','30021'])});

test('bundled token images match game items and verified PNG checksums',()=>{
 const sources=JSON.parse(fs.readFileSync(new URL('../data/token-image-sources.json',import.meta.url))).items;
 const images=JSON.parse(fs.readFileSync(new URL('../data/item-images.json',import.meta.url))).items;
 const tokens=JSON.parse(fs.readFileSync(new URL('../data/growth.json',import.meta.url))).tokenItems;
 assert.equal(sources.length,43);assert.equal(new Set(sources.map(item=>item.id)).size,43);
 for(const source of sources){
  assert.equal(tokens[source.id].name,source.name);assert.equal(images[source.id].name,source.name);if(images[source.id].url===source.path)assert.equal(images[source.id].framed,true);
  const png=fs.readFileSync(new URL('../'+source.path,import.meta.url));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.length,source.bytes);
  assert.equal(png.readUInt32BE(16),source.width);assert.equal(png.readUInt32BE(20),source.height);
  assert.equal(createHash('sha256').update(png).digest('hex'),source.sha256);
 }
});
