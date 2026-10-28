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

test('acquisition routes are Korean-only and retain distinct verified methods',()=>{
 const data=JSON.parse(readFileSync(new URL('../public/wardrobe/acquisition-routes.json',import.meta.url)));
 assert.equal(data.sourceRegion,'KR');const ids=new Set(real.map(s=>s.id));
 for(const [id,entry]of Object.entries(data.skins)){assert.ok(ids.has(id),id);assert.ok(entry.routes.length);assert.equal(new Set(entry.routes).size,entry.routes.length);assert.match(entry.source,/^https:\/\//);}
 assert.deepEqual(data.skins['char_293_thorns@it#1'].routes,['구매센터','교환 코드 획득']);
 assert.equal(data.skins['char_002_amiya@winter#1'],undefined);
});
