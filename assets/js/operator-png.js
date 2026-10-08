/* PNG settings use their own storage key; operator progress is never modified here. */
const PNG_KEY='arknightsPngSettingsV1';
const PNG_FIELDS={elite:'정예화',level:'레벨',potential:'잠재',trust:'신뢰도',skill:'스킬 레벨',mastery:'마스터리',modules:'모듈'};
function normalizePngSettings(raw={}){
 if(!raw||typeof raw!=='object')raw={};
 const defaults={target:'all',columns:6,split:'single',fields:Object.fromEntries(Object.keys(PNG_FIELDS).map(k=>[k,true]))};
 return {...defaults,target:raw.target==='filtered'?'filtered':'all',columns:[4,6,8].includes(+raw.columns)?+raw.columns:6,split:raw.split==='profession'?'profession':'single',fields:Object.fromEntries(Object.keys(PNG_FIELDS).map(k=>[k,typeof raw.fields?.[k]==='boolean'?raw.fields[k]:true]))};
}
let pngSettings=normalizePngSettings();
try{pngSettings=normalizePngSettings(JSON.parse(localStorage.getItem(PNG_KEY)||'{}'))}catch{}
function pngOperators(settings){
 const q=document.getElementById('q').value.trim().toLowerCase(),r=document.getElementById('rarity').value,o=document.getElementById('ownedFilter').value;
 return chars.filter(c=>get(c.id).owned&&(settings.target!=='filtered'||matchesOperator(c,q,r,o)));
}
function pngSort(a,b){const professions=Object.keys(professionKo);return b.rarity-a.rarity||professions.indexOf(a.profession)-professions.indexOf(b.profession)||a.name.localeCompare(b.name,'ko')||a.id.localeCompare(b.id)}
function pngSections(list){
 return [6,5,4,3,2,1].map(r=>({id:String(r),name:'★'.repeat(r),operators:list.filter(c=>c.rarity===r).sort(pngSort)})).filter(g=>g.operators.length);
}
function pngCardHeight(settings){const f=settings.fields;return 100+(f.elite||f.level||f.potential||f.trust?68:0)+(f.skill?30:0)+(f.mastery?68:0)+(f.modules?72:0)}
function pngPages(list,settings){
 const width=settings.columns*320+48,height=pngCardHeight(settings),maxHeight=Math.min(8000,Math.floor(15000000/width));
 const buckets=settings.split==='profession'?Object.entries(professionKo).map(([id,label])=>({id,label,list:list.filter(c=>c.profession===id)})).filter(b=>b.list.length):[{id:'all',label:'',list}];
 const pages=[];
 for(const bucket of buckets){let page={id:bucket.id,label:bucket.label,sections:[],count:0,width},used=120;
  for(const section of pngSections(bucket.list,settings)){
   for(let i=0;i<section.operators.length;){let room=Math.floor((maxHeight-used-52)/(height+10));
    if(room<1){pages.push(page);page={id:bucket.id,label:bucket.label,sections:[],count:0,width};used=120;room=Math.floor((maxHeight-used-52)/(height+10))}
    const part=section.operators.slice(i,i+room*settings.columns);page.sections.push({...section,operators:part});page.count+=part.length;used+=52+Math.ceil(part.length/settings.columns)*(height+10);i+=part.length;
   }
  }
  if(page.count)pages.push(page);
 }
 return pages;
}
function pngIcon(kind,value){const prefix={elite:'elite-e',potential:'potential-p',mastery:'mastery-m'}[kind];return `<img class="png-progress" src="assets/icons/progress/${prefix}${value}.svg?v=2" alt="">`}
function pngCard(c,settings){const s=get(c.id),f=settings.fields;
 const basic=[f.elite?`<span class="png-stat">${pngIcon('elite',s.elite)}</span>`:'',f.level?`<span class="png-stat"><small>레벨</small><b>Lv.${s.level}</b></span>`:'',f.potential?`<span class="png-stat">${pngIcon('potential',s.potential)}</span>`:'',f.trust?`<span class="png-stat"><small>신뢰도</small><b>${s.trust}%</b></span>`:''].join('');
 return `<article class="png-card r${c.rarity}" style="height:${pngCardHeight(settings)}px"><div class="png-photo"><img crossorigin="anonymous" src="${avatar(c.id)}" alt="" loading="eager"><span class="png-photo-fallback">${esc(c.name.slice(0,1))}</span>${professionBadges(c)}${futureBadge(c)}</div><div class="png-info"><strong class="png-name">${esc(c.name)}</strong><div class="png-stars">${'★'.repeat(c.rarity)}</div>${basic?`<div class="png-basic">${basic}</div>`:''}${f.skill&&c.skills.length?`<div class="png-skill">스킬 레벨 <b>${s.skill}</b></div>`:''}${f.mastery?`<div class="png-masteries">${c.skills.map((sk,i)=>`<span>${sk.mastery.length?pngIcon('mastery',s.m[i]||0):'<span class="png-no-mastery">—</span>'}<small>S${sk.index}</small></span>`).join('')}</div>`:''}${f.modules?`<div class="png-modules">${c.modules.map(m=>`<span><small>${esc(moduleType(m))}</small><b>${moduleStage(s,m)?'Stage '+moduleStage(s,m):'미해금'}</b></span>`).join('')}</div>`:''}</div></article>`;
}
function pngSheet(page,settings,total,index,pages){return `<div class="png-sheet" style="width:${page.width}px;--png-columns:${settings.columns}"><header class="png-header"><div><h1>오퍼레이터 육성 현황${page.label?' · '+esc(page.label):''}</h1><p>출력 ${total}명 · ${index+1} / ${pages}장</p></div><span>Arknights Tool</span></header>${page.sections.map(g=>`<section class="png-section"><h2>${esc(g.name)}</h2><div class="png-cards">${g.operators.map(c=>pngCard(c,settings)).join('')}</div></section>`).join('')}</div>`}
function readPngForm(){const raw={fields:{}};for(const k of ['target','columns','split'])raw[k]=document.getElementById('png-'+k).value;for(const k of Object.keys(PNG_FIELDS))raw.fields[k]=document.getElementById('png-field-'+k).checked;return normalizePngSettings(raw)}
function fitPngNames(root){root.querySelectorAll('.png-name').forEach(name=>{for(let size=18;size>=10;size--){name.style.fontSize=size+'px';if(name.scrollHeight<=name.clientHeight+1&&name.scrollWidth<=name.clientWidth+1)break}})}
function scalePngPreview(){const viewport=document.getElementById('pngPreview'),sheet=viewport.querySelector('.png-sheet'),stage=document.getElementById('pngPreviewStage');if(!sheet){stage.style.height='0px';return}fitPngNames(sheet);const scale=Math.min(1,(viewport.clientWidth-12)/sheet.offsetWidth);sheet.style.transform=`scale(${Math.max(.1,scale)})`;stage.style.height=sheet.offsetHeight*Math.max(.1,scale)+'px'}
function updatePngPreview(){pngSettings=readPngForm();try{localStorage.setItem(PNG_KEY,JSON.stringify(pngSettings))}catch{}
 const list=pngOperators(pngSettings),pages=pngPages(list,pngSettings);document.getElementById('pngStatus').textContent=list.length?`${list.length}명 · ${pages.length}장${pages.length>1?' (긴 이미지는 자동 분할)':''}`:'출력할 보유 오퍼레이터가 없습니다.';
 document.getElementById('pngSave').disabled=!list.length;document.getElementById('pngPreviewStage').innerHTML=pages.length?pngSheet(pages[0],pngSettings,list.length,0,pages.length):'';document.getElementById('pngPreviewStage').querySelectorAll('.png-photo>img').forEach(img=>{img.onerror=()=>{img.style.display='none'}});scalePngPreview();
}
let pngBlobUrls=[];
function clearPngDownloads(){pngBlobUrls.forEach(url=>URL.revokeObjectURL(url));pngBlobUrls=[];document.getElementById('pngDownloads').innerHTML=''}
const pngDialog=document.getElementById('pngDialog');
document.getElementById('exportPng').onclick=()=>{for(const k of ['target','columns','split'])document.getElementById('png-'+k).value=String(pngSettings[k]);for(const k of Object.keys(PNG_FIELDS))document.getElementById('png-field-'+k).checked=pngSettings.fields[k];pngDialog.showModal();updatePngPreview()};
document.getElementById('pngOptions').onchange=updatePngPreview;
document.getElementById('pngClose').onclick=()=>pngDialog.close();
pngDialog.addEventListener('close',clearPngDownloads);
window.addEventListener('resize',()=>{if(pngDialog.open)scalePngPreview()});
function waitPngImages(root){return Promise.all([...root.querySelectorAll('img')].map(img=>new Promise(resolve=>{const finish=()=>{clearTimeout(timer);if(!img.naturalWidth){img.style.display='none';img.removeAttribute('src')}resolve()};const timer=setTimeout(finish,15000);if(img.complete)finish();else{img.onload=finish;img.onerror=finish}})))}
// html2canvas 1.4 does not reproduce object-fit. Bake the displayed image rectangle first.
function pngImagePlacement(sourceWidth,sourceHeight,width,height,fit){
 if(fit==='cover'){
  const scale=Math.max(width/sourceWidth,height/sourceHeight),sw=width/scale,sh=height/scale;
  return [(sourceWidth-sw)/2,(sourceHeight-sh)/2,sw,sh,0,0,width,height];
 }
 const scale=Math.min(width/sourceWidth,height/sourceHeight),dw=sourceWidth*scale,dh=sourceHeight*scale;
 return [0,0,sourceWidth,sourceHeight,(width-dw)/2,(height-dh)/2,dw,dh];
}
async function bakePngImages(root){
 for(const img of root.querySelectorAll('.png-photo>img,.png-progress')){
  if(!img.naturalWidth||!img.naturalHeight)continue;
  const rect=img.getBoundingClientRect(),width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
  // SVGs without explicit dimensions use the attached element's CSS viewport
  // when drawn, although naturalWidth describes a different intrinsic viewport.
  // Decode an unstyled image before using intrinsic source coordinates; otherwise
  // the CSS-sized icon is scaled down a second time (42px -> roughly 6px).
  const source=new Image();source.crossOrigin=img.crossOrigin;source.src=img.currentSrc||img.src;await source.decode();
  const bitmap=document.createElement('canvas');bitmap.width=width;bitmap.height=height;
  const fit=img.classList.contains('png-progress')?'contain':'cover';
  bitmap.getContext('2d').drawImage(source,...pngImagePlacement(source.naturalWidth,source.naturalHeight,width,height,fit));
  img.src=bitmap.toDataURL('image/png');img.style.objectFit='fill';await img.decode();bitmap.width=0;bitmap.height=0;
 }
}
async function saveOperatorPng(){
 if(!window.html2canvas){document.getElementById('pngStatus').textContent='PNG 출력 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.';return}
 const settings=readPngForm(),list=pngOperators(settings),pages=pngPages(list,settings);if(!pages.length)return;
 clearPngDownloads();
 const saveButton=document.getElementById('pngSave'),status=document.getElementById('pngStatus');saveButton.disabled=true;document.getElementById('pngOptions').disabled=true;const host=document.createElement('div');host.className='png-capture';document.body.append(host);
 try{await document.fonts?.ready;
  for(let i=0;i<pages.length;i++){status.textContent=`PNG 생성 중 · ${i+1} / ${pages.length}장`;host.innerHTML=pngSheet(pages[i],settings,list.length,i,pages.length);const sheet=host.firstElementChild;await waitPngImages(sheet);await bakePngImages(sheet);fitPngNames(sheet);
   const canvas=await html2canvas(sheet,{backgroundColor:'#0e1116',scale:1,useCORS:true,allowTaint:false,logging:false,imageTimeout:5000,width:pages[i].width,height:sheet.offsetHeight,windowWidth:pages[i].width+48});
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('이미지를 생성하지 못했습니다.');const url=URL.createObjectURL(blob),a=document.createElement('a');a.download=`arknights-operators-${pages[i].id}-${String(i+1).padStart(2,'0')}.png`;a.href=url;a.className='btn';a.textContent=`PNG ${i+1} 다운로드`;document.getElementById('pngDownloads').append(a);pngBlobUrls.push(url);a.click();canvas.width=0;canvas.height=0;
  }
  status.textContent=`${list.length}명 · PNG ${pages.length}장 생성 완료 · 다운로드되지 않았다면 위 버튼을 눌러 주세요`;
 }catch(e){status.textContent='PNG 저장에 실패했습니다. '+e.message}finally{host.remove();saveButton.disabled=false;document.getElementById('pngOptions').disabled=false}
}
document.getElementById('pngSave').onclick=saveOperatorPng;
