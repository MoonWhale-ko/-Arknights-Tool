// Unity child RectTransform: parent centre + anchored position, with Y flipped for CSS.
// Trimmed PNGs occupy only textureRect inside the original sprite canvas.
export function nativeIllustrationRect(metric,width,height,node){
 const offset=metric.skinOffset,sz=offset?.enableSize?offset.size:metric.size;
 const pos=offset?.enablePos?offset.position:metric.position;
 const fullW=sz.x*(metric.scale?.x??1),fullH=sz.y*(metric.scale?.y??1),canvas=metric.sprite.rect,crop=metric.sprite.textureRect;
 const fullImage=width===Math.round(canvas.width)&&height===Math.round(canvas.height);
 const x=fullImage?0:metric.sprite.textureRectOffset.x,y=fullImage?0:canvas.height-metric.sprite.textureRectOffset.y-crop.height;
 const w=fullImage?canvas.width:crop.width,h=fullImage?canvas.height:crop.height;
 return {width:fullW*w/canvas.width,height:fullH*h/canvas.height,left:node.w/2+pos.x-fullW*metric.pivot.x+fullW*x/canvas.width,top:node.h/2-pos.y-fullH*(1-metric.pivot.y)+fullH*y/canvas.height};
}
export function illustrationRect(id,width,height,node,sceneScale,metric){
 if(metric?.sprite&&metric.size&&metric.position&&metric.pivot)return nativeIllustrationRect(metric,width,height,node);
 const sx=node.scale.x,sy=node.scale.y;
 // Provisional fit only when a purchased illustration has no supplied native prefab.
 const ratio=Math.min(810*.95/height,(962/sceneScale)*.98/width);
 const w=width*ratio/sx,h=height*ratio/sy;return {width:w,height:h,left:(node.w-w)/2,top:(node.h-h)/2};
}
// UV rectangle in the untrimmed Unity sprite canvas, expressed as percentages.
export function spriteContentRect(sprite,width,height){
 if(!sprite||width===Math.round(sprite.rect.width)&&height===Math.round(sprite.rect.height))return {left:0,top:0,width:100,height:100};
 const r=sprite.rect,c=sprite.textureRect,o=sprite.textureRectOffset;
 return {left:o.x/r.width*100,top:(r.height-o.y-c.height)/r.height*100,width:c.width/r.width*100,height:c.height/r.height*100};
}
function placeSprite(img,sprite,base={left:0,top:0,width:100,height:100}){
 const fit=()=>{const c=spriteContentRect(sprite,img.naturalWidth,img.naturalHeight);Object.assign(img.style,{left:(base.left+base.width*c.left/100)+'%',top:(base.top+base.height*c.top/100)+'%',width:base.width*c.width/100+'%',height:base.height*c.height/100+'%',right:'auto',bottom:'auto',objectFit:'fill'});};
 img.onload=fit;if(img.complete&&img.naturalWidth)fit();
}
let source,sceneSerial=0;
const $=id=>document.getElementById(id);
const art=(folder,name)=>{const base='https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/';const path=folder==='skin'?'ui/skin/':'arts/ui/'+encodeURIComponent(folder)+'/';return base+path+(name==='black_back'?'bkgs/':'')+encodeURIComponent(name.toLowerCase())+'.png';};
export async function loadOriginalLayouts(){if(source)return;const r=await fetch('/wardrobe/native-scene.json.gz');if(!r.ok)throw Error('Native scene');const bytes=new Uint8Array(await r.arrayBuffer());const raw=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);source=JSON.parse(raw);}
const rgba=c=>`rgba(${Math.round((c?.r??1)*255)},${Math.round((c?.g??1)*255)},${Math.round((c?.b??1)*255)},${c?.a??1})`;
function fillText(el,text){const parts=String(text).split(/(<\/?color(?:\s+name=[^>]+)?>)/g);let target=el;for(const part of parts){const match=part.match(/^<color\s+name=(#[\da-f]{6,8})>$/i);if(match){const span=document.createElement('span');span.style.color=match[1];target.append(span);target=span;}else if(part==='</color>')target=el;else if(!part.startsWith('<color'))target.append(document.createTextNode(part));}}
function putRect(el,rect){const [x,y,w,h]=rect;Object.assign(el.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});}
function pageNode(name){return Object.values(source.page).find(n=>n.name===name);}
export function compareSkinOrder(a,b,records=source?.skins||{}){const order=s=>Number.isFinite(records[s.id]?.order)?records[s.id].order:s.basic?-3+(s.elite||0):Number.MAX_SAFE_INTEGER;return order(a)-order(b)||a.id.localeCompare(b.id);}
export function colourBands(rows,selectedId,records=source?.skins||{}){const index=rows.findIndex(s=>s.id===selectedId);const colours=list=>list.map(s=>({id:s.id,color:s.basic?'#fff':records[s.id]?.colors?.[0]||s.accent||'#fff'}));return index<0?{left:[],right:[]}:{left:colours(rows.slice(0,index)),right:colours(rows.slice(index+1))};}

export function applyOriginalLayout(skin){
 if(!source)return;const row=source.skins[skin.id],group=row?.group||'illust_2',nodes=source.layouts[group]||source.layouts.illust_2;
 const detail=$('wardrobeDetail'),stage=detail.querySelector('.wardrobe-stage');detail.classList.add('native-layout');
 // Preserve the live image/canvas elements while replacing a template.
 const live={illustration:$('wardrobeArt'),avatar:$('wardrobeFace'),portrait:$('wardrobePortrait'),spine:$('wardrobeSD'),status:$('wardrobeArtStatus')};for(const el of Object.values(live))stage.append(el);
 let scene=$('wardrobeNativeScene');if(!scene){scene=document.createElement('div');scene.id='wardrobeNativeScene';stage.append(scene);}scene.hidden=false;scene.replaceChildren();const stageWidth=source.page['skin_select_state/right_part']?.rect[0]||962;stage.style.width=stageWidth+'px';scene.style.width=stageWidth/(862/source.nativeHeight)+'px';
 const dimensions=[],elements=[],bindings={};
 const svgNS='http://www.w3.org/2000/svg',svg=document.createElementNS(svgNS,'svg'),defs=document.createElementNS(svgNS,'defs');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.append(defs);scene.append(svg);let filterIndex=0;const sceneId=++sceneSerial;const nativeHeight=source.nativeHeight,scale=862/nativeHeight;
 for(const [index,n]of nodes.entries()){
  const parent=n.parent===null?scene:elements[n.parent];const [pw,ph]=n.parent===null?[stageWidth/scale,nativeHeight]:dimensions[n.parent];
  const w=n.parent===null?pw:pw*(n.anchorMax.x-n.anchorMin.x)+n.size.x,h=n.parent===null?ph:ph*(n.anchorMax.y-n.anchorMin.y)+n.size.y;
  const x=n.parent===null?0:pw*(n.anchorMin.x+(n.anchorMax.x-n.anchorMin.x)*n.pivot.x)+n.position.x-n.pivot.x*w;
  const y=n.parent===null?0:ph-(ph*(n.anchorMin.y+(n.anchorMax.y-n.anchorMin.y)*n.pivot.y)+n.position.y+(1-n.pivot.y)*h);
  const el=document.createElement('div');el.className='native-node';el.dataset.path=n.path;putRect(el,[x,y,w,h]);el.style.transformOrigin=`${n.pivot.x*100}% ${(1-n.pivot.y)*100}%`;el.style.transform=`rotate(${-n.rotation}deg) scale(${n.scale.x},${n.scale.y})`;el.style.opacity=n.alpha??1;el.hidden=!n.active;
  if(n.name==='content_scroll'){el.style.overflow='auto';el.style.pointerEvents='auto';}if(n.binding==='content'){el.classList.add('native-content');el.style.height='auto';el.style.minHeight='100%';}parent.append(el);dimensions[index]=[w,h];elements[index]=el;
  const tint=/^#[\da-f]{6,8}$/i.test(row?.colors?.[n.colorSlot]||'')?row.colors[n.colorSlot]:rgba(n.color);
  if(n.image){const sliced=n.image.type===1&&n.image.border;const img=document.createElement(sliced?'div':'img');img.className='native-graphic';const url=art(n.image.folder,n.image.name);if(sliced){const b=n.image.border;Object.assign(img.style,{boxSizing:'border-box',borderStyle:'solid',borderColor:'transparent',borderWidth:`${b.w}px ${b.z}px ${b.y}px ${b.x}px`,borderImageSource:`url("${url}")`,borderImageSlice:`${b.w} ${b.z} ${b.y} ${b.x} fill`,borderImageWidth:`${b.w}px ${b.z}px ${b.y}px ${b.x}px`,borderImageRepeat:'stretch'});img.dataset.spriteMode='sliced';}else{img.src=url;img.alt='';}img.style.width='100%';img.style.height='100%';img.style.objectFit=n.preserveAspect?'contain':'fill';const hex=tint.startsWith('#')?tint.slice(1):null,c=hex?[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).concat(hex.length===8?parseInt(hex.slice(6,8),16)/255:1):[n.color?.r??1,n.color?.g??1,n.color?.b??1,n.color?.a??1];if(c.some(v=>v!==1)){const f=document.createElementNS(svgNS,'filter'),id='native-tint-'+sceneId+'-'+filterIndex++;f.id=id;f.setAttribute('color-interpolation-filters','sRGB');const transfer=document.createElementNS(svgNS,'feComponentTransfer');for(const [i,channel]of ['R','G','B','A'].entries()){const func=document.createElementNS(svgNS,'feFunc'+channel);func.setAttribute('type','linear');func.setAttribute('slope',c[i]);transfer.append(func);}f.append(transfer);defs.append(f);img.style.filter=`url(#${id})`;}if(!sliced&&n.image.sprite)placeSprite(img,n.image.sprite);el.append(img);} 
  if(n.text!==undefined){const text=document.createElement('div');text.className='native-text';const f=n.font||{};text.style.fontFamily=`"${n.fontName||'NotoSansHans-Medium'}","Noto Sans KR",Arial,sans-serif`;text.dataset.originalFont=n.fontName||'NotoSansHans-Medium';text.style.fontSize=(f.m_FontSize||14)+'px';text.style.lineHeight=Math.max(1.25,Number(f.m_LineSpacing)||1);text.style.fontWeight=f.m_FontStyle===1||f.m_FontStyle===3?'700':'400';text.style.fontStyle=f.m_FontStyle===2||f.m_FontStyle===3?'italic':'normal';text.style.color=tint;const align=f.m_Alignment||0;text.style.textAlign=['left','center','right'][align%3];text.style.justifyContent=['flex-start','center','flex-end'][Math.floor(align/3)];const value=n.binding==='content'?row?.content||skin.content:n.binding==='model'?row?.model||skin.model||skin.operator:n.binding==='drawer'?row?.drawer||skin.artist:n.text;const block=document.createElement('div');fillText(block,value||'');text.append(block);el.append(text);}
  if(n.binding)bindings[n.binding]={el,node:n,w,h,x,y};
 }
 for(const kind of ['avatar','portrait'])if(bindings[kind]){const img=live[kind];bindings[kind].el.append(img);img.classList.add('native-live-image');img.removeAttribute('style');img.style.objectFit=bindings[kind].node.preserveAspect?'contain':'fill';}
 if(bindings.spine){bindings.spine.el.append(live.spine);live.spine.removeAttribute('style');}
 if(bindings.illustration){const b=bindings.illustration,img=live.illustration;b.el.append(img);img.classList.add('native-live-art');img.removeAttribute('style');const fit=()=>{if(!img.naturalWidth||!img.naturalHeight)return;const metric=source.illustrations[skin.illustration];img.dataset.layoutSource=metric?.sprite&&metric.size&&metric.position&&metric.pivot?'native-prefab':'reference-fallback';const rect=illustrationRect(skin.illustration,img.naturalWidth,img.naturalHeight,{...b,scale:b.node.scale},scale,metric);for(const [key,value]of Object.entries(rect))img.style[key]=value+'px';};img.onload=fit;}

 // Selection controls use a separate standalone game presentation.
 const back=pageNode('btn_topmenu_back');if(back)putRect($('wardrobeBack'),back.rect);
 const scroll=pageNode('scroll_obj'),cardWidth=source.cardSize.x*scale,cardHeight=source.cardSize.y*scale;
 if(scroll){const [cx,y,,h]=scroll.rect;putRect($('wardrobeGrid'),[cx-250,y,500,h]);detail.style.setProperty('--native-card-width',cardWidth+'px');detail.style.setProperty('--native-card-height',cardHeight+'px');}
 const title=pageNode('char_name');if(title)putRect(detail.querySelector('.wardrobe-strip-heading'),title.rect);
 const button=pageNode('cloth_button');if(button)putRect($('wardrobeOwned'),button.rect);
 for(const [id,name]of [['wardrobePrev','left_arrow'],['wardrobeNext','right_arrow']]){const n=pageNode(name);if(n){detail.append($(id));putRect($(id),n.rect);}}
 const badge=detail.querySelector('.wardrobe-outfit-badge'),banner=pageNode('back_img');if(banner)putRect(badge,banner.rect);
 const accent=skin.basic?'#fff':row?.colors?.[0]||row?.colors?.[2]||skin.accent||'#4384aa';badge.style.backgroundColor=accent;badge.style.color=skin.basic?'#222':'#fff';badge.querySelector('small').textContent=skin.basic?'DEFAULT OUTFIT':'#OUTFIT OF THE DAY';$('wardrobeBadge').textContent=skin.basic?(skin.elite>=2?'II':'I'):skin.brand;
 const section=skin.basic?'building_item':'buyable_item';for(const [el,name]of [[badge.querySelector('small'),'const_text'],[$('wardrobeBadge'),'brand_name']]){const node=Object.entries(source.page).find(([path])=>path.endsWith('/'+section+'/'+name))?.[1];if(!node||!banner)continue;const [x,y,w,h]=node.rect;putRect(el,[x-banner.rect[0],y-banner.rect[1],w,h]);const f=node.font||{},font=node.fontName||'NotoSansHans-Medium';el.dataset.originalFont=font;Object.assign(el.style,{position:'absolute',margin:'0',padding:'0',display:'flex',alignItems:f.m_Alignment>=3?'center':'flex-start',justifyContent:'center',fontFamily:`"${font}","Noto Sans KR",Arial,sans-serif`,fontWeight:'400',fontSize:(f.m_FontSize||20)*scale+'px',lineHeight:'1',whiteSpace:'nowrap',overflowWrap:'normal'});if(f.m_BestFit&&el.textContent.length){const value=el.textContent,measure=document.createElement('span');measure.textContent=value;measure.style.whiteSpace='nowrap';measure.style.flexShrink='0';el.replaceChildren(measure);const max=(f.m_MaxSize||f.m_FontSize)*scale,min=(f.m_MinSize||2)*scale;const fit=()=>{if(!el.contains(measure))return;el.style.fontSize=max+'px';const width=measure.scrollWidth;if(width>w)el.style.fontSize=Math.max(min,max*w/width)+'px';};fit();document.fonts?.ready.then(fit);}}
 let notice=$('wardrobeWearNotice');if(!notice){notice=document.createElement('p');notice.id='wardrobeWearNotice';detail.append(notice);}const nr=source.page['skin_select_state/right_part/down_container/wear_state/const_text'];if(nr)putRect(notice,nr.rect);notice.textContent='변경한 복장은 다른 화면에도 적용됩니다';
 const cards=[...$('wardrobeGrid').children].map(card=>({id:card.dataset.skin,basic:card.dataset.basic==='true'}));const bands=colourBands(cards,skin.id);
 for(const [side,id,name]of [['left','wardrobeNativeTopColorsLeft','left_cont'],['right','wardrobeNativeTopColors','right_cont']]){let bar=$(id);if(!bar){bar=document.createElement('div');bar.id=id;detail.append(bar);}const rect=pageNode(name);if(rect)putRect(bar,rect.rect);bar.style.background='none';bar.style.display='flex';bar.style.position='absolute';bar.style.zIndex='3';bar.style.pointerEvents='none';bar.replaceChildren();for(const item of bands[side]){const part=document.createElement('div');part.dataset.skin=item.id;part.style.flex='1 1 0';part.style.minWidth='0';part.style.height='100%';part.style.backgroundColor=item.color;bar.append(part);}}

 for(const card of $('wardrobeGrid').children){
  const data=source.skins[card.dataset.skin],template=source.layouts[data?.group]||source.layouts.illust_2,basic=card.dataset.basic==='true';
  const image=template.find(n=>n.path==='left_up_part/icon')?.image;
  const primary=card.querySelector('img');primary.className='native-card-portrait';
  function rect(el,path){const r=source.cardNodes[path].rect;Object.assign(el.style,{left:(r[0]/source.cardSize.x*100)+'%',top:(r[1]/source.cardSize.y*100)+'%',width:(r[2]/source.cardSize.x*100)+'%',height:(r[3]/source.cardSize.y*100)+'%'});}
  rect(primary,'/content/back_image');
  function part(cls,tag='img'){let el=card.querySelector('.'+cls);if(!el){el=document.createElement(tag);el.className=cls;if(tag==='img')el.alt='';card.append(el);}return el;}
  const reflection=part('native-card-reflection');reflection.src=primary.src;rect(reflection,'/content/back_image_2');reflection.style.transform='scaleY(-1)';
  const mask=part('native-card-mask');mask.src='https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/ui/skinselect/skin_select_obj/skin_head_back.png';rect(mask,'/content/mask_image');
  const logo=part('native-card-logo');rect(logo,'/content/alpha_part/icon');logo.hidden=basic?card.dataset.elite!=='2':!image;if(!logo.hidden){logo.src=basic?'https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/ui/brandimage/brand_illust_2.png':art(image.folder,image.name);if(!basic&&image?.sprite){const r=source.cardNodes['/content/alpha_part/icon'].rect;placeSprite(logo,image.sprite,{left:r[0]/source.cardSize.x*100,top:r[1]/source.cardSize.y*100,width:r[2]/source.cardSize.x*100,height:r[3]/source.cardSize.y*100});}}
  card.querySelector('.native-card-faction')?.remove();
  const name=card.querySelector('span');name.classList.add('native-card-name');rect(name,'/content/alpha_part/const_text');name.hidden=basic;name.style.fontSize=(Math.min(22,145.5/Math.max(1,name.textContent.length)) * scale)+'px';
  part('native-card-wash','div');card.querySelector('small').hidden=true;
 }

}

// SkinSelectScrollItemView.ApplyState and SkinSelectScrollView coroutines (PC IL2CPP).
export const NATIVE_MOTION = Object.freeze({clickFrames:15,snapFrames:5,boundWidth:153.89999389648438});
const CARD_WEIGHTS=[0,0,.3,.5,1,.5,.3,0,0];
export function cardWeight(offset){const x=offset+4,i=Math.floor(x);if(x<0||x>=8)return 0;return CARD_WEIGHTS[i]*(1-(x-i))+CARD_WEIGHTS[i+1]*(x-i);}
export function nativeCardFrames(state,count){
 const first=Math.floor(state)-4,last=Math.floor(state)+5,slots=[];let total=0;
 for(let i=first;i<=last;i++){const weight=cardWeight(i-state),width=NATIVE_MOTION.boundWidth*weight;slots.push({index:i,weight,width,centre:total+width/2});total+=width;}
 return Array.from({length:count},(_,index)=>{const slot=slots.find(s=>s.index===index)||{weight:0,width:0,centre:0};return {...slot,index,x:slot.centre-total/2,opacity:Math.sqrt(slot.weight),detailOpacity:Math.max(0,Math.min(1,(slot.weight-.9)*10)),wash:(1-slot.weight)*.4};});
}
export function nativeDragState(start,dx,count){return Math.max(0,Math.min(count-1,start+Math.max(-2,Math.min(2,-3e-6*dx*Math.abs(dx)))));}

// Original skin_animator_common Blend Tree endpoints from skin_groups.ab.
const LEFT_CHANNELS=[{"path":"left_up_part/tri_for_round","attribute":4,"show":[0.0,0.0,0.0],"hide":[0.0,0.0,-29.90999984741211]},{"path":"right_down_part","attribute":"m_AnchoredPosition.x","show":[176.5],"hide":[486.0]},{"path":"right_up_part","attribute":"m_AnchoredPosition.x","show":[-153.89999389648438],"hide":[155.5999755859375]},{"path":"spine_part/color_1","attribute":"m_AnchoredPosition.x","show":[-24.5],"hide":[-74.5]},{"path":"spine_part/color_1","attribute":"m_AnchoredPosition.y","show":[64.19999694824219],"hide":[114.19999694824219]},{"path":"spine_part/color_2","attribute":"m_AnchoredPosition.x","show":[87.5999984741211],"hide":[137.60000610351562]},{"path":"spine_part/color_2","attribute":"m_AnchoredPosition.y","show":[-55.900001525878906],"hide":[-105.9000015258789]},{"path":"spine_part/color_2","attribute":"m_Color.a","show":[1.0],"hide":[0.0]},{"path":"spine_part/color_1","attribute":"m_Color.a","show":[1.0],"hide":[0.0]},{"path":"illustration","attribute":"m_AnchoredPosition.y","show":[19.600000381469727],"hide":[-674.0]},{"path":"const_image","attribute":"m_AnchoredPosition.y","show":[17.200000762939453],"hide":[-234.3000030517578]},{"path":"const_image","attribute":"m_Color.a","show":[1.0],"hide":[0.0]},{"path":"left_up_part/icon","attribute":"m_AnchoredPosition.x","show":[-104.0],"hide":[-361.0]},{"path":"back_changeable","attribute":"m_Color.a","show":[1.0],"hide":[0.0]},{"path":"back_static","attribute":"m_Color.a","show":[1.0],"hide":[0.0]},{"path":"spine_part/Image","attribute":"m_Color.a","show":[1.0],"hide":[0.0]},{"path":"","attribute":"m_Alpha","show":[1.0],"hide":[0.0]},{"path":"spine_part/spine_holder","attribute":"m_AnchoredPosition.x","show":[32.0],"hide":[-468.0]},{"path":"spine_part/spine_holder","attribute":"m_AnchoredPosition.y","show":[-80.0],"hide":[-580.0]}];
export function leftMotionChannels(distance){const blend=Math.min(1,distance*distance);return LEFT_CHANNELS.map(c=>({...c,value:c.show.map((v,i)=>v+(c.hide[i]-v)*blend)}));}
export function applyLeftMotion(scene,distance){
 if(!scene)return;const nodes=[...scene.querySelectorAll('.native-node')];
 for(const channel of leftMotionChannels(distance)){
  const node=nodes.find(n=>n.dataset.path===channel.path);if(!node)continue;
  if(!node._motionBase)node._motionBase={left:parseFloat(node.style.left)||0,top:parseFloat(node.style.top)||0,transform:node.style.transform,opacity:node.style.opacity||'1'};
  const base=node._motionBase,value=channel.value[0],delta=value-channel.show[0];
  if(channel.attribute==='m_AnchoredPosition.x')node.style.left=base.left+delta+'px';
  else if(channel.attribute==='m_AnchoredPosition.y')node.style.top=base.top-delta+'px';
  else if(channel.attribute===4)node.style.transform=base.transform+' rotate('+(-(channel.value[2]-channel.show[2]))+'deg)';
  else if(channel.attribute==='m_Alpha')node.style.opacity=String(Number(base.opacity)*value);
  else if(channel.attribute==='m_Color.a'){
   // Change only this Graphic's alpha; do not dim descendants twice.
   const graphic=[...node.children].find(n=>n.classList.contains('native-graphic'));if(graphic)graphic.style.opacity=String(value);
  }
 }
 scene.dataset.blend=String(Math.min(1,distance*distance));
}
