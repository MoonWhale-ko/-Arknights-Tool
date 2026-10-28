import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionOriginiteCost} from '../public/wardrobe/collection-cost.mjs';
test('reference total includes owned paid outfits once and excludes free, cash and unowned outfits',()=>{
 const item=(id,currency,amount,extra={})=>({id,price:{currency,amount},...extra});
 const catalog=[item('a','순오리지늄',18),item('a','순오리지늄',18),item('b','순오리지늄',24),item('c','순오리지늄',0),item('d','KRW',19000),item('e','순오리지늄',21,{basic:true}),item('f','순오리지늄',15),item('g','이벤트 재화',18)];
 assert.deepEqual(collectionOriginiteCost(catalog,new Set(['a','b','c','d','e','g'])),{total:42,count:2});
 assert.deepEqual(collectionOriginiteCost(catalog,null),{total:0,count:0});
});
