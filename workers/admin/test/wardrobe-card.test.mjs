import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
const data=JSON.parse(gunzipSync(readFileSync(new URL('../public/wardrobe/native-scene.json.gz',import.meta.url))));
test('native selection card retains the original portrait, reflection, mask, logo and title rectangles',()=>{
 const n=data.cardNodes;assert.equal(data.cardSize.x,154.39999);assert.equal(data.cardSize.y,394);
 assert.equal(n['/content/back_image'].rect[3],314.79999);assert.equal(n['/content/back_image_2'].scale.y,-1);
 assert.ok(Math.abs(n['/content/back_image_2'].rect[1]-314.8)<.01);
 assert.equal(n['/content/mask_image'].rect[3],244);assert.equal(n['/content/alpha_part/icon'].rect[2],128);
 assert.equal(n['/content/alpha_part/const_text'].rect[2],145.5);
});
test('skin release dates distinguish chronological selection order',()=>{
 assert.ok(data.skins['char_2023_ling@nian#9'].released<data.skins['char_2023_ling@ncg#1'].released);
 assert.ok(data.skins['char_2023_ling@ncg#1'].released<data.skins['char_2023_ling@nian#12'].released);
});
