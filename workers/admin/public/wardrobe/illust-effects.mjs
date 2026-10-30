const root='/wardrobe/effects/skadi-e2/';
const resource=async file=>{const r=await fetch(root+file);if(!r.ok)throw Error('Effect resource: '+file);return file.endsWith('.json')?r.json():r.text();};
const st=texture=>texture?[texture.scale.x,texture.scale.y,texture.offset.x,texture.offset.y]:[1,1,0,0];
const rgba=c=>[c?.r??1,c?.g??1,c?.b??1,c?.a??1];
function vertex(fragment){
 const varyings=[...fragment.matchAll(/^varying\s+(?:(?:lowp|mediump|highp)\s+)?(\w+)\s+(\w+);/gm)];
 const declarations=varyings.map(match=>match[0]).join('\n');
 const assign=varyings.map(([,type,name])=>`${name}=${name==='vs_COLOR0'?'aColor*_TintColor':name==='vs_TEXCOORD1'?'_Time.yyyy*_UVTween':type==='vec4'?'vec4(aTextureCoord*_MainTex_ST.xy+_MainTex_ST.zw,aTextureCoord*_DissolveTex_ST.xy+_DissolveTex_ST.zw)':'aTextureCoord*_MainTex_ST.xy+_MainTex_ST.zw'};`).join('\n');
 return `precision highp float;attribute vec2 aVertexPosition;attribute vec2 aTextureCoord;attribute vec4 aColor;uniform mat3 projectionMatrix;uniform mat3 translationMatrix;uniform vec4 _MainTex_ST;uniform vec4 _DissolveTex_ST;uniform vec4 _TintColor;uniform vec4 _UVTween;uniform vec4 _Time;${declarations}\nvoid main(){gl_Position=vec4((projectionMatrix*translationMatrix*vec3(aVertexPosition,1.0)).xy,0.0,1.0);${assign}}`;
}
/** Original rigid background meshes. Particle emitters remain a separate layer. */
export async function createIllustrationEffects(skin,isClosed){
 if(skin.id!=='char_1012_skadi2#2')return null;
 const P=window.PIXI,scene=await resource('scene.json'),back=new P.Container(),front=new P.Container(),textures=[],meshes=[];
 let closed=false,elapsed=0;
 const destroy=()=>{if(closed)return;closed=true;back.destroy({children:true});front.destroy({children:true});for(const t of textures)t.destroy(true);};
 try{
  const textureCache=new Map(),fragments=new Map();
  for(const layer of [...scene.layers].sort((a,b)=>a.sortingOrder-b.sortingOrder||b.depth-a.depth)){
   if(isClosed()){destroy();return null;}
   let fragment=fragments.get(layer.shader.file);if(!fragment){fragment=await resource(layer.shader.file);fragments.set(layer.shader.file,fragment);}
   const uniforms={_MainTex_ST:st(layer.textures._MainTex),_DissolveTex_ST:st(layer.textures._DissolveTex),_TintColor:rgba(layer.colorsUniform._TintColor),_UVTween:rgba(layer.colorsUniform._UVTween),_Time:[0,0,0,0],...layer.floats};
   for(const [name,color]of Object.entries(layer.colorsUniform))uniforms[name]=rgba(color);
   for(const [name,tex]of Object.entries(layer.textures)){
    let texture=textureCache.get(tex.file);
    if(!texture){texture=P.Texture.from(root+tex.file,{resourceOptions:{crossorigin:'anonymous'},alphaMode:P.ALPHA_MODES.NO_PREMULTIPLIED_ALPHA});textures.push(texture);textureCache.set(tex.file,texture);texture.baseTexture.wrapMode=tex.wrap===0?P.WRAP_MODES.REPEAT:P.WRAP_MODES.CLAMP;
     if(!texture.baseTexture.valid)await new Promise((resolve,reject)=>{const base=texture.baseTexture,timer=setTimeout(()=>{cleanup();reject(Error('Effect texture timeout'));},12000);const cleanup=()=>{clearTimeout(timer);base.off('loaded',loaded);base.off('error',failed);};const loaded=()=>{cleanup();resolve();};const failed=()=>{cleanup();reject(Error('Effect texture failed'));};base.once('loaded',loaded);base.once('error',failed);});
    }uniforms[name]=texture;
   }
   const geometry=new P.Geometry().addAttribute('aVertexPosition',new Float32Array(layer.vertices.flat()),2).addAttribute('aTextureCoord',new Float32Array(layer.uv.flat()),2).addAttribute('aColor',new Float32Array(layer.colors.flat()),4).addIndex(layer.triangles.flat());
   const shader=P.Shader.from(vertex(fragment),fragment,uniforms),state=P.State.for2d();state.blendMode=layer.shader.name.endsWith('/Additive')?P.BLEND_MODES.ADD:P.BLEND_MODES.NORMAL;
   const mesh=new P.Mesh(geometry,shader,state);mesh.name=layer.name;(layer.depth>=0?back:front).addChild(mesh);meshes.push({mesh,layer,uniforms});
  }
  if(isClosed()){destroy();return null;}
  return {back,front,destroy,fit(v){for(const box of [back,front]){box.scale.set(v.scale);box.position.set(v.x,v.y);}},update(dt){elapsed+=dt;for(const {uniforms,layer}of meshes){uniforms._Time=[elapsed/20,elapsed,elapsed*2,elapsed*3];for(const [name,speed]of Object.entries(layer.uvScroll)){const original=layer.textures[name];uniforms[name+'_ST']=[original.scale.x,original.scale.y,original.offset.x+speed[0]*elapsed,original.offset.y+speed[1]*elapsed];}}}};
 }catch(e){destroy();throw e;}
}
