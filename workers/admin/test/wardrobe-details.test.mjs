import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../public/wardrobe/catalog.json',import.meta.url)));const real=data.skins.filter(s=>s.charId.startsWith('char_'));
test('all store outfits have sourced reference prices, without assigning prices to basic outfits',()=>{
 for(const s of real){if(s.basic)assert.equal(s.price,undefined,s.id);if(s.obtain==='구매센터'){assert.ok(s.price,s.id);assert.ok(Number.isFinite(s.price.amount)&&s.price.amount>=0);assert.match(s.price.source,/^https:\/\/prts\.wiki\/w\//);}}
});
test('skin details carry actual series identifiers and Korean acquisition descriptions',()=>{
 const ling=real.find(s=>s.id==='char_2023_ling@nian#9');assert.equal(ling.groupId,'2023#nian#2');assert.equal(ling.price.amount,21);assert.equal(ling.obtain,'구매센터');assert.ok(ling.description.length>10);
 const reward=real.find(s=>s.id==='char_002_amiya@winter#1');assert.equal(reward.obtain,'임무 보상');assert.equal(reward.price,undefined);
});
