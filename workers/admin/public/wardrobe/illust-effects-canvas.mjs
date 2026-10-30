const clamp=v=>Math.max(0,Math.min(1,v));
const even=v=>{const f=Math.floor(v),r=v-f;return r<.5?f:r>.5?f+1:f%2?f+1:f;};
// Original fragment equations, with RGBA8 output clamping and straight alpha.
export function shadeEffectPixel(main,mask,tint,amount=0,border=1,dissolve=false){
 const factor=dissolve?clamp((mask-amount+border*(1-even(amount+.5)))/border):1;
 return [clamp(main[0]*tint[0]*2),clamp(main[1]*tint[1]*2),clamp(main[2]*tint[2]*2),clamp(main[3]*tint[3]*2*factor)];
}
function pixels(texture){const source=texture.baseTexture.resource.source,canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);return {width:canvas.width,height:canvas.height,data:ctx.getImageData(0,0,canvas.width,canvas.height).data};}
function sample(image,u,v,out){
 u=((u%1)+1)%1;v=((v%1)+1)%1;const x=u*image.width-.5,y=(1-v)*image.height-.5,fx=Math.floor(x),fy=Math.floor(y),dx=x-fx,dy=y-fy;
 const at=(x,y,c)=>image.data[(((y+image.height)%image.height)*image.width+(x+image.width)%image.width)*4+c]/255;
 for(let c=0;c<4;c++)out[c]=(at(fx,fy,c)*(1-dx)+at(fx+1,fy,c)*dx)*(1-dy)+(at(fx,fy+1,c)*(1-dx)+at(fx+1,fy+1,c)*dx)*dy;
}
export function canvasEffectMaterial(P,layer,uniforms){
 const main=pixels(uniforms._MainTex),mask=uniforms._DissolveTex?pixels(uniforms._DissolveTex):null,canvas=document.createElement('canvas');const limit=layer.shader.name.endsWith('UVTween')||mask||Object.values(layer.uvScroll||{}).some(speed=>speed.some(v=>v!==0))?256:1024;canvas.width=Math.min(main.width,limit);canvas.height=Math.min(main.height,limit);const ctx=canvas.getContext('2d'),image=ctx.createImageData(canvas.width,canvas.height),texture=P.Texture.from(canvas),color=new Float32Array(4),noise=new Float32Array(4);let previous=-1;const moving=layer.shader.name.endsWith('UVTween')||!!mask||Object.values(layer.uvScroll||{}).some(speed=>speed.some(v=>v!==0));
 const update=time=>{if(previous>=0&&(!moving||time-previous<.125))return;previous=time;
  const mainST=uniforms._MainTex_ST,maskST=uniforms._DissolveTex_ST,tint=uniforms._TintColor;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const u=(x+.5)/canvas.width,v=(y+.5)/canvas.height;sample(main,u*mainST[0]+mainST[2],v*mainST[1]+mainST[3],color);if(mask)sample(mask,u*maskST[0]+maskST[2],v*maskST[1]+maskST[3],noise);
   const rgba=shadeEffectPixel(color,noise[0],tint,uniforms._Amount,uniforms._BorderWidth,!!mask),offset=(y*canvas.width+x)*4;for(let c=0;c<4;c++)image.data[offset+c]=Math.round(rgba[c]*255);
  }ctx.putImageData(image,0,0);texture.baseTexture.update();
 };
 update(0);return {texture,update,destroy(){texture.destroy(true);}};
}
