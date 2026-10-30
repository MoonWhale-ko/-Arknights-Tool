import {createNativeEmitter} from './illust-particles.mjs?v=2';
import {applyBoneFollower,effectIsBehind} from './illust-effects-transform.mjs?v=2';
import {canvasEffectMaterial} from './illust-effects-canvas.mjs?v=2';
const profiles={
 'char_1012_skadi2#2':'skadi-e2',
 'char_437_mizuki@sale#7':'mizuki-sale7',
 'char_391_rosmon#2':'rosmon-e2',
};
const resource=async (root,file)=>{const r=await fetch(root+file);if(!r.ok)throw Error('Effect resource: '+file);return file.split('?')[0].endsWith('.json')?r.json():r.text();};
const st=texture=>texture?[texture.scale.x,texture.scale.y,texture.offset.x,texture.offset.y]:[1,1,0,0];
const rgba=c=>[c?.r??1,c?.g??1,c?.b??1,c?.a??1];
/** Original rigid background meshes. Particle emitters remain a separate layer. */
export async function createIllustrationEffects(skin,isClosed,model){
 const profile=profiles[skin.id];if(!profile)return null;
 const root=new URL('./effects/'+profile+'/',import.meta.url).href;
 const P=window.PIXI,scene=await resource(root,'scene.json?v=4'),back=new P.Container(),front=new P.Container(),textures=[],meshes=[],canvasMaterials=[],emitters=[];
 let closed=false,elapsed=0,backgroundRenderer=null;
 const renderBackground=()=>{if(backgroundRenderer)backgroundRenderer.render(back);};
 const destroy=()=>{if(closed)return;closed=true;backgroundRenderer?.destroy(true);backgroundRenderer=null;back.destroy({children:true});front.destroy({children:true});for(const m of canvasMaterials)m.destroy();for(const t of textures)t.destroy(true);};
 try{
  const textureCache=new Map();
  const particleLayers=(scene.emitters||[]).map(e=>({name:e.name,emitter:e,sortingOrder:e.sortingOrder,depth:e.depth,shader:{name:'Torappu/Particles-L2D/Additive'},textures:{_MainTex:{file:e.texture,scale:{x:e.textureST[0],y:e.textureST[1]},offset:{x:e.textureST[2],y:e.textureST[3]},wrap:1}},colorsUniform:{_TintColor:e.tint},floats:{},uvScroll:{}}));
  for(const layer of [...scene.layers,...particleLayers].sort((a,b)=>a.sortingOrder-b.sortingOrder||b.depth-a.depth)){
   if(isClosed()){destroy();return null;}
   const uniforms={_MainTex_ST:st(layer.textures._MainTex),_DissolveTex_ST:st(layer.textures._DissolveTex),_TintColor:rgba(layer.colorsUniform._TintColor),_UVTween:rgba(layer.colorsUniform._UVTween),_Time:[0,0,0,0],...layer.floats};
   for(const [name,color]of Object.entries(layer.colorsUniform))uniforms[name]=rgba(color);
   uniforms._TintColor=uniforms._TintColor.map((v,i)=>v*(layer.vertexTint?.[i]??1));
   for(const [name,tex]of Object.entries(layer.textures)){
    let texture=textureCache.get(tex.file);
    if(!texture){texture=P.Texture.from(root+tex.file,{resourceOptions:{crossorigin:'anonymous'},alphaMode:P.ALPHA_MODES.NO_PREMULTIPLIED_ALPHA});textures.push(texture);textureCache.set(tex.file,texture);texture.baseTexture.wrapMode=tex.wrap===0?P.WRAP_MODES.REPEAT:P.WRAP_MODES.CLAMP;
     if(!texture.baseTexture.valid)await new Promise((resolve,reject)=>{const base=texture.baseTexture,timer=setTimeout(()=>{cleanup();reject(Error('Effect texture timeout'));},12000);const cleanup=()=>{clearTimeout(timer);base.off('loaded',loaded);base.off('error',failed);};const loaded=()=>{cleanup();resolve();};const failed=()=>{cleanup();reject(Error('Effect texture failed'));};base.once('loaded',loaded);base.once('error',failed);});
    }uniforms[name]=texture;
   }
   const material=canvasEffectMaterial(P,layer,uniforms);canvasMaterials.push(material);if(layer.emitter){const emitter=createNativeEmitter(P,layer.emitter,material.texture);(effectIsBehind(layer,scene.spineSortingOrder)?back:front).addChild(emitter.box);emitter.source=layer.emitter;emitter.bone=layer.emitter.bone?model?.skeleton.findBone(layer.emitter.bone.boneName):null;if(layer.emitter.bone){emitter.box.visible=!!emitter.bone;if(emitter.bone)applyBoneFollower(emitter.box,emitter.bone,layer.emitter.bone,model.skeleton);}emitters.push(emitter);continue;}const mesh=new P.SimpleMesh(material.texture,new Float32Array(layer.vertices.flat()),new Float32Array(layer.uv.flat()),new Uint16Array(layer.triangles.flat()));mesh.blendMode=(layer.shader.name.endsWith('/Additive')||layer.shader.name.includes('Dissolve Add'))?P.BLEND_MODES.ADD:P.BLEND_MODES.NORMAL;mesh.name=layer.name;(effectIsBehind(layer,scene.spineSortingOrder)?back:front).addChild(mesh);meshes.push({mesh,layer,uniforms,bone:layer.bone?model?.skeleton.findBone(layer.bone.boneName):null});
  }
  if(isClosed()){destroy();return null;}
  for(const item of meshes)if(item.layer.bone){item.mesh.visible=!!item.bone;if(item.bone)applyBoneFollower(item.mesh,item.bone,item.layer.bone,model.skeleton);}
  const points=scene.layers.filter(layer=>!layer.bone).flatMap(layer=>layer.vertices),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const bounds=points.length?{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)}:null;
  return {back,front,bounds,destroy,setMotion(name){const action=/^special/i.test(name)?'special':/^interact/i.test(name)?'interact':null;for(const emitter of emitters)if(emitter.source.action)emitter.setPlaying(emitter.source.action===action);},attach(box,characterCanvas){
   if(!back.children.length)return;
   backgroundRenderer=new P.CanvasRenderer({width:1,height:1,backgroundAlpha:0,resolution:1,antialias:true});
   const canvas=backgroundRenderer.view;canvas.setAttribute('aria-hidden','true');canvas.dataset.illustrationBackground=profile;
   Object.assign(canvas.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'0'});
   Object.assign(characterCanvas.style,{position:'relative',zIndex:'1'});box.prepend(canvas);
  },fit(v){for(const box of [back,front]){box.scale.set(v.scale);box.position.set(v.x,v.y);}if(backgroundRenderer){backgroundRenderer.resize(v.width,v.height);renderBackground();}},update(dt){elapsed+=dt;for(const emitter of emitters){if(emitter.source.bone&&emitter.bone)applyBoneFollower(emitter.box,emitter.bone,emitter.source.bone,model.skeleton);emitter.update(dt);}for(const {uniforms,layer,mesh,bone}of meshes){if(layer.bone){mesh.visible=!!bone;if(bone)applyBoneFollower(mesh,bone,layer.bone,model.skeleton);}uniforms._Time=[elapsed/20,elapsed,elapsed*2,elapsed*3];for(const name of Object.keys(layer.textures)){const original=layer.textures[name],speed=layer.uvScroll[name]||[0,0],tween=layer.shader.name.endsWith('UVTween')?uniforms._UVTween:[0,0,0,0],i=name==='_DissolveTex'?2:0;uniforms[name+'_ST']=[original.scale.x,original.scale.y,original.offset.x+(speed[0]+tween[i])*elapsed,original.offset.y+(speed[1]+tween[i+1])*elapsed];}}for(const material of canvasMaterials)material.update(elapsed);renderBackground();}};
 }catch(e){destroy();throw e;}
}
