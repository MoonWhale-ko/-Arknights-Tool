import {canvasEffectMaterial} from './illust-effects-canvas.mjs?v=1';
const root='/wardrobe/effects/skadi-e2/';
const resource=async file=>{const r=await fetch(root+file);if(!r.ok)throw Error('Effect resource: '+file);return file.endsWith('.json')?r.json():r.text();};
const st=texture=>texture?[texture.scale.x,texture.scale.y,texture.offset.x,texture.offset.y]:[1,1,0,0];
const rgba=c=>[c?.r??1,c?.g??1,c?.b??1,c?.a??1];
/** Original rigid background meshes. Particle emitters remain a separate layer. */
export async function createIllustrationEffects(skin,isClosed){
 if(skin.id!=='char_1012_skadi2#2')return null;
 const P=window.PIXI,scene=await resource('scene.json'),back=new P.Container(),front=new P.Container(),textures=[],meshes=[],canvasMaterials=[];
 let closed=false,elapsed=0;
 const destroy=()=>{if(closed)return;closed=true;back.destroy({children:true});front.destroy({children:true});for(const m of canvasMaterials)m.destroy();for(const t of textures)t.destroy(true);};
 try{
  const textureCache=new Map();
  for(const layer of [...scene.layers].sort((a,b)=>a.sortingOrder-b.sortingOrder||b.depth-a.depth)){
   if(isClosed()){destroy();return null;}
   const uniforms={_MainTex_ST:st(layer.textures._MainTex),_DissolveTex_ST:st(layer.textures._DissolveTex),_TintColor:rgba(layer.colorsUniform._TintColor),_UVTween:rgba(layer.colorsUniform._UVTween),_Time:[0,0,0,0],...layer.floats};
   for(const [name,color]of Object.entries(layer.colorsUniform))uniforms[name]=rgba(color);
   for(const [name,tex]of Object.entries(layer.textures)){
    let texture=textureCache.get(tex.file);
    if(!texture){texture=P.Texture.from(root+tex.file,{resourceOptions:{crossorigin:'anonymous'},alphaMode:P.ALPHA_MODES.NO_PREMULTIPLIED_ALPHA});textures.push(texture);textureCache.set(tex.file,texture);texture.baseTexture.wrapMode=tex.wrap===0?P.WRAP_MODES.REPEAT:P.WRAP_MODES.CLAMP;
     if(!texture.baseTexture.valid)await new Promise((resolve,reject)=>{const base=texture.baseTexture,timer=setTimeout(()=>{cleanup();reject(Error('Effect texture timeout'));},12000);const cleanup=()=>{clearTimeout(timer);base.off('loaded',loaded);base.off('error',failed);};const loaded=()=>{cleanup();resolve();};const failed=()=>{cleanup();reject(Error('Effect texture failed'));};base.once('loaded',loaded);base.once('error',failed);});
    }uniforms[name]=texture;
   }
   const material=canvasEffectMaterial(P,layer,uniforms);canvasMaterials.push(material);const mesh=new P.SimpleMesh(material.texture,new Float32Array(layer.vertices.flat()),new Float32Array(layer.uv.flat()),new Uint16Array(layer.triangles.flat()));mesh.blendMode=layer.shader.name.endsWith('/Additive')?P.BLEND_MODES.ADD:P.BLEND_MODES.NORMAL;mesh.name=layer.name;(layer.depth>=0?back:front).addChild(mesh);meshes.push({mesh,layer,uniforms});
  }
  if(isClosed()){destroy();return null;}
  return {back,front,destroy,fit(v){for(const box of [back,front]){box.scale.set(v.scale);box.position.set(v.x,v.y);}},update(dt){elapsed+=dt;for(const {uniforms,layer}of meshes){uniforms._Time=[elapsed/20,elapsed,elapsed*2,elapsed*3];for(const [name,speed]of Object.entries(layer.uvScroll)){const original=layer.textures[name];uniforms[name+'_ST']=[original.scale.x,original.scale.y,original.offset.x+speed[0]*elapsed,original.offset.y+speed[1]*elapsed];}}for(const material of canvasMaterials)material.update(elapsed);}};
 }catch(e){destroy();throw e;}
}
