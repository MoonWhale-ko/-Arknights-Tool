// Static PNGs have different trim/size from the Unity illustration prefab.
// Calibrated against the five supplied 1280x720 in-game screenshots; not AB coordinates.
const referenceArts={"illust_char_2023_ling_1":[0.348239,33.17,-24.38],"illust_char_2023_ling_2":[0.316717,11.58,26.42],"illust_char_2023_ling_nian#12":[0.278246,72.01,-12.87],"illust_char_2023_ling_nian#9":[0.421893,-35.24,-76.52],"illust_char_2023_ling_ncg#1":[0.318546,-11.66,-5.78]};
export function illustrationRect(id,width,height,node,sceneScale){
 const ref=referenceArts[id],sx=node.scale.x,sy=node.scale.y;
 if(ref){const ratio=1535/1280/sceneScale;return {width:width*ref[0]*ratio/sx,height:height*ref[0]*ratio/sy,left:node.w/2+(ref[1]*ratio-node.x-node.w/2)/sx,top:node.h/2+(ref[2]*ratio-node.y-node.h/2)/sy};}
 // Keep uncalibrated static art within the collection viewport, with its PNG aspect ratio.
 const ratio=Math.min(810*.95/height,(962/sceneScale)*.98/width);
 const w=width*ratio/sx,h=height*ratio/sy;return {width:w,height:h,left:(node.w-w)/2,top:(node.h-h)/2};
}
let source;
const $=id=>document.getElementById(id);
const art=(folder,name)=>{const base='https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/';const path=folder==='skin'?'ui/skin/':'arts/ui/'+encodeURIComponent(folder)+'/';return base+path+(name==='black_back'?'bkgs/':'')+encodeURIComponent(name.toLowerCase())+'.png';};
export async function loadOriginalLayouts(){if(source)return;const r=await fetch('/wardrobe/native-scene.json.gz');if(!r.ok)throw Error('Native scene');const bytes=new Uint8Array(await r.arrayBuffer());const raw=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);source=JSON.parse(raw);}
const rgba=c=>`rgba(${Math.round((c?.r??1)*255)},${Math.round((c?.g??1)*255)},${Math.round((c?.b??1)*255)},${c?.a??1})`;
function fillText(el,text){const parts=String(text).split(/(<\/?color(?:\s+name=[^>]+)?>)/g);let target=el;for(const part of parts){const match=part.match(/^<color\s+name=(#[\da-f]{6,8})>$/i);if(match){const span=document.createElement('span');span.style.color=match[1];target.append(span);target=span;}else if(part==='</color>')target=el;else if(!part.startsWith('<color'))target.append(document.createTextNode(part));}}
function putRect(el,rect){const [x,y,w,h]=rect;Object.assign(el.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});}
function pageNode(name){return Object.values(source.page).find(n=>n.name===name);}
export function compareSkinOrder(a,b){return Number(!a.basic)-Number(!b.basic)||(a.basic?(a.elite||0)-(b.elite||0):(source?.skins[a.id]?.released||0)-(source?.skins[b.id]?.released||0))||(source?.skins[a.id]?.order||0)-(source?.skins[b.id]?.order||0)||a.id.localeCompare(b.id);}
export function applyOriginalLayout(skin){
 if(!source)return;const row=source.skins[skin.id],group=row?.group||'illust_2',nodes=source.layouts[group]||source.layouts.illust_2;
 const detail=$('wardrobeDetail'),stage=detail.querySelector('.wardrobe-stage');detail.classList.add('native-layout');
 // Preserve the live image/canvas elements while replacing a template.
 const live={illustration:$('wardrobeArt'),avatar:$('wardrobeFace'),portrait:$('wardrobePortrait'),spine:$('wardrobeSD'),status:$('wardrobeArtStatus')};for(const el of Object.values(live))stage.append(el);
 let scene=$('wardrobeNativeScene');if(!scene){scene=document.createElement('div');scene.id='wardrobeNativeScene';stage.append(scene);}scene.hidden=false;scene.replaceChildren();
 const dimensions=[],elements=[],bindings={};
 const svgNS='http://www.w3.org/2000/svg',svg=document.createElementNS(svgNS,'svg'),defs=document.createElementNS(svgNS,'defs');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.append(defs);scene.append(svg);let filterIndex=0;const nativeHeight=source.nativeHeight,scale=862/nativeHeight;
 for(const [index,n]of nodes.entries()){
  const parent=n.parent===null?scene:elements[n.parent];const [pw,ph]=n.parent===null?[962/scale,nativeHeight]:dimensions[n.parent];
  const w=n.parent===null?pw:pw*(n.anchorMax.x-n.anchorMin.x)+n.size.x,h=n.parent===null?ph:ph*(n.anchorMax.y-n.anchorMin.y)+n.size.y;
  const x=n.parent===null?0:pw*(n.anchorMin.x+(n.anchorMax.x-n.anchorMin.x)*n.pivot.x)+n.position.x-n.pivot.x*w;
  const y=n.parent===null?0:ph-(ph*(n.anchorMin.y+(n.anchorMax.y-n.anchorMin.y)*n.pivot.y)+n.position.y+(1-n.pivot.y)*h);
  const el=document.createElement('div');el.className='native-node';el.dataset.path=n.path;putRect(el,[x,y,w,h]);el.style.transformOrigin=`${n.pivot.x*100}% ${(1-n.pivot.y)*100}%`;el.style.transform=`rotate(${-n.rotation}deg) scale(${n.scale.x},${n.scale.y})`;el.style.opacity=n.alpha??1;el.hidden=!n.active;
  if(n.name==='content_scroll'){el.style.overflow='auto';el.style.pointerEvents='auto';}if(n.binding==='content'){el.classList.add('native-content');el.style.height='auto';el.style.minHeight='100%';}parent.append(el);dimensions[index]=[w,h];elements[index]=el;
  const tint=/^#[\da-f]{6,8}$/i.test(row?.colors?.[n.colorSlot]||'')?row.colors[n.colorSlot]:rgba(n.color);
  if(n.image){const img=document.createElement('img');img.className='native-graphic';img.src=art(n.image.folder,n.image.name);img.alt='';img.style.width='100%';img.style.height='100%';img.style.objectFit=n.preserveAspect?'contain':'fill';const hex=tint.startsWith('#')?tint.slice(1):null,c=hex?[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).concat(hex.length===8?parseInt(hex.slice(6,8),16)/255:1):[n.color?.r??1,n.color?.g??1,n.color?.b??1,n.color?.a??1];if(c.some(v=>v!==1)){const f=document.createElementNS(svgNS,'filter'),id='native-tint-'+filterIndex++;f.id=id;f.setAttribute('color-interpolation-filters','sRGB');const transfer=document.createElementNS(svgNS,'feComponentTransfer');for(const [i,channel]of ['R','G','B','A'].entries()){const func=document.createElementNS(svgNS,'feFunc'+channel);func.setAttribute('type','linear');func.setAttribute('slope',c[i]);transfer.append(func);}f.append(transfer);defs.append(f);img.style.filter=`url(#${id})`;}el.append(img);} 
  if(n.text!==undefined){const text=document.createElement('div');text.className='native-text';const f=n.font||{};text.style.fontSize=(f.m_FontSize||14)+'px';text.style.lineHeight=Math.max(1.25,Number(f.m_LineSpacing)||1);text.style.fontWeight=f.m_FontStyle===1||f.m_FontStyle===3?'700':'400';text.style.fontStyle=f.m_FontStyle===2||f.m_FontStyle===3?'italic':'normal';text.style.color=tint;const align=f.m_Alignment||0;text.style.textAlign=['left','center','right'][align%3];text.style.justifyContent=['flex-start','center','flex-end'][Math.floor(align/3)];const value=n.binding==='content'?row?.content||skin.content:n.binding==='model'?row?.model||skin.model||skin.operator:n.binding==='drawer'?row?.drawer||skin.artist:n.text;const block=document.createElement('div');fillText(block,value||'');text.append(block);el.append(text);}
  if(n.binding)bindings[n.binding]={el,node:n,w,h,x,y};
 }
 for(const kind of ['avatar','portrait'])if(bindings[kind]){const img=live[kind];bindings[kind].el.append(img);img.classList.add('native-live-image');img.removeAttribute('style');}
 if(bindings.spine){bindings.spine.el.append(live.spine);live.spine.removeAttribute('style');}
 if(bindings.illustration){const b=bindings.illustration,img=live.illustration;b.el.append(img);img.classList.add('native-live-art');img.removeAttribute('style');const fit=()=>{if(!img.naturalWidth||!img.naturalHeight)return;const rect=illustrationRect(skin.illustration,img.naturalWidth,img.naturalHeight,{...b,scale:b.node.scale},scale);for(const [key,value]of Object.entries(rect))img.style[key]=value+'px';};img.onload=fit;}

 // The right selection controls retain the site's read-only ownership behavior.
 const back=pageNode('btn_topmenu_back');if(back)putRect($('wardrobeBack'),back.rect);
 const scroll=pageNode('scroll_obj'),cardWidth=source.cardSize.x*scale,cardHeight=source.cardSize.y*scale;
 if(scroll){const [cx,y,,h]=scroll.rect;putRect($('wardrobeGrid'),[cx-250,y,500,h]);detail.style.setProperty('--native-card-width',cardWidth+'px');detail.style.setProperty('--native-card-height',cardHeight+'px');}
 const title=pageNode('char_name');if(title)putRect(detail.querySelector('.wardrobe-strip-heading'),title.rect);
 const button=pageNode('cloth_button');if(button)putRect($('wardrobeOwned'),button.rect);
 for(const [id,name]of [['wardrobePrev','left_arrow'],['wardrobeNext','right_arrow']]){const n=pageNode(name);if(n){detail.append($(id));putRect($(id),n.rect);}}
 const badge=detail.querySelector('.wardrobe-outfit-badge'),banner=pageNode('back_img');if(banner)putRect(badge,banner.rect);
 const accent=skin.basic?'#fff':row?.colors?.[0]||row?.colors?.[2]||skin.accent||'#4384aa';badge.style.backgroundColor=accent;badge.style.color=skin.basic?'#222':'#fff';$('wardrobeBadge').style.fontSize=skin.basic?'24px':'16px';badge.querySelector('small').textContent=skin.basic?'DEFAULT OUTFIT':'#OUTFIT OF THE DAY';$('wardrobeBadge').textContent=skin.basic?(skin.elite>=2?'II':'I'):skin.brand;
 let notice=$('wardrobeWearNotice');if(!notice){notice=document.createElement('p');notice.id='wardrobeWearNotice';detail.append(notice);}const nr=source.page['skin_select_state/right_part/down_container/wear_state/const_text'];if(nr)putRect(notice,nr.rect);notice.textContent='선택한 복장은 이 미리보기에만 적용됩니다.';
 let bar=$('wardrobeNativeTopColors');if(!bar){bar=document.createElement('div');bar.id='wardrobeNativeTopColors';detail.append(bar);}const br=pageNode('right_cont');if(br)putRect(bar,br.rect);bar.style.background=`linear-gradient(90deg,#fff 0% 25%,${row?.colors?.[0]||'#ddd'} 25% 50%,${row?.colors?.[1]||'#555'} 50% 75%,${row?.colors?.[2]||'#4384aa'} 75%)`;
 for(const card of $('wardrobeGrid').children){
  const data=source.skins[card.dataset.skin],template=source.layouts[data?.group]||source.layouts.illust_2,basic=card.dataset.basic==='true';
  const image=template.find(n=>n.path==='left_up_part/icon')?.image;
  const primary=card.querySelector('img');primary.className='native-card-portrait';
  function rect(el,path){const r=source.cardNodes[path].rect;Object.assign(el.style,{left:(r[0]/source.cardSize.x*100)+'%',top:(r[1]/source.cardSize.y*100)+'%',width:(r[2]/source.cardSize.x*100)+'%',height:(r[3]/source.cardSize.y*100)+'%'});}
  rect(primary,'/content/back_image');
  function part(cls,tag='img'){let el=card.querySelector('.'+cls);if(!el){el=document.createElement(tag);el.className=cls;if(tag==='img')el.alt='';card.append(el);}return el;}
  const reflection=part('native-card-reflection');reflection.src=primary.src;rect(reflection,'/content/back_image_2');reflection.style.transform='scaleY(-1)';
  const mask=part('native-card-mask');mask.src='https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/ui/skinselect/skin_select_obj/skin_head_back.png';rect(mask,'/content/mask_image');
  const logo=part('native-card-logo');rect(logo,'/content/alpha_part/icon');logo.hidden=basic?card.dataset.elite!=='2':!image;if(!logo.hidden)logo.src=basic?'https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/ui/brandimage/brand_illust_2.png':art(image.folder,image.name);
  const faction=part('native-card-faction');faction.hidden=!basic;faction.src='https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/camplogo/logo_rhodes.png';
  const name=card.querySelector('span');name.classList.add('native-card-name');rect(name,'/content/alpha_part/const_text');name.hidden=basic;name.style.fontSize=(Math.min(22,145.5/Math.max(1,name.textContent.length)) * scale)+'px';
  part('native-card-wash','div');card.querySelector('small').hidden=true;
 }

}
