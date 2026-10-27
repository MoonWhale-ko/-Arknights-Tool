let source;
const $=id=>document.getElementById(id);
const art=(folder,name)=>`https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/ui/${encodeURIComponent(folder)}/${encodeURIComponent(name)}.png`;
export async function loadOriginalLayouts(){if(source)return;const r=await fetch('/wardrobe/native-scene.json.gz');if(!r.ok)throw Error('Native scene');const bytes=new Uint8Array(await r.arrayBuffer());const raw=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);source=JSON.parse(raw);}
const rgba=c=>`rgba(${Math.round((c?.r??1)*255)},${Math.round((c?.g??1)*255)},${Math.round((c?.b??1)*255)},${c?.a??1})`;
function fillText(el,text){const parts=String(text).split(/(<\/?color(?:\s+name=[^>]+)?>)/g);let target=el;for(const part of parts){const match=part.match(/^<color\s+name=(#[\da-f]{6,8})>$/i);if(match){const span=document.createElement('span');span.style.color=match[1];target.append(span);target=span;}else if(part==='</color>')target=el;else if(!part.startsWith('<color'))target.append(document.createTextNode(part));}}
function putRect(el,rect){const [x,y,w,h]=rect;Object.assign(el.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});}
function pageNode(name){return Object.values(source.page).find(n=>n.name===name);}
export function applyOriginalLayout(skin){
 if(!source)return;const row=source.skins[skin.id],group=row?.group||'illust_2',nodes=source.layouts[group]||source.layouts.illust_2;
 const detail=$('wardrobeDetail'),stage=detail.querySelector('.wardrobe-stage');detail.classList.add('native-layout');
 // Preserve the live image/canvas elements while replacing a template.
 const live={illustration:$('wardrobeArt'),avatar:$('wardrobeFace'),portrait:$('wardrobePortrait'),spine:$('wardrobeSD')};for(const el of Object.values(live))stage.append(el);
 let scene=$('wardrobeNativeScene');if(!scene){scene=document.createElement('div');scene.id='wardrobeNativeScene';stage.append(scene);}scene.replaceChildren();
 const dimensions=[],elements=[],bindings={};
 const svgNS='http://www.w3.org/2000/svg',svg=document.createElementNS(svgNS,'svg'),defs=document.createElementNS(svgNS,'defs');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.append(defs);scene.append(svg);let filterIndex=0;const nativeHeight=source.nativeHeight,scale=862/nativeHeight;
 for(const [index,n]of nodes.entries()){
  const parent=n.parent===null?scene:elements[n.parent];const [pw,ph]=n.parent===null?[962/scale,nativeHeight]:dimensions[n.parent];
  const w=n.parent===null?pw:pw*(n.anchorMax.x-n.anchorMin.x)+n.size.x,h=n.parent===null?ph:ph*(n.anchorMax.y-n.anchorMin.y)+n.size.y;
  const x=n.parent===null?0:pw*(n.anchorMin.x+(n.anchorMax.x-n.anchorMin.x)*n.pivot.x)+n.position.x-n.pivot.x*w;
  const y=n.parent===null?0:ph-(ph*(n.anchorMin.y+(n.anchorMax.y-n.anchorMin.y)*n.pivot.y)+n.position.y+(1-n.pivot.y)*h);
  const el=document.createElement('div');el.className='native-node';el.dataset.path=n.path;putRect(el,[x,y,w,h]);el.style.transformOrigin=`${n.pivot.x*100}% ${(1-n.pivot.y)*100}%`;el.style.transform=`rotate(${-n.rotation}deg) scale(${n.scale.x},${n.scale.y})`;el.style.opacity=n.alpha??1;el.hidden=!n.active;
  if(n.name==='content_scroll')el.style.overflow='hidden';parent.append(el);dimensions[index]=[w,h];elements[index]=el;
  const tint=/^#[\da-f]{6,8}$/i.test(row?.colors?.[n.colorSlot]||'')?row.colors[n.colorSlot]:rgba(n.color);
  if(n.image){const img=document.createElement('img');img.className='native-graphic';img.src=art(n.image.folder,n.image.name);img.alt='';img.style.width='100%';img.style.height='100%';img.style.objectFit=n.preserveAspect?'contain':'fill';const hex=tint.startsWith('#')?tint.slice(1):null,c=hex?[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).concat(hex.length===8?parseInt(hex.slice(6,8),16)/255:1):[n.color?.r??1,n.color?.g??1,n.color?.b??1,n.color?.a??1];if(c.some(v=>v!==1)){const f=document.createElementNS(svgNS,'filter'),id='native-tint-'+filterIndex++;f.id=id;f.setAttribute('color-interpolation-filters','sRGB');const transfer=document.createElementNS(svgNS,'feComponentTransfer');for(const [i,channel]of ['R','G','B','A'].entries()){const func=document.createElementNS(svgNS,'feFunc'+channel);func.setAttribute('type','linear');func.setAttribute('slope',c[i]);transfer.append(func);}f.append(transfer);defs.append(f);img.style.filter=`url(#${id})`;}el.append(img);} 
  if(n.text!==undefined){const text=document.createElement('div');text.className='native-text';const f=n.font||{};text.style.fontSize=(f.m_FontSize||14)+'px';text.style.lineHeight=f.m_LineSpacing||1;text.style.fontWeight=f.m_FontStyle===1||f.m_FontStyle===3?'700':'400';text.style.fontStyle=f.m_FontStyle===2||f.m_FontStyle===3?'italic':'normal';text.style.color=tint;const align=f.m_Alignment||0;text.style.textAlign=['left','center','right'][align%3];text.style.justifyContent=['flex-start','center','flex-end'][Math.floor(align/3)];const value=n.binding==='content'?row?.content||skin.content:n.binding==='model'?row?.model||skin.model||skin.operator:n.binding==='drawer'?row?.drawer||skin.artist:n.text;fillText(text,value||'');el.append(text);}
  if(n.binding)bindings[n.binding]={el,node:n,w,h};
 }
 for(const kind of ['avatar','portrait'])if(bindings[kind]){const img=live[kind];bindings[kind].el.append(img);img.classList.add('native-live-image');img.removeAttribute('style');}
 if(bindings.spine){bindings.spine.el.append(live.spine);live.spine.removeAttribute('style');}
 if(bindings.illustration){const b=bindings.illustration,img=live.illustration; b.el.append(img);img.classList.add('native-live-art');const fit=()=>{const metric=source.illustrations[skin.illustration],w=metric?.size.x||img.naturalWidth,h=metric?.size.y||img.naturalHeight;if(!w||!h)return;const p=metric?.pivot||{x:.5,y:.5},offset=metric?.position||{x:0,y:0};Object.assign(img.style,{width:w+'px',height:h+'px',left:(b.w/2+offset.x-p.x*w)+'px',top:(b.h/2-offset.y-(1-p.y)*h)+'px'});};img.onload=fit;if(img.complete)fit();}
 // The right selection controls retain the site's read-only ownership behavior.
 const back=pageNode('btn_topmenu_back');if(back)putRect($('wardrobeBack'),back.rect);
 const scroll=pageNode('scroll_obj'),cardWidth=source.cardSize.x*scale,cardHeight=source.cardSize.y*scale;
 if(scroll){const [cx,y,,h]=scroll.rect;putRect($('wardrobeGrid'),[cx-250,y,500,h]);detail.style.setProperty('--native-card-width',cardWidth+'px');detail.style.setProperty('--native-card-height',cardHeight+'px');}
 const title=pageNode('char_name');if(title)putRect(detail.querySelector('.wardrobe-strip-heading'),title.rect);
 const button=pageNode('cloth_button');if(button)putRect($('wardrobeOwned'),button.rect);
 for(const [id,name]of [['wardrobePrev','left_arrow'],['wardrobeNext','right_arrow']]){const n=pageNode(name);if(n){detail.append($(id));putRect($(id),n.rect);}}
 const brand=source.page['skin_select_state/right_part/scroll_container/building_item/brand_name'];if(brand){const rect=brand.rect;const badge=detail.querySelector('.wardrobe-outfit-badge');badge.style.left=(rect[0]-8)+'px';badge.style.width=(rect[2]+16)+'px';}
 detail.style.setProperty('--outfit-accent',row?.colors?.[2]||skin.accent||'#4384aa');
 // Match the original group logo inside each portrait card.
 for(const card of $('wardrobeGrid').children){const data=source.skins[card.dataset.skin],template=source.layouts[data?.group]||source.layouts.illust_2;const image=template.find(n=>n.path==='left_up_part/icon')?.image;let mark=card.querySelector('.native-card-logo');if(!mark){mark=document.createElement('img');mark.className='native-card-logo';mark.alt='';card.append(mark);}mark.hidden=!image;if(image)mark.src=art(image.folder,image.name);card.querySelector('small').hidden=true;}
}
