import {loadOriginalLayouts,applyOriginalLayout,compareSkinOrder} from './original-layout.js?v=14';
import {showSD,clearSD} from './sd.js?v=9';
const $=id=>document.getElementById(id),make=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const demo=document.body.dataset.wardrobeDemo==='true';
const previewEquipped=new Map();
let catalog,owned=null,selectedChar=null,selectedSkin=null,characters=[];
const asset=(folder,id)=>`https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/${folder}/${encodeURIComponent(id)}.png`;
export function ownedSkins(data){const skins=(data?.snapshot?.user??data?.user??data?.rewards?.user)?.skin?.characterSkins;if(!skins||typeof skins!=='object')return null;return new Set(Object.entries(skins).filter(([,value])=>Number(value)>0).map(([id])=>id));}
async function accept(data){if(!data)return;owned=ownedSkins(data);const user=data?.snapshot?.user??data?.user??data?.rewards?.user;if(user?.troop?.chars){characters=Object.values(user.troop.chars).map(c=>({charId:c.charId,skin:c.skin??c.skinId,elite:c.evolvePhase??0}));if(!demo)try{localStorage.setItem('zootAdminWardrobeCharacters',JSON.stringify(characters));}catch{}}if(owned&&!demo){try{localStorage.setItem('zootAdminWardrobeSkins',JSON.stringify([...owned]));}catch{}}if(!owned){$('wardrobeMessage').textContent='스킨 보유 정보가 없습니다. 관리자 계정을 다시 가져와 주세요.';$('wardrobeGrid').replaceChildren();$('wardrobeCount').textContent='';return;}try{if(!catalog){const r=await fetch('/wardrobe/catalog.json');if(!r.ok)throw Error();catalog=(await r.json()).skins;}await loadOriginalLayouts();renderRoster();render();}catch{$('wardrobeMessage').textContent='스킨 목록을 불러오지 못했습니다. 다시 적용해 주세요.';}}
function render(){
 if(!catalog||!owned)return;
 const query=$('wardrobeSearch').value.trim().toLocaleLowerCase(),all=$('wardrobeAll').checked,known=new Set(catalog.map(s=>s.id));
 const unknown=[...owned].filter(id=>!known.has(id)).map(id=>({id,charId:id.split('@')[0],operator:id.split('@')[0],name:'이름 확인 필요',brand:'게임 목록 미등록'}));
 const rows=[...catalog,...unknown].filter(s=>(all||owned.has(s.id)||s.basic&&(characters.find(c=>c.charId===s.charId)?.elite??0)>=(s.elite??0))&&[s.operator,s.name,s.brand,s.id].join(' ').toLocaleLowerCase().includes(query)).sort((a,b)=>Number(owned.has(b.id))-Number(owned.has(a.id))||a.operator.localeCompare(b.operator,'ko')||a.name.localeCompare(b.name,'ko'));
 $('wardrobeMessage').textContent=demo?'디자인 미리보기 · 테스트 데이터로 모든 외형을 표시합니다.':`보유 스킨 ${owned.size}종 · 기본·정예화 외형 제외`;
 const chars=new Map();for(const skin of rows){if(!chars.has(skin.charId))chars.set(skin.charId,[]);chars.get(skin.charId).push(skin);}
 const list=$('wardrobeOperators');list.replaceChildren();for(const [id,skins]of chars){const button=make('button',skins[0].operator);button.type='button';button.append(make('small',`${skins.length}종`));button.onclick=()=>{selectedChar=id;selectedSkin=null;render();$('wardrobeDialog').close();};list.append(button);}
 if(!chars.has(selectedChar))selectedChar=rows[0]?.charId??null;
 const skins=(chars.get(selectedChar)||[]).sort(compareSkinOrder);
 $('wardrobeCount').textContent=`${chars.size}명 · ${rows.length}종`;
 $('wardrobeOperator').textContent=skins[0]?.operator||'오퍼레이터 선택';
 const grid=$('wardrobeGrid');grid.replaceChildren();
 if(!skins.length){clearSD();if($('wardrobeNativeScene'))$('wardrobeNativeScene').hidden=true;$('wardrobeArt').hidden=true;$('wardrobeArt').removeAttribute('src');$('wardrobeArtStatus').textContent='조건에 맞는 스킨이 없습니다.';for(const id of ['wardrobeBrand','wardrobeOperatorName','wardrobeTitle','wardrobeOwned'])$(id).textContent='';return;}
 if(!skins.some(s=>s.id===selectedSkin))selectedSkin=skins[0].id;
 for(const skin of skins){const card=make('button');card.type='button';card.className='wardrobe-card'+(skin.basic||owned.has(skin.id)?'':' unowned');card.dataset.skin=skin.id;card.dataset.basic=String(!!skin.basic);card.dataset.elite=String(skin.elite||0);card.setAttribute('aria-label',skin.basic?(skin.elite>=2?'2정예화':'기본 복장'):skin.name);card.setAttribute('aria-pressed',String(skin.id===selectedSkin));const img=make('img');img.alt='';img.loading='lazy';if(skin.portrait)img.src='https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/portrait/'+encodeURIComponent(skin.portrait)+'.png';img.onerror=()=>{img.hidden=true;};card.append(img,make('span',skin.name),make('small',skin.brandTitle||'DEFAULT'));card.onclick=()=>{selectedSkin=skin.id;show(skin);for(const button of grid.children)button.setAttribute('aria-pressed',String(button.dataset.skin===selectedSkin));layoutCards();};grid.append(card);}
 show(skins.find(s=>s.id===selectedSkin));layoutCards();
}
function show(s){
 const detail=$('wardrobeDetail');detail.style.setProperty('--outfit-accent',/^#[0-9a-f]{6}$/i.test(s.accent||'')?s.accent:'#351dc4');
 const brandLogo=$('wardrobeBrandLogo');brandLogo.hidden=false;brandLogo.src=asset('ui/brandimage','brand_'+(s.brandId||'illust_1').toLowerCase());brandLogo.onerror=()=>{brandLogo.hidden=true;};
 $('wardrobeBrandWord').textContent=s.brandTitle||'DEFAULT';$('wardrobeBadge').textContent=s.brand||'기본 복장';$('wardrobeCollection').replaceChildren(make('strong',s.operator),document.createTextNode('의 컬렉션'));$('wardrobeCredits').textContent=(s.model||s.operator)+(s.artist?' / '+s.artist:'');$('wardrobeDescription').textContent=s.content||'';
 const portrait=$('wardrobePortrait');portrait.hidden=false;portrait.src='https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/portrait/'+encodeURIComponent(s.portrait)+'.png';portrait.onerror=()=>{portrait.hidden=true;};
 const face=$('wardrobeFace');face.hidden=false;face.onerror=()=>{face.hidden=true;};face.src='https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar/'+encodeURIComponent(s.avatar||s.charId)+'.png';
applyOriginalLayout(s);$('wardrobeNativeScene')?.append($('wardrobeArtStatus'));if(!$('wardrobeDetail').hidden)showSD(s);$('wardrobeBrand').textContent=s.brand;$('wardrobeOperatorName').textContent=s.operator;$('wardrobeTitle').textContent=s.name;updateWear(s);const img=$('wardrobeArt');img.hidden=false;img.alt=`${s.operator} · ${s.name}`;$('wardrobeArtStatus').textContent='';img.onerror=()=>{img.hidden=true;$('wardrobeArtStatus').textContent='일러스트를 불러오지 못했습니다.';};if(s.illustration){img.src=asset('characters/'+s.charId,s.illustration.replace(/^illust_/,''));if(img.complete&&img.naturalWidth)img.onload?.();}else{img.hidden=true;$('wardrobeArtStatus').textContent='등록된 일러스트가 없습니다.';}}
$('wardrobeOperator').onclick=()=>{$('wardrobeDialog').showModal();$('wardrobeSearch').focus();};
$('wardrobeClose').onclick=()=>$('wardrobeDialog').close();$('wardrobeDialog').addEventListener('click',e=>{if(e.target===$('wardrobeDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
document.querySelector('[data-tab="wardrobe"]')?.addEventListener('click',()=>window.dispatchEvent(new Event('wardrobe-request-account')));if(!demo)window.addEventListener('wardrobe-account',e=>accept(e.detail));if(!demo)window.addEventListener('mining-clear',()=>{try{localStorage.removeItem('zootAdminWardrobeSkins');localStorage.removeItem('zootAdminWardrobeCharacters');}catch{}clearSD();owned=null;characters=[];$('wardrobeRosterGrid').replaceChildren();$('wardrobeDetail').hidden=true;$('wardrobeRoster').hidden=false;$('wardrobeGrid').replaceChildren();$('wardrobeCount').textContent='';$('wardrobeMessage').textContent='계정 데이터를 지웠습니다.';$('wardrobeDialog').close();});$('wardrobeSearch').oninput=render;$('wardrobeAll').onchange=render;

if(!demo)window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='preview-account')accept(e.data.account);if(e.data?.type==='preview-clear')window.dispatchEvent(new Event('mining-clear'));});if(!demo&&parent!==window)parent.postMessage({type:'preview-account-request'},location.origin);

if(!demo)try{const ids=JSON.parse(localStorage.getItem('zootAdminWardrobeSkins')||'null');if(Array.isArray(ids))accept({user:{skin:{characterSkins:Object.fromEntries(ids.filter(id=>typeof id==='string').map(id=>[id,1]))}}});}catch{}

function readImportedSkins(){try{const data=JSON.parse(localStorage.getItem('arknightsOneTimeRewardsV1')||'null');if(ownedSkins(data))accept(data);}catch{}}
if(!demo){window.addEventListener('arknights-account-updated',readImportedSkins);window.addEventListener('storage',e=>{if(e.key==='arknightsOneTimeRewardsV1'||e.key==='zootAdminWardrobeSkins')readImportedSkins();});readImportedSkins();}

$('wardrobeLoad').addEventListener('click',async()=>{if(demo)return;try{const {openAccountImport}=await import('/preview/assets/js/account-menu.mjs');await openAccountImport();}catch{$('wardrobeMessage').textContent='계정 가져오기를 열지 못했습니다. 새로고침 후 다시 시도해 주세요.';}});

function renderRoster(){if(!catalog||!owned)return;const grid=$('wardrobeRosterGrid');grid.replaceChildren();const list=characters.length?characters:[...new Set(catalog.filter(s=>owned.has(s.id)).map(s=>s.charId))].map(charId=>({charId}));const query=$('wardrobeRosterSearch').value.trim().toLowerCase();for(const c of list){const skins=catalog.filter(s=>s.charId===c.charId),name=skins[0]?.operator||c.charId;if(!name.toLowerCase().includes(query))continue;const current=skins.find(s=>s.id===(previewEquipped.get(c.charId)||c.skin))||skins.find(s=>s.basic&&s.elite===(c.elite>=2?2:0))||skins[0];const button=make('button');button.type='button';const img=make('img');img.alt='';img.loading='lazy';if(current?.portrait)img.src='https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/portrait/'+encodeURIComponent(current.portrait)+'.png';img.onerror=()=>{img.hidden=true;};button.append(img,make('strong',name),make('small',`${skins.filter(s=>owned.has(s.id)).length}종 보유`));button.onclick=()=>{selectedChar=c.charId;selectedSkin=current?.id;$('wardrobeSearch').value='';$('wardrobeRoster').hidden=true;$('wardrobeDetail').hidden=false;render();};grid.append(button);}}
$('wardrobeBack').onclick=()=>{clearSD();$('wardrobeRoster').hidden=false;$('wardrobeDetail').hidden=true;};$('wardrobeRosterSearch').oninput=renderRoster;
if(!demo)try{characters=JSON.parse(localStorage.getItem('zootAdminWardrobeCharacters')||'[]');}catch{}

function updateWear(s){const character=characters.find(c=>c.charId===s.charId);const equipped=previewEquipped.get(s.charId)||character?.skin||catalog.find(v=>v.charId===s.charId&&v.basic&&v.elite===(character?.elite>=2?2:0))?.id;const allowed=owned.has(s.id)||s.basic&&(character?.elite??0)>=(s.elite||0);const current=equipped===s.id,button=$('wardrobeOwned');button.textContent=current?'현재 복장':allowed?'변경':'미보유';button.disabled=current||!allowed;button.classList.toggle('is-equipped',current);button.onclick=()=>{if(!allowed||current)return;previewEquipped.set(s.charId,s.id);updateWear(s);renderRoster();};}
function layoutCards(){const buttons=[...$('wardrobeGrid').children],selected=buttons.findIndex(b=>b.dataset.skin===selectedSkin);for(const [i,button]of buttons.entries()){const offset=i-selected;button.style.setProperty('--card-offset',String(Math.max(-3,Math.min(3,offset))));button.style.zIndex=String(10-Math.abs(offset));button.style.opacity=Math.abs(offset)>2?'0':'1';button.style.pointerEvents=Math.abs(offset)>2?'none':'auto';}for(const [id,off]of [['wardrobePrev',-1],['wardrobeNext',1]]){const button=$(id);button.disabled=!buttons[selected+off];button.hidden=button.disabled;}}
for(const [id,direction]of [['wardrobePrev',-1],['wardrobeNext',1]])$(id).onclick=()=>{const buttons=[...$('wardrobeGrid').children],i=buttons.findIndex(b=>b.dataset.skin===selectedSkin);buttons[i+direction]?.click();};

let startX=null,suppressSwipeClick=false;const strip=$('wardrobeGrid');strip.addEventListener('pointerdown',e=>{if(e.button!==0)return;startX=e.clientX;});strip.addEventListener('click',e=>{if(suppressSwipeClick){e.preventDefault();e.stopImmediatePropagation();}},true);window.addEventListener('pointerup',e=>{if(startX!==null&&Math.abs(e.clientX-startX)>35){$(e.clientX<startX?'wardrobeNext':'wardrobePrev').click();suppressSwipeClick=true;setTimeout(()=>{suppressSwipeClick=false;},0);}startX=null;});window.addEventListener('pointercancel',()=>{startX=null;});

$('wardrobeZoom').onclick=()=>{const art=$('wardrobeArt');if(art.requestFullscreen)art.requestFullscreen().catch(()=>{});};
function fitCollection(){const detail=$('wardrobeDetail'),wrap=$('wardrobe');if(detail.hidden){wrap.style.removeProperty('--collection-height');return;}const scale=wrap.clientWidth/1535;detail.style.setProperty('--collection-scale',String(scale));wrap.style.setProperty('--collection-height',`${862*scale}px`);}
new ResizeObserver(fitCollection).observe($('wardrobe'));new MutationObserver(fitCollection).observe($('wardrobeDetail'),{attributes:true,attributeFilter:['hidden']});fitCollection();

if(demo){
 $('wardrobeLoad').hidden=true;$('wardrobeAll').checked=true;
 (async()=>{try{
  const response=await fetch('/wardrobe/catalog.json');if(!response.ok)throw Error();catalog=(await response.json()).skins;
  const chars=Object.fromEntries([...new Set(catalog.map(s=>s.charId))].map(charId=>[charId,{charId,evolvePhase:2}]));
  selectedChar='char_2023_ling';selectedSkin='char_2023_ling#2';
  await accept({user:{skin:{characterSkins:Object.fromEntries(catalog.filter(s=>!s.basic).map(s=>[s.id,1]))},troop:{chars}}});
  if($('wardrobeGrid').children.length){$('wardrobeRoster').hidden=true;$('wardrobeDetail').hidden=false;render();}
 }catch{$('wardrobeMessage').textContent='테스트 화면을 불러오지 못했습니다.';}})();
}
