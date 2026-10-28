import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../public/wardrobe/catalog.json',import.meta.url)));const real=data.skins.filter(s=>s.charId.startsWith('char_'));
test('all store outfits have sourced reference prices, without assigning prices to basic outfits',()=>{
 for(const s of real){if(s.basic)assert.equal(s.price,undefined,s.id);if(s.obtain==='구매센터'){assert.ok(s.price,s.id);assert.ok(Number.isFinite(s.price.amount)&&s.price.amount>=0);assert.match(s.price.source,/^https:\/\/prts\.wiki\/w\//);}}
});
test('skin details carry actual series identifiers and Korean acquisition descriptions',()=>{
 const ling=real.find(s=>s.id==='char_2023_ling@nian#9');assert.equal(ling.groupId,'2023#nian#2');assert.equal(ling.price.amount,21);assert.equal(ling.obtain,'구매센터');assert.ok(ling.description.length>10);
 const reward=real.find(s=>s.id==='char_002_amiya@winter#1');assert.equal(reward.obtain,'임무 보상');assert.equal(reward.price,undefined);
});

import {skinSeriesCategory} from '../public/wardrobe/original-layout.js';
test('series collection requires a real game category and group membership',()=>{
 assert.equal(skinSeriesCategory(real.find(s=>s.id==='char_2023_ling#2')),null);
 assert.equal(skinSeriesCategory(real.find(s=>s.id==='char_2023_ling@nian#9')).id,'nian');
 assert.equal(skinSeriesCategory(real.find(s=>s.id==='char_2023_ling@ncg#1')).id,'crossover');
 assert.equal(skinSeriesCategory({brandId:'nian',groupId:'unknown'}),null);
});

test('historical acquisition routes retain multiple methods without duplicates or unknown skins',()=>{
 const entries=JSON.parse(readFileSync(new URL('../public/wardrobe/acquisition-routes.json',import.meta.url))).skins;
 const ids=new Set(real.map(s=>s.id));
 for(const [id,entry]of Object.entries(entries)){assert.ok(ids.has(id),id);assert.ok(entry.routes.length);assert.equal(new Set(entry.routes).size,entry.routes.length);assert.match(entry.source,/^https:\/\/prts\.wiki\/w\//);}
 assert.ok(entries['char_002_amiya@winter#1'].routes.includes('고급증명서 상점 교환'));
 assert.ok(entries['char_211_adnach@sale#5'].routes.includes('기록 복원'));
 assert.deepEqual(entries['char_437_mizuki@sale#7']?.routes??Object.entries(entries).filter(([id])=>id.startsWith('char_437_mizuki@')).map(([,v])=>v.routes).flat(),['통합 전략 보상']);
});
