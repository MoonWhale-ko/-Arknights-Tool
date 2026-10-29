import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeBlurConfig,roundToEven,downsampleNative,blurNativePass,blurNative} from '../public/medals/native-blur-kernel.mjs';
test('resolution drives native strength, half size and three two-axis passes',()=>{
 assert.deepEqual(nativeBlurConfig(1920,1080),{width:960,height:540,blurSize:4,iterations:3,steps:[2,3,4]});
 assert.equal(nativeBlurConfig(1080,1920).blurSize,4);assert.equal(nativeBlurConfig(3840,2160).blurSize,8);
 assert.equal(nativeBlurConfig(960,540).blurSize,2);assert.equal(nativeBlurConfig(240,135).blurSize,1);
 assert.deepEqual([.5,1.5,2.5,3.5].map(roundToEven),[0,2,2,4]);assert.throws(()=>nativeBlurConfig(1,800),RangeError);
});
test('pass 0 averages four source texels and keeps half resolution',()=>{
 const image=new Uint8ClampedArray([0,0,0,255,100,0,0,255,0,100,0,255,100,100,200,255]);
 assert.deepEqual([...downsampleNative(image,2,2)],[50,50,50,255]);
});
test('impulse recovers seven source weights and center-only alpha',()=>{
 const pixels=new Uint8ClampedArray(41*4);pixels[80]=pixels[81]=pixels[82]=255;pixels[83]=177;
 const result=blurNativePass(pixels,41,1,2,false);
 assert.deepEqual([14,16,18,20,22,24,26].map(x=>result[x*4]),[5,22,59,83,59,22,5]);
 assert.equal(result[83],177);assert.equal(result[18*4+3],0);assert.equal(result[19*4],0);
});
test('fractional tap offsets use linear sampling and clamp at edges',()=>{
 const pixels=new Uint8ClampedArray([0,0,0,255,100,100,100,255,200,200,200,255]);
 const result=blurNativePass(pixels,3,1,.5,false);
 assert.equal(result[4],100);assert.equal(result[0],23);assert.equal(result[8],177);
});
test('pipeline preserves uniform image including borders, odd sizes and alpha',()=>{
 const image=new Uint8ClampedArray(17*13*4);for(let i=0;i<image.length;i+=4)image.set([40,100,180,255],i);
 const result=blurNative(image,17,13);assert.equal(result.width,8);assert.equal(result.height,6);
 for(let i=0;i<result.pixels.length;i+=4)assert.deepEqual([...result.pixels.slice(i,i+4)],[40,100,180,255]);
});
test('three iterations spread an impulse on both axes and preserve symmetry',()=>{
 const image=new Uint8ClampedArray(96*96*4);for(let i=3;i<image.length;i+=4)image[i]=255;
 for(let y=40;y<56;y++)for(let x=40;x<56;x++)image[(y*96+x)*4]=255;
 const {pixels,width,height}=blurNative(image,96,96);assert.equal(width,48);assert.equal(height,48);
 assert.ok(pixels[(23*48+23)*4]>0&&pixels[(23*48+23)*4]<255);
 for(let y=0;y<48;y++)for(let x=0;x<48;x++)assert.equal(pixels[(y*48+x)*4],pixels[(y*48+47-x)*4]);
});
