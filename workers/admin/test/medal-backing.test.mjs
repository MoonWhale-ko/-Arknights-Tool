import test from 'node:test';
import assert from 'node:assert/strict';
import {medalOutline} from '../public/medals/medal-backing.mjs';
test('backing follows opaque bounds and object-fit letterboxing of a non-square medal',()=>{
 const pixels=new Uint8ClampedArray(4*6*4);
 for(let y=1;y<5;y++)for(let x=1;x<3;x++)pixels[(y*4+x)*4+3]=255;
 assert.equal(medalOutline(pixels,4,6),'polygon(50.000% 16.667%,66.667% 33.333%,66.667% 66.667%,50.000% 83.333%,33.333% 66.667%,33.333% 33.333%)');
});
test('transparent textures do not receive an invented backing shape',()=>{assert.equal(medalOutline(new Uint8ClampedArray(16),2,2),null);});
