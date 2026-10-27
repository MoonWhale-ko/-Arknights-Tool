let source;
const art=(folder,name)=>`https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/ui/${folder}/${encodeURIComponent(name)}.png`;
export async function loadOriginalLayouts(){if(!source){const r=await fetch('/wardrobe/original-layout.json');if(!r.ok)throw Error('Original layout');source=await r.json();}}
const rgba=c=>c?`rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},${c.a})`:'#fff';
export function applyOriginalLayout(skin){
 const row=source?.skins[skin.id],group=row?.group||'illust_2',layout=source?.layouts[source.groups[group]??source.groups.illust_2];if(!layout)return;
 const detail=document.getElementById('wardrobeDetail'),stage=detail.querySelector('.wardrobe-stage');detail.classList.add('original-layout');
 const color=node=>/^#[0-9a-f]{6}$/i.test(row?.colors?.[node?.colorSlot]||'')?row.colors[node.colorSlot]:rgba(node?.color);
 const place=(el,node)=>{if(!node)return;const [x,y,w,h]=node.rect;Object.assign(el.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});};
 let ornaments=document.getElementById('wardrobeOriginalOrnaments');if(!ornaments){ornaments=document.createElement('div');ornaments.id='wardrobeOriginalOrnaments';stage.append(ornaments);}ornaments.replaceChildren();
 for(const [path,name,flip] of [['/spine_part/color_1','spine_left_up',false],['/spine_part/color_2','spine_left_up',true],['/left_up_part/tri_for_round','left_deco',false]]){
  const node=layout[path];if(!node)continue;const el=document.createElement('div');el.className='original-ornament';place(el,node);el.style.backgroundColor=color(node);el.style.maskImage=`url("${art('%5Bpack%5Dskinres',name)}")`;if(flip)el.style.transform='rotate(180deg)';ornaments.append(el);
 }
 const bg=layout['/back_static'];if(bg){stage.style.setProperty('--original-back-top',bg.rect[1]+'px');stage.style.setProperty('--original-back-height',bg.rect[3]+'px');}
 const sd=document.getElementById('wardrobeSD'),back=layout['/spine_part/Image'],holder=layout['/spine_part/spine_holder'];place(sd,back);
 if(back&&holder){const [x,y,w,h]=holder.rect;sd.style.setProperty('--sd-canvas-left',(x+w/2-back.rect[0]-256)+'px');sd.style.setProperty('--sd-canvas-top',(y+h/2-back.rect[1]-384)+'px');}
 detail.querySelector('.wardrobe-closeups').style.display='contents';place(document.getElementById('wardrobeFace'),layout['/right_up_part/Image']);place(document.getElementById('wardrobePortrait'),layout['/right_up_part/Image (1)']);
 const info=detail.querySelector('.wardrobe-info'),panel=layout['/right_down_part/panel_content_block/text_back_all'];
 if(panel){place(info,panel);const deco=layout['/right_down_part/panel_content_block/text_deco'];info.style.width=(panel.rect[2]+(deco?.rect[2]||0))+'px';info.style.backgroundColor=color(panel);}
 let heading=document.getElementById('wardrobeOriginalHeading');if(!heading){heading=document.createElement('img');heading.id='wardrobeOriginalHeading';info.prepend(heading);}const header=layout['/right_down_part/panel_content_block/deco'];heading.src=header?.sprite?art('skin',header.sprite):art('%5Bpack%5Dskinres','default_logo');heading.alt=skin.brandTitle||'DEFAULT OUTFIT';
 heading.onerror=()=>{heading.hidden=true;};heading.hidden=false;
 if(panel&&header){place(heading,{rect:[header.rect[0]-panel.rect[0],header.rect[1]-panel.rect[1],header.rect[2],header.rect[3]]});}else Object.assign(heading.style,{left:'0px',top:'0px',width:panel?.rect[2]+'px',height:'77px'});
 if(panel){
  const relative=node=>({rect:[node.rect[0]-panel.rect[0],node.rect[1]-panel.rect[1],node.rect[2],node.rect[3]]});
  const content=layout['/right_down_part/panel_content_block/content_scroll'];if(content)place(document.getElementById('wardrobeDescription'),relative(content));
  document.getElementById('wardrobeCredits').hidden=true;
  for(const [kind,text]of [['model',skin.model||skin.operator],['drawer',skin.artist||'']]){
   let el=document.getElementById('wardrobeOriginal'+kind);if(!el){el=document.createElement('span');el.id='wardrobeOriginal'+kind;el.className='original-credit';info.append(el);}el.textContent=text;
   const node=layout['/right_down_part/panel_content_block/text_pure_'+kind];el.hidden=!node;if(node)place(el,relative(node));
   const icon=layout['/right_down_part/panel_content_block/icon_'+kind];if(icon){const img=document.createElement('img');img.className='original-ornament original-credit-icon';img.alt='';img.src=art('%5Bpack%5Dskinres','icon_'+kind);place(img,icon);ornaments.append(img);}
  }
 }
 const logo=layout['/left_up_part/icon'];detail.querySelector('.wardrobe-brand-mark').hidden=!logo?.sprite;if(logo?.sprite){const el=document.getElementById('wardrobeBrandLogo');el.src=art('skin',logo.sprite);el.style.filter='none';}
}
