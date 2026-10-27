import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {spriteContentRect} from '../public/wardrobe/original-layout.js';
const scene=JSON.parse(gunzipSync(readFileSync(new URL('../public/wardrobe/native-scene.json.gz',import.meta.url))));
test('trimmed collection logos retain their original transparent canvas rather than stretching',()=>{
 for(const group of ['2026#nian','2023#nian#2','2023#ncg']){
  const image=scene.layouts[group].find(n=>n.path==='left_up_part/icon').image;
  const c=spriteContentRect(image.sprite,Math.round(image.sprite.textureRect.width),Math.round(image.sprite.textureRect.height));
  assert.ok(c.width<80);assert.ok(c.height>99);assert.ok(c.left>10);
  assert.ok(c.left+c.width<=100.01);assert.ok(c.top+c.height<=100.01);
  assert.deepEqual(spriteContentRect(image.sprite,256,256),{left:0,top:0,width:100,height:100});
 }
});
test('preview controls follow the game canvas so they cannot create a top inset',()=>{
 const html=readFileSync(new URL('../public/wardrobe/preview.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('class="wardrobe-preview-tools"')>html.indexOf('</section>'));
 const css=readFileSync(new URL('../public/wardrobe/style.css',import.meta.url),'utf8');assert.match(css,/url\('\/wardrobe\/btn-back.png'\)/);
 const png=readFileSync(new URL('../public/wardrobe/btn-back.png',import.meta.url));assert.equal(png.readUInt32BE(16),168);assert.equal(png.readUInt32BE(20),73);
});
