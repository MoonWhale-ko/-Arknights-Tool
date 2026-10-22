import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compareDepotItems} from '../assets/js/depot-order.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/depot-order.json',import.meta.url)));
const sort=ids=>ids.map(id=>({id})).sort((a,b)=>compareDepotItems(a,b,data.sortIds)).map(x=>x.id);
test('depot follows game sortId across currencies, EXP, skill books, modules and materials',()=>{
 assert.deepEqual(sort(['30011','3301','2001','4001','30115','mod_update_token_1','2004','mod_unlock_token','3303','30165','30014','mod_update_token_2']),['4001','2004','2001','3303','3301','mod_unlock_token','mod_update_token_2','mod_update_token_1','30165','30115','30014','30011']);
});
test('material families and chip classes retain their game order',()=>{
 assert.deepEqual(sort(['30011','30024','30012','30014','30021','30013','30023','30022']),['30014','30013','30012','30011','30024','30023','30022','30021']);
 assert.deepEqual(sort(['3211','3222','3212','3223','3213','3221']),['3213','3223','3212','3222','3211','3221']);
});
test('every displayed item has a game order or explicit non-depot designation',()=>{
 const read=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name+'.json',import.meta.url)));
 const items={...read('growth').items,...read('growth').tokenItems,...read('items').items};
 for(const id of Object.keys(items)) assert.ok(Number.isFinite(data.sortIds[id])||data.unlisted.includes(id),id);
 assert.deepEqual(sort(['unknown','voucher_vigil','30011']),['30011','unknown','voucher_vigil']);
 assert.ok(compareDepotItems({id:'a'},{id:'b'},{a:-10000,b:1})>0);
});
