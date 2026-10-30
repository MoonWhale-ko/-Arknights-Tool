const clamp=v=>Math.max(0,Math.min(1,v));
const even=v=>{const f=Math.floor(v),r=v-f;return r<.5?f:r>.5?f+1:f%2?f+1:f;};
// Original fragment equations, with RGBA8 output clamping and straight alpha.
export function shadeEffectPixel(main,mask,tint,amount=0,border=1,dissolve=false){
 const factor=dissolve?clamp((mask-amount+border*(1-even(amount+.5)))/border):1;
 return [clamp(main[0]*tint[0]*2),clamp(main[1]*tint[1]*2),clamp(main[2]*tint[2]*2),clamp(main[3]*tint[3]*2*factor)];
}
function pixels(texture){const source=texture.baseTexture.resource.source,canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);return {width:canvas.width,height:canvas.height,data:ctx.getImageData(0,0,canvas.width,canvas.height).data};}
export function sampleEffectImage(image,u,v,out,repeat=true){
 u=repeat?((u%1)+1)%1:clamp(u);v=repeat?((v%1)+1)%1:clamp(v);const x=u*image.width-.5,y=(1-v)*image.height-.5,fx=Math.floor(x),fy=Math.floor(y),dx=x-fx,dy=y-fy;
 const at=(x,y,c)=>{x=repeat?(x+image.width)%image.width:Math.max(0,Math.min(image.width-1,x));y=repeat?(y+image.height)%image.height:Math.max(0,Math.min(image.height-1,y));return image.data[(y*image.width+x)*4+c]/255;};
 for(let c=0;c<4;c++)out[c]=(at(fx,fy,c)*(1-dx)+at(fx+1,fy,c)*dx)*(1-dy)+(at(fx,fy+1,c)*(1-dx)+at(fx+1,fy+1,c)*dx)*dy;
}
export function anchorMainUV(u,v,time,noise,uniforms,out=[0,0]){
 const t=uniforms._UVTween,s=uniforms._MainTex_ST;
 out[0]=(u+(noise-uniforms._AnchorU)*uniforms._IntensityU)*s[0]+s[2]+((time*t[0])%1+1)%1;
 out[1]=(v+(noise-uniforms._AnchorV)*uniforms._IntensityV)*s[1]+s[3]+((time*t[1])%1+1)%1;return out;
}
export function vertexAlphaGrid(layer,width,height){
 const out=new Float32Array(width*height);if(!layer.vertexAlpha){out.fill(1);return out;}
 for(const indices of layer.triangles){const [i,j,k]=indices,[a,b,c]=indices.map(n=>layer.uv[n]);const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-10)continue;
 const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0])*width)),maxX=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0])*width));
 const minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1])*height)),maxY=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])*height));
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const u=(x+.5)/width,v=(y+.5)/height,w0=((b[1]-c[1])*(u-c[0])+(c[0]-b[0])*(v-c[1]))/den,w1=((c[1]-a[1])*(u-c[0])+(a[0]-c[0])*(v-c[1]))/den,w2=1-w0-w1;if(Math.min(w0,w1,w2)>=-1e-6)out[y*width+x]=w0*layer.vertexAlpha[i]+w1*layer.vertexAlpha[j]+w2*layer.vertexAlpha[k];}
 }return out;
}
export function canvasEffectMaterial(P,layer,uniforms){
 const main=pixels(uniforms._MainTex),mask=uniforms._DissolveTex?pixels(uniforms._DissolveTex):null,disturb=uniforms._DisturTex?pixels(uniforms._DisturTex):null,reference=uniforms._ReferenceMask?pixels(uniforms._ReferenceMask):null;
 const anchor=layer.shader.name.includes('Disturb Anchor'),moving=anchor||layer.shader.name.endsWith('UVTween')||!!mask||Object.values(layer.uvScroll||{}).some(speed=>speed.some(v=>v!==0)),canvas=document.createElement('canvas');
 const limit=moving?256:1024;canvas.width=reference?1024:Math.min(main.width,limit);canvas.height=reference?512:Math.min(main.height,limit);
 const ctx=canvas.getContext('2d'),image=ctx.createImageData(canvas.width,canvas.height),texture=P.Texture.from(canvas),color=new Float32Array(4),noise=new Float32Array(4),clip=new Float32Array(4),uv=new Float32Array(2),alpha=vertexAlphaGrid(layer,canvas.width,canvas.height);let previous=-1;
 const update=time=>{if(previous>=0&&(!moving||time-previous<(anchor?1/20:.125)))return;previous=time;
  const mainST=uniforms._MainTex_ST,maskST=uniforms._DissolveTex_ST,tint=uniforms._TintColor;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const u=(x+.5)/canvas.width,v=(y+.5)/canvas.height;let mu=u*mainST[0]+mainST[2],mv=v*mainST[1]+mainST[3];
   if(anchor){const st=uniforms._DisturTex_ST,t=uniforms._UVTween;sampleEffectImage(disturb,u*st[0]+st[2]+((time*t[2])%1+1)%1,v*st[1]+st[3]+((time*t[3])%1+1)%1,noise,true);anchorMainUV(u,v,time,noise[0],uniforms,uv);mu=uv[0];mv=uv[1];}
   sampleEffectImage(main,mu,mv,color,(layer.textures._MainTex.wrap??0)===0);
   if(mask)sampleEffectImage(mask,u*maskST[0]+maskST[2],v*maskST[1]+maskST[3],noise,(layer.textures._DissolveTex.wrap??0)===0);
   let rgba;if(anchor){const c=uniforms._MainColor,f=1+(uniforms._MainColorACtrl??0)*(c[3]-1);rgba=color.map((n,i)=>clamp(n*c[i]*2*f));}else rgba=shadeEffectPixel(color,noise[0],tint,uniforms._Amount,uniforms._BorderWidth,!!mask);
   rgba[3]*=alpha[y*canvas.width+x];
   if(reference){const [a,b,c,d]=layer.referenceClip.corners,px=(a[0]*(1-u)+b[0]*u)*v+(c[0]*(1-u)+d[0]*u)*(1-v),py=(a[1]*(1-u)+b[1]*u)*v+(c[1]*(1-u)+d[1]*u)*(1-v);sampleEffectImage(reference,px,1-py,clip,false);rgba[3]*=clip[3];}
   const offset=(y*canvas.width+x)*4;for(let c=0;c<4;c++)image.data[offset+c]=Math.round(rgba[c]*255);
  }ctx.putImageData(image,0,0);texture.baseTexture.update();
 };
 update(0);return {texture,update,destroy(){texture.destroy(true);}};
}
