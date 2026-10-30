import {createIllustrationEffects} from './illust-effects.mjs?v=9';
import {illustrationEntry,illustrationViewport} from './illust-model-map.mjs?v=2';
import {prepareSpine,loadSpine} from './sd.js?v=14';
import {specialDelay,motionNames} from './illust-timing.mjs?v=1';
const root='https://raw.githubusercontent.com/isHarryh/Ark-Models/main/models_illust/';
let manifest,active,generation=0;
let preference='dynamic';try{preference=localStorage.getItem('zootWardrobeIllustrationMode')||'dynamic';}catch{}
const button=document.createElement('button');button.type='button';button.id='wardrobeIllustrationMode';button.hidden=true;
function entryFor(s){return illustrationEntry(s,manifest);}
function updateButton(){button.hidden=!active?.entry;button.textContent=preference==='dynamic'?'Live2D':'일러스트';button.setAttribute('aria-label','표시 방식: '+button.textContent+' · 클릭하여 전환');button.setAttribute('aria-pressed',String(preference==='dynamic'));button.title='Live2D / 일러스트 전환';}
export function clearIllustration(){generation++;const a=active;if(a){a.closed=true;a.effects?.destroy();a.observer?.disconnect();a.img.removeEventListener('load',a.fit);a.img.style.visibility='';a.app?.destroy(true,{children:true,texture:true,baseTexture:true});a.box?.remove();}active=null;button.hidden=true;}
export async function showIllustration(s){
 clearIllustration();const token=generation,img=document.getElementById('wardrobeArt');if(!img)return;
 const a=active={img,skin:s,closed:false};document.getElementById('wardrobeDetail').append(button);
 try{if(!manifest){const r=await fetch('/wardrobe/illust-models.json?v=4');if(!r.ok)throw Error('manifest');manifest=await r.json();}if(token!==generation)return;a.entry=entryFor(s);updateButton();if(a.entry&&preference==='dynamic')await start(a);}catch(e){if(token===generation)console.warn('Wardrobe illustration:',e);}
}
async function start(a){
 if(a.loading||a.model||a.closed)return;a.loading=true;button.dataset.loading='true';
 try{await prepareSpine();if(a.closed)return;const model=await loadSpine(a.entry,root);if(a.closed){model.destroy({children:true,texture:true,baseTexture:true});return;}
 const names=motionNames(model.spineData.animations);if(!names.idle)throw Error('Idle animation missing');
 const box=a.box=document.createElement('div');box.className='native-live-art wardrobe-dynamic-art';box.classList.toggle('wardrobe-unowned-art',a.img.classList.contains('wardrobe-unowned-art'));a.img.after(box);
 const app=a.app=new PIXI.Application({width:1024,height:1024,backgroundAlpha:0,antialias:true,autoStart:false,resolution:1});box.append(app.view);app.ticker.maxFPS=30;app.view.setAttribute('aria-label',a.skin.operator+' Live2D');
 a.model=model;a.names=names;model.autoUpdate=false;app.stage.addChild(model);model.state.defaultMix=.3;
 // These transition mixes are stored in the original Skadi prefab.
 if(a.skin.id==='char_1012_skadi2#2')for(const [from,to]of [['Idle','Special'],['Idle','Interact'],['Special','Interact']])model.state.data.setMix(from,to,1);
 model.state.setAnimation(0,names.idle.name,true);model.update(0);const b=model.getLocalBounds();a.frame=a.entry.frame||{x:b.x,y:b.y,width:b.width,height:b.height};a.bounds=a.entry.bounds||a.frame;
 box.dataset.motion=names.idle.name;
 let elapsed=0,delay=specialDelay(true,names.idle.duration),busy=false;
 const play=clips=>{if(busy||!clips.length)return;const clip=clips[Math.floor(Math.random()*clips.length)];busy=true;box.dataset.motion=clip.name;a.effects?.setMotion(clip.name);const track=model.state.setAnimation(0,clip.name,false);model.state.addAnimation(0,names.idle.name,true,0);track.listener={complete:()=>{box.dataset.motion=names.idle.name;a.effects?.setMotion(names.idle.name);busy=false;elapsed=0;delay=specialDelay(false);}};};
 box.onclick=e=>{e.stopPropagation();play(names.interact);};
 app.ticker.add(()=>{const dt=Math.min(app.ticker.deltaMS,100)/1000;model.update(dt);a.effects?.update(dt);if(!busy&&names.special.length){elapsed+=dt;if(elapsed>=delay)play(names.special);}});
 a.fit=()=>{if(a.closed)return;box.style.cssText=a.img.style.cssText;box.style.visibility='';const w=parseFloat(a.img.style.width)||1024,h=parseFloat(a.img.style.height)||1024;const v=illustrationViewport(w,h,a.frame,a.bounds);box.style.left=((parseFloat(a.img.style.left)||0)+v.left)+'px';box.style.top=((parseFloat(a.img.style.top)||0)+v.top)+'px';box.style.width=v.width+'px';box.style.height=v.height+'px';app.renderer.resize(v.width,v.height);model.scale.set(v.scale);model.position.set(v.x,v.y);a.viewport=v;a.effects?.fit(v);app.render();};
 a.observer=new MutationObserver(a.fit);a.observer.observe(a.img,{attributes:true,attributeFilter:['style']});a.img.addEventListener('load',a.fit);a.fit();applyMode(a);if(new URLSearchParams(location.search).get('effects')!=='0')createIllustrationEffects(a.skin,()=>a.closed,model).then(effects=>{if(!effects)return;if(a.closed){effects.destroy();return;}a.effects=effects;effects.setMotion(box.dataset.motion);effects.attach(box,app.view);app.stage.addChild(effects.front);if(effects.bounds){const b=a.bounds,e=effects.bounds,x=Math.min(b.x,e.x),y=Math.min(b.y,e.y);a.bounds={x,y,width:Math.max(b.x+b.width,e.x+e.width)-x,height:Math.max(b.y+b.height,e.y+e.height)-y};}a.fit();box.dataset.effects='native-meshes';}).catch(e=>{console.warn('Illustration effects:',e);if(!a.closed){box.dataset.effects='failed';const status=document.getElementById('wardrobeArtStatus');if(status)status.textContent='배경 효과를 불러오지 못했습니다. 복장을 다시 선택해 주세요.';}});
 }catch(e){if(!a.closed){console.warn('Wardrobe illustration:',a.skin.id,e);a.failed=true;a.img.style.visibility='';a.box?.remove();a.app?.destroy(true,{children:true,texture:true,baseTexture:true});a.app=null;button.textContent='일러스트 · 재시도';}}finally{a.loading=false;delete button.dataset.loading;}
}
function applyMode(a){if(!a||a.closed)return;const dynamic=preference==='dynamic'&&!!a.model&&!a.failed;a.img.style.visibility=dynamic?'hidden':'';if(a.box)a.box.hidden=!dynamic;if(a.app)dynamic&&!document.hidden?a.app.start():a.app.stop();updateButton();}
button.onclick=()=>{if(!active)return;if(active.failed){active.failed=false;active.model=null;preference='dynamic';start(active);return;}preference=preference==='dynamic'?'static':'dynamic';try{localStorage.setItem('zootWardrobeIllustrationMode',preference);}catch{}applyMode(active);if(preference==='dynamic')start(active);};
document.addEventListener('visibilitychange',()=>applyMode(active));window.addEventListener('pagehide',clearIllustration);
export function illustrationFullscreen(){const target=active?.box&&!active.box.hidden?active.box:document.getElementById('wardrobeArt');target?.requestFullscreen?.().catch(()=>{});}
