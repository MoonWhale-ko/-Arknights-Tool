import test from 'node:test';import assert from 'node:assert/strict';
import {shadeEffectPixel} from '../public/wardrobe/illust-effects-canvas.mjs';
test('original additive shader doubles tint and preserves straight-alpha output',()=>{
 const pixel=shadeEffectPixel([.5,.25,1,.4],1,[.5,1,0,.5]);assert.deepEqual(pixel,[.5,.5,0,.4]);
});
test('original dissolve shader rejects and reveals pixels around the saved threshold',()=>{
 assert.equal(shadeEffectPixel([1,1,1,1],.4,[.5,.5,.5,.5],.574,.386,true)[3],0);
 assert.equal(shadeEffectPixel([1,1,1,1],1,[.5,.5,.5,.5],.574,.386,true)[3],1);
 assert.ok(Math.abs(shadeEffectPixel([1,1,1,1],.767,[.5,.5,.5,.5],.574,.386,true)[3]-.5)<1e-12);
});
