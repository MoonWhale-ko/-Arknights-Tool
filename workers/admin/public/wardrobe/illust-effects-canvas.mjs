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
 const w=image.width,h=image.height,d=image.data,x0=repeat?(fx+w)%w:Math.max(0,Math.min(w-1,fx)),x1=repeat?(fx+1+w)%w:Math.max(0,Math.min(w-1,fx+1)),y0=repeat?(fy+h)%h:Math.max(0,Math.min(h-1,fy)),y1=repeat?(fy+1+h)%h:Math.max(0,Math.min(h-1,fy+1));
 const channels=out.length||4,a=(y0*w+x0)*4,b=(y0*w+x1)*4,c=(y1*w+x0)*4,e=(y1*w+x1)*4;
 for(let ch=0;ch<channels;ch++)out[ch]=((d[a+ch]*(1-dx)+d[b+ch]*dx)*(1-dy)+(d[c+ch]*(1-dx)+d[e+ch]*dx)*dy)/255;
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
 const limit=anchor?160:moving?256:1024;canvas.width=reference?1024:Math.min(main.width,limit);canvas.height=reference?512:Math.min(main.height,limit);
 const ctx=canvas.getContext('2d'),image=ctx.createImageData(canvas.width,canvas.height),texture=P.Texture.from(canvas),color=new Float32Array(4),noise=new Float32Array(1),clip=new Float32Array(4),uv=new Float32Array(2),alpha=vertexAlphaGrid(layer,canvas.width,canvas.height);let previous=-1;
 const update=time=>{if(previous>=0&&(!moving||time-previous<(anchor?1/20:.125)))return;previous=time;
  const mainST=uniforms._MainTex_ST,maskST=uniforms._DissolveTex_ST,tint=uniforms._TintColor;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const pixel=y*canvas.width+x;if(alpha[pixel]===0)continue;const u=(x+.5)/canvas.width,v=(y+.5)/canvas.height;let mu=u*mainST[0]+mainST[2],mv=v*mainST[1]+mainST[3];
   if(anchor){const st=uniforms._DisturTex_ST,t=uniforms._UVTween;sampleEffectImage(disturb,u*st[0]+st[2]+((time*t[2])%1+1)%1,v*st[1]+st[3]+((time*t[3])%1+1)%1,noise,true);anchorMainUV(u,v,time,noise[0],uniforms,uv);mu=uv[0];mv=uv[1];}
   sampleEffectImage(main,mu,mv,color,(layer.textures._MainTex.wrap??0)===0);
   if(mask)sampleEffectImage(mask,u*maskST[0]+maskST[2],v*maskST[1]+maskST[3],noise,(layer.textures._DissolveTex.wrap??0)===0);
   let rgba;if(anchor){const c=uniforms._MainColor,f=1+(uniforms._MainColorACtrl??0)*(c[3]-1);for(let i=0;i<4;i++)color[i]=clamp(color[i]*c[i]*2*f);rgba=color;rgba[3]=clamp(rgba[3]*(uniforms._PresentationOpacity??1));}else rgba=shadeEffectPixel(color,noise[0],tint,uniforms._Amount,uniforms._BorderWidth,!!mask);
   rgba[3]*=alpha[y*canvas.width+x];
   if(reference){const [a,b,c,d]=layer.referenceClip.corners,px=(a[0]*(1-u)+b[0]*u)*v+(c[0]*(1-u)+d[0]*u)*(1-v),py=(a[1]*(1-u)+b[1]*u)*v+(c[1]*(1-u)+d[1]*u)*(1-v);sampleEffectImage(reference,px,1-py,clip,false);rgba[3]*=clip[3];}
   const offset=(y*canvas.width+x)*4;for(let c=0;c<4;c++)image.data[offset+c]=Math.round(rgba[c]*255);
  }ctx.putImageData(image,0,0);texture.baseTexture.update();
 };
 update(0);return {texture,update,destroy(){texture.destroy(true);}};
}

// The foreground shares the character's WebGL renderer. Keep Canvas for software rendering.
export function anchorGpuMaterial(P,layer,u){
 const vertex=`precision mediump float;
 attribute vec2 aVertexPosition;attribute vec2 aTextureCoord;attribute float aVertexAlpha;
 uniform mat3 projectionMatrix;uniform mat3 translationMatrix;
 varying vec2 vUV;varying float vAlpha;
 void main(){vUV=aTextureCoord;vAlpha=aVertexAlpha;gl_Position=vec4((projectionMatrix*translationMatrix*vec3(aVertexPosition,1.0)).xy,0.0,1.0);}`;
 const fragment=`precision mediump float;
 varying vec2 vUV;varying float vAlpha;
 uniform sampler2D _MainTex;uniform sampler2D _DisturTex;
 uniform vec4 _MainTex_ST;uniform vec4 _DisturTex_ST;uniform vec4 _UVTween;uniform vec4 _MainColor;
 uniform float _AnchorU;uniform float _AnchorV;uniform float _IntensityU;uniform float _IntensityV;
 uniform float _MainColorACtrl;uniform float _PresentationOpacity;uniform float uTime;uniform float uMainRepeat;
 void main(){
 vec2 nUV=vUV*_DisturTex_ST.xy+_DisturTex_ST.zw+fract(uTime*_UVTween.zw);
 float n=texture2D(_DisturTex,vec2(fract(nUV.x),1.0-fract(nUV.y))).r;
 vec2 uv=(vUV+(vec2(n)-vec2(_AnchorU,_AnchorV))*vec2(_IntensityU,_IntensityV))*_MainTex_ST.xy+_MainTex_ST.zw+fract(uTime*_UVTween.xy);
 uv=mix(clamp(uv,0.0,1.0),fract(uv),uMainRepeat);
 vec4 c=texture2D(_MainTex,vec2(uv.x,1.0-uv.y))*_MainColor*2.0*(1.0+_MainColorACtrl*(_MainColor.a-1.0));
 c=clamp(c,0.0,1.0);c.a=clamp(c.a*_PresentationOpacity,0.0,1.0)*vAlpha;
 gl_FragColor=vec4(c.rgb*c.a,c.a);
 }`;
 const shader=P.Shader.from(vertex,fragment,{...u,uTime:0,uMainRepeat:(layer.textures._MainTex.wrap??0)===0?1:0});
 const geometry=new P.Geometry().addAttribute('aVertexPosition',new Float32Array(layer.vertices.flat()),2).addAttribute('aTextureCoord',new Float32Array(layer.uv.flat()),2).addAttribute('aVertexAlpha',new Float32Array(layer.vertexAlpha||layer.vertices.map(()=>1)),1).addIndex(new Uint16Array(layer.triangles.flat()));
 const mesh=new P.Mesh(geometry,shader);mesh.blendMode=P.BLEND_MODES.NORMAL;
 return {mesh,update(time){shader.uniforms.uTime=time;},destroy(){shader.destroy();}};
}
