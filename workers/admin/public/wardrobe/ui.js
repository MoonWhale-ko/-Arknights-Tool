import {showIllustration,clearIllustration,illustrationFullscreen} from './illust.js?v=6';
import {collectionOriginiteCost,originiteCashEquivalent} from './collection-cost.mjs?v=2';
import {loadOriginalLayouts,applyOriginalLayout,compareSkinOrder,NATIVE_MOTION,nativeCardFrames,nativeDragState,applyLeftMotion,skinSeriesCategory,skinAssetCharacter} from './original-layout.js?v=21';
import {showSD,clearSD,releaseSD} from './sd.js?v=14';
const $=id=>document.getElementById(id),make=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const demo=document.body.dataset.wardrobeDemo==='true';
const previewEquipped=new Map();
let acquisitionRoutes={},routesLoaded=false;
async function loadAcquisitionRoutes(){if(routesLoaded)return;try{const r=await fetch('/wardrobe/acquisition-routes.json?v=2');if(r.ok){const data=await r.json();acquisitionRoutes=data.sourceRegion==='KR'?(data.skins??{}):{};routesLoaded=true;}}catch{}}
let operatorAliases={};
const searchKey=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g,'');
async function loadOperatorAliases(){try{const r=await fetch('/preview/data/operator-aliases.json?v=1');if(r.ok){const data=await r.json();operatorAliases=Object.fromEntries(Object.entries(data.aliases||{}).map(([name,aliases])=>[searchKey(name),aliases]));}}catch{}}
const aliasesFor=name=>operatorAliases[searchKey(name)]||[];
const matchesSearch=(query,values)=>!query||values.some(value=>searchKey(value).includes(searchKey(query)));
let rosterMetadata={},rosterMetadataLoaded=false;
async function loadRosterMetadata(){if(rosterMetadataLoaded)return;try{const r=await fetch('/wardrobe/roster-metadata.json?v=1');if(r.ok){rosterMetadata=await r.json();rosterMetadataLoaded=true;}}catch{}}
let catalog,owned=null,selectedChar=null,selectedSkin=null,characters=[];
let sceneLayers=[];
let cardState=0,motionFrame=0,motionVersion=0,drag=null;
function stopCardMotion(){cancelAnimationFrame(motionFrame);motionVersion++;}

const asset=(folder,id)=>`https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/${folder}/${encodeURIComponent(id.toLowerCase())}.png`;
export function ownedSkins(data){const skins=(data?.snapshot?.user??data?.user??data?.rewards?.user)?.skin?.characterSkins;if(!skins||typeof skins!=='object')return null;return new Set(Object.entries(skins).filter(([,value])=>Number(value)>0).map(([id])=>id));}
async function accept(data){if(!data)return;owned=ownedSkins(data);const user=data?.snapshot?.user??data?.user??data?.rewards?.user;characters=[];if(user?.troop?.chars){characters=Object.values(user.troop.chars).map(c=>({charId:c.charId,skin:c.skin??c.skinId,elite:c.evolvePhase??0}));if(!demo)try{localStorage.setItem('zootAdminWardrobeCharacters',JSON.stringify(characters));}catch{}}if(owned&&!demo){try{localStorage.setItem('zootAdminWardrobeSkins',JSON.stringify([...owned]));}catch{}}if(!owned){$('wardrobeMessage').textContent='스킨 보유 정보가 없습니다. 관리자 계정을 다시 가져와 주세요.';$('wardrobeGrid').replaceChildren();$('wardrobeCount').textContent='';return;}try{if(!catalog){const r=await fetch('/wardrobe/catalog.json');if(!r.ok)throw Error();catalog=(await r.json()).skins;}await Promise.all([loadOriginalLayouts(),loadAcquisitionRoutes(),loadRosterMetadata(),loadOperatorAliases()]);renderRoster();render();}catch{$('wardrobeMessage').textContent='스킨 목록을 불러오지 못했습니다. 다시 적용해 주세요.';}}
function render(){
 if(!catalog||!owned)return;
 const query=$('wardrobeSearch').value.trim().toLocaleLowerCase(),all=$('wardrobeAll').checked,known=new Set(catalog.map(s=>s.id));
 const unknown=[...owned].filter(id=>!known.has(id)).map(id=>({id,charId:id.split('@')[0],operator:id.split('@')[0],name:'이름 확인 필요',brand:'게임 목록 미등록'}));
 const rows=[...catalog,...unknown].filter(s=>(rosterFilters.ownership==='all'||(rosterFilters.ownership==='owned'?isSkinOwned(s):!isSkinOwned(s)))&&(all||owned.has(s.id)||s.basic&&(characters.find(c=>c.charId===s.charId)?.elite??0)>=(s.elite??0))&&matchesSearch(query,[s.operator,s.name,s.brand,s.id,...aliasesFor(s.operator)])).sort((a,b)=>Number(owned.has(b.id))-Number(owned.has(a.id))||a.operator.localeCompare(b.operator,'ko')||a.name.localeCompare(b.name,'ko'));
 $('wardrobeMessage').textContent=demo?'디자인 미리보기 · 테스트 데이터로 모든 외형을 표시합니다.':`보유 스킨 ${owned.size}종 · 기본·정예화 외형 제외`;
 const chars=new Map();for(const skin of rows){if(!chars.has(skin.charId))chars.set(skin.charId,[]);chars.get(skin.charId).push(skin);}
 const list=$('wardrobeOperators');list.replaceChildren();for(const [id,skins]of chars){const button=make('button',skins[0].operator);button.type='button';button.append(make('small',`${skins.length}종`));button.onclick=()=>{selectedChar=id;selectedSkin=null;render();$('wardrobeDialog').close();};list.append(button);}
 if(!chars.has(selectedChar))selectedChar=rows[0]?.charId??null;
 const skins=(chars.get(selectedChar)||[]).sort(compareSkinOrder);
 $('wardrobeCount').textContent=`${chars.size}명 · ${rows.length}종`;
 $('wardrobeOperator').textContent=skins[0]?.operator||'오퍼레이터 선택';
 const grid=$('wardrobeGrid');stopCardMotion();cancelAnimationFrame(dragFrame);dragFrame=0;drag=null;clearOldScenes();grid.replaceChildren();
 if(!skins.length){clearIllustration();clearSD();if($('wardrobeNativeScene'))$('wardrobeNativeScene').hidden=true;$('wardrobeArt').hidden=true;$('wardrobeArt').removeAttribute('src');$('wardrobeArtStatus').textContent='조건에 맞는 스킨이 없습니다.';for(const id of ['wardrobeBrand','wardrobeOperatorName','wardrobeTitle','wardrobeOwned'])$(id).textContent='';return;}
 if(!skins.some(s=>s.id===selectedSkin))selectedSkin=skins[0].id;
 for(const skin of skins){const card=make('button');card.type='button';card.className='wardrobe-card'+(isSkinOwned(skin)?'':' unowned');card.dataset.skin=skin.id;card.dataset.basic=String(!!skin.basic);card.dataset.elite=String(skin.elite||0);card.setAttribute('aria-label',skin.basic?(skin.elite>=2?'2정예화':'기본 복장'):skin.name);card.setAttribute('aria-pressed',String(skin.id===selectedSkin));const img=make('img');img.alt='';img.loading='lazy';if(skin.portrait)img.src='https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/portrait/'+encodeURIComponent(skin.portrait)+'.png';img.onerror=()=>{img.hidden=true;};card.append(img,make('span',skin.name),make('small',skin.brandTitle||'DEFAULT'));card.onclick=()=>selectCard(skin.id,NATIVE_MOTION.clickFrames);grid.append(card);}
 show(skins.find(s=>s.id===selectedSkin));layoutCards();
}
function clearOldScenes(){for(const layer of sceneLayers){if(layer.el.id!=='wardrobeNativeScene'){releaseSD(layer.sd);layer.el.remove();}}sceneLayers=[];}
function retainLeftScene(){
 clearIllustration();
 const el=$('wardrobeNativeScene');if(!el)return;const ids=['wardrobeArt','wardrobeFace','wardrobePortrait','wardrobeSD','wardrobeArtStatus'];const live=ids.map(id=>$(id));const sd=$('wardrobeSD'),status=$('wardrobeSDStatus');
 // Preserve the actual outgoing DOM and live SD renderer, not a flat screenshot.
 const fresh=live.map(node=>node.cloneNode(false));const freshStatus=status.cloneNode(false);freshStatus.textContent='';fresh[3].append(freshStatus);
 for(const n of [el,...el.querySelectorAll('[id]')]){if(n.id.startsWith('native-tint-'))continue;n.removeAttribute('id');}
 el.classList.add('wardrobe-native-outgoing');el.setAttribute('aria-hidden','true');el.inert=true;
 const layer=sceneLayers.find(v=>v.el===el);if(layer)layer.sd=sd;else sceneLayers.push({el,sd,index:cardState});
 for(const node of fresh)$('wardrobeDetail').querySelector('.wardrobe-stage').append(node);
}
function show(s){
 clearIllustration();
 const detail=$('wardrobeDetail');detail.style.setProperty('--outfit-accent',/^#[0-9a-f]{6}$/i.test(s.accent||'')?s.accent:'#351dc4');
 const brandLogo=$('wardrobeBrandLogo');brandLogo.hidden=false;brandLogo.src=asset('ui/brandimage','brand_'+(s.brandId||'illust_1').toLowerCase());brandLogo.onerror=()=>{brandLogo.hidden=true;};
 $('wardrobeBrandWord').textContent=s.brandTitle||'DEFAULT';$('wardrobeBadge').textContent=s.brand||'기본 복장';$('wardrobeCollection').replaceChildren(make('strong',s.operator),document.createTextNode('의 컬렉션'));$('wardrobeCredits').textContent=(s.model||s.operator)+(s.artist?' / '+s.artist:'');$('wardrobeDescription').textContent=s.content||'';
 const portrait=$('wardrobePortrait');portrait.hidden=false;portrait.src='https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/portrait/'+encodeURIComponent(s.portrait)+'.png';portrait.onerror=()=>{portrait.hidden=true;};
 const face=$('wardrobeFace');face.hidden=false;face.onerror=()=>{face.hidden=true;};face.src='https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar/'+encodeURIComponent(s.avatar||s.charId)+'.png';
applyOriginalLayout(s);for(const id of ['wardrobeArt','wardrobeFace','wardrobePortrait','wardrobeSD'])$(id)?.classList.toggle('wardrobe-unowned-art',!isSkinOwned(s));$('wardrobeNativeScene')?.append($('wardrobeArtStatus'));if(!$('wardrobeDetail').hidden)showSD(s);renderSidebar(s);$('wardrobeBrand').textContent=s.brand;$('wardrobeOperatorName').textContent=s.operator;$('wardrobeTitle').textContent=s.name;updateWear(s);const img=$('wardrobeArt');img.hidden=false;img.alt=`${s.operator} · ${s.name}`;$('wardrobeArtStatus').textContent='';let imageRetries=0;img.onerror=()=>{if(selectedSkin!==s.id)return;if(imageRetries++<2){const retryURL=new URL(img.src);retryURL.searchParams.set('retry',String(imageRetries));img.src=retryURL.href;return;}img.hidden=true;$('wardrobeArtStatus').textContent='일러스트를 불러오지 못했습니다.';};if(s.illustration){img.src=asset('characters/'+skinAssetCharacter(s),s.illustration.replace(/^illust_/,''));$('wardrobe').style.setProperty('--wardrobe-backdrop',`url("${img.src}")`);if(img.complete&&img.naturalWidth)img.onload?.();}else{img.hidden=true;$('wardrobeArtStatus').textContent='등록된 일러스트가 없습니다.';}if(!detail.hidden)showIllustration(s);}
$('wardrobeOperator').onclick=()=>{$('wardrobeDialog').showModal();$('wardrobeSearch').focus();};
$('wardrobeClose').onclick=()=>$('wardrobeDialog').close();$('wardrobeDialog').addEventListener('click',e=>{if(e.target===$('wardrobeDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
document.querySelector('[data-tab="wardrobe"]')?.addEventListener('click',()=>window.dispatchEvent(new Event('wardrobe-request-account')));if(!demo)window.addEventListener('wardrobe-account',e=>accept(e.detail));if(!demo)window.addEventListener('mining-clear',()=>{try{localStorage.removeItem('zootAdminWardrobeSkins');localStorage.removeItem('zootAdminWardrobeCharacters');}catch{}clearIllustration();clearSD();owned=null;characters=[];$('wardrobeRosterGrid').replaceChildren();$('wardrobeDetail').hidden=true;$('wardrobeRoster').hidden=false;$('wardrobeGrid').replaceChildren();$('wardrobeCount').textContent='';$('wardrobeMessage').textContent='계정 데이터를 지웠습니다.';$('wardrobeDialog').close();});$('wardrobeSearch').oninput=render;$('wardrobeAll').onchange=render;

if(!demo)window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='preview-account')accept(e.data.account);if(e.data?.type==='preview-clear')window.dispatchEvent(new Event('mining-clear'));});if(!demo&&parent!==window)parent.postMessage({type:'preview-account-request'},location.origin);

if(!demo)try{const ids=JSON.parse(localStorage.getItem('zootAdminWardrobeSkins')||'null');if(Array.isArray(ids))accept({user:{skin:{characterSkins:Object.fromEntries(ids.filter(id=>typeof id==='string').map(id=>[id,1]))},troop:{chars:JSON.parse(localStorage.getItem('zootAdminWardrobeCharacters')||'[]').map(c=>({...c,evolvePhase:c.elite}))}}});}catch{}

function readImportedSkins(){try{const data=JSON.parse(localStorage.getItem('arknightsOneTimeRewardsV1')||'null');if(ownedSkins(data))accept(data);}catch{}}
if(!demo){window.addEventListener('arknights-account-updated',readImportedSkins);window.addEventListener('storage',e=>{if(e.key==='arknightsOneTimeRewardsV1'||e.key==='zootAdminWardrobeSkins')readImportedSkins();});readImportedSkins();}

$('wardrobeLoad').addEventListener('click',async()=>{if(demo){location.href='/preview/wardrobe?import=1';return;}try{const {openAccountImport}=await import('/preview/assets/js/account-menu.mjs');await openAccountImport();}catch{$('wardrobeMessage').textContent='계정 가져오기를 열지 못했습니다. 새로고침 후 다시 시도해 주세요.';}});

const wardrobeProfessions={PIONEER:'뱅가드',WARRIOR:'가드',TANK:'디펜더',SNIPER:'스나이퍼',CASTER:'캐스터',MEDIC:'메딕',SUPPORT:'서포터',SPECIAL:'스페셜리스트'};
let rosterFilters={professions:new Set(),rarities:new Set([1,2,3,4,5,6]),ownership:'all'},rosterGrouped=false,rosterSort='rarity',rosterSortReverse=false;
function renderRosterProfessionTabs(){
 const tabs=$('wardrobeProfessionTabs');tabs.replaceChildren();
 for(const [id,label]of [['','전체'],...Object.entries(wardrobeProfessions)]){const button=make('button');button.type='button';button.className='class-tab';button.dataset.class=id;button.title=label;button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(id?rosterFilters.professions.has(id):!rosterFilters.professions.size));
 if(id){const glyph=make('span');glyph.className='class-glyph';glyph.setAttribute('aria-hidden','true');glyph.style.setProperty('--icon-x',String(-Object.keys(wardrobeProfessions).indexOf(id)));glyph.style.setProperty('--icon-y','0');button.append(glyph);}button.append(make('span',label));button.onclick=()=>{rosterFilters.professions=new Set(id?[id]:[]);renderRoster();};tabs.append(button);}
}
function renderRoster(){
 if(!catalog||!owned)return;renderRosterProfessionTabs();renderRosterSort();$('wardrobeSkinOwnership').value=rosterFilters.ownership;for(const button of $('wardrobeInlineRarities').querySelectorAll('button'))button.setAttribute('aria-pressed',String(rosterFilters.rarities.has(Number(button.dataset.inlineRarity))));
 const grid=$('wardrobeRosterGrid'),groups=new Map();grid.replaceChildren();
 for(const skin of catalog){if(!groups.has(skin.charId))groups.set(skin.charId,[]);groups.get(skin.charId).push(skin);}
 const characterMap=new Map(characters.map(c=>[c.charId,c]));
 const source=rosterFilters.ownership!=='owned'?[...groups.keys()].map(charId=>characterMap.get(charId)||{charId}):characters;
 const query=$('wardrobeRosterSearch').value.trim().toLocaleLowerCase('ko'),filter=rosterFilters.ownership,sort=rosterSort,order=Object.keys(wardrobeProfessions);
 const rows=source.filter(c=>c.charId.startsWith('char_')&&(!rosterMetadataLoaded||rosterMetadata[c.charId])).map(c=>{const skins=groups.get(c.charId)||[],outfits=skins.filter(s=>!s.basic),meta=rosterMetadata[c.charId]||{};return {c,skins,name:skins[0]?.operator||c.charId,rarity:meta.rarity||0,profession:meta.profession||'',owned:outfits.filter(s=>owned.has(s.id)).length,total:outfits.length};});
 const filtered=rows.filter(r=>matchesSearch(query,[r.name,...r.skins.map(s=>s.name),...aliasesFor(r.name)])&&(!rosterFilters.professions.size||rosterFilters.professions.has(r.profession))&&rosterFilters.rarities.has(r.rarity)&&(filter!=='owned'||r.owned>0)&&(filter!=='missing'||r.skins.some(s=>!isSkinOwned(s))));
 const alphabetical=(a,b)=>a.name.localeCompare(b.name,'ko'),professionRank=r=>order.includes(r.profession)?order.indexOf(r.profession):99;
 const compare=(a,b)=>sort==='name'?alphabetical(a,b):sort==='owned'?b.owned-a.owned||b.rarity-a.rarity||alphabetical(a,b):b.rarity-a.rarity||professionRank(a)-professionRank(b)||alphabetical(a,b);
 filtered.sort((a,b)=>(rosterGrouped?professionRank(a)-professionRank(b):0)||(rosterSortReverse?-1:1)*compare(a,b));
 const labels=[...[...rosterFilters.rarities].sort((a,b)=>b-a).map(n=>n+'★'),...(filter==='all'?[]:[filter==='owned'?'보유':'미보유'])];
 $('wardrobeRosterFilterSummary').textContent=labels.join(' · ');$('wardrobeRosterFilterSummary').hidden=!labels.length;$('wardrobeRosterFilterOpen').textContent='필터'+(labels.length?' · '+labels.length:'');$('wardrobeRosterFilterOpen').classList.toggle('is-active',!!labels.length);
 $('wardrobeRosterSummary').textContent=filtered.length+'명 · 스킨 '+filtered.reduce((n,r)=>n+r.owned,0)+' / '+filtered.reduce((n,r)=>n+r.total,0);
 $('wardrobeRosterEmpty').hidden=filtered.length>0;
 let previousProfession;
 for(const r of filtered){
  if(rosterGrouped&&r.profession!==previousProfession){const heading=make('h3',wardrobeProfessions[r.profession]||'기타');heading.className='wardrobe-roster-group-heading';heading.append(make('span',filtered.filter(v=>v.profession===r.profession).length+'명'));grid.append(heading);previousProfession=r.profession;}
  const {c,skins,name}=r,current=skins.find(s=>s.id===(previewEquipped.get(c.charId)||c.skin))||skins.find(s=>s.basic&&s.elite===(c.elite>=2?2:0))||skins[0];
  const button=make('button');button.type='button';button.className='wardrobe-roster-card';button.dataset.rarity=String(r.rarity);button.setAttribute('aria-label',name+' · 스킨 '+r.owned+' / '+r.total);button.style.setProperty('--roster-rarity',({6:'#ff9b45',5:'#e5c65a',4:'#b99bdb',3:'#72a8d0',2:'#94b36e',1:'#a8a8a8'})[r.rarity]||'var(--z-border)');
  const visual=make('div');visual.className='wardrobe-roster-visual';const img=make('img');img.alt='';img.loading='lazy';img.decoding='async';if(current?.portrait)img.src='https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/portrait/'+encodeURIComponent(current.portrait)+'.png';img.onerror=()=>{img.hidden=true;};visual.append(img);
  const info=make('div');info.className='wardrobe-roster-info';info.append(make('strong',name),make('small','스킨 '+r.owned+' / '+r.total));button.append(visual,info);
  button.onclick=()=>{$('wardrobeAll').checked=true;selectedChar=c.charId;selectedSkin=current?.id;$('wardrobeSearch').value='';$('wardrobeRoster').hidden=true;$('wardrobeDetail').hidden=false;render();};grid.append(button);
 }
}
function renderRosterSort(){
 for(const button of $('wardrobeRosterSort').querySelectorAll('[data-sort]'))button.setAttribute('aria-pressed',String(button.dataset.sort===rosterSort));
 const ascending=(rosterSort==='name')!==rosterSortReverse,direction=$('wardrobeRosterSortDirection');direction.setAttribute('aria-pressed',String(rosterSortReverse));direction.dataset.direction=ascending?'asc':'desc';direction.title=(ascending?'오름차순':'내림차순')+' · 클릭하여 반전';
 for(const button of $('wardrobeRosterSort').querySelectorAll('[data-sort]'))button.title=(button.dataset.sort==='owned'?'보유 스킨 수 기준 · ':'')+'선택 · 다시 누르면 역순';
}
for(const button of $('wardrobeRosterSort').querySelectorAll('[data-sort]'))button.onclick=()=>{if(rosterSort===button.dataset.sort)rosterSortReverse=!rosterSortReverse;else{rosterSort=button.dataset.sort;rosterSortReverse=false;}renderRoster();};
$('wardrobeRosterSortDirection').onclick=()=>{rosterSortReverse=!rosterSortReverse;renderRoster();};
$('wardrobeRosterGroup').onclick=()=>{rosterGrouped=!rosterGrouped;$('wardrobeRosterGroup').setAttribute('aria-pressed',String(rosterGrouped));renderRoster();};
const rosterFilterDialog=$('wardrobeRosterFilters');
function fillRosterFilterDialog(filters){for(const button of rosterFilterDialog.querySelectorAll('[data-rarity]'))button.setAttribute('aria-pressed',String(filters.rarities.has(Number(button.dataset.rarity))));for(const button of rosterFilterDialog.querySelectorAll('[data-ownership]'))button.setAttribute('aria-pressed',String(filters.ownership===button.dataset.ownership));}
$('wardrobeRosterFilterOpen').onclick=()=>{fillRosterFilterDialog(rosterFilters);rosterFilterDialog.showModal();};
for(const button of rosterFilterDialog.querySelectorAll('[data-rarity]'))button.onclick=()=>button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));
for(const button of rosterFilterDialog.querySelectorAll('[data-ownership]'))button.onclick=()=>{for(const other of rosterFilterDialog.querySelectorAll('[data-ownership]'))other.setAttribute('aria-pressed',String(other===button));};
$('wardrobeFilterReset').onclick=()=>fillRosterFilterDialog({professions:new Set(),rarities:new Set([1,2,3,4,5,6]),ownership:'all'});
for(const id of ['wardrobeFilterClose','wardrobeFilterCancel'])$(id).onclick=()=>rosterFilterDialog.close();
rosterFilterDialog.addEventListener('click',e=>{if(e.target!==rosterFilterDialog)return;const r=rosterFilterDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)rosterFilterDialog.close();});
$('wardrobeFilterApply').onclick=()=>{rosterFilters={professions:new Set(rosterFilters.professions),rarities:new Set([...rosterFilterDialog.querySelectorAll('[data-rarity][aria-pressed="true"]')].map(b=>Number(b.dataset.rarity))),ownership:rosterFilterDialog.querySelector('[data-ownership][aria-pressed="true"]')?.dataset.ownership||'all'};rosterFilterDialog.close();renderRoster();};
$('wardrobeBack').onclick=()=>{clearIllustration();stopSeriesMotion();seriesDrag=null;stopCardMotion();cancelAnimationFrame(dragFrame);dragFrame=0;drag=null;clearOldScenes();clearSD();$('wardrobeRoster').hidden=false;$('wardrobeDetail').hidden=true;};$('wardrobeRosterSearch').oninput=renderRoster;
if(!demo)try{characters=JSON.parse(localStorage.getItem('zootAdminWardrobeCharacters')||'[]');}catch{}

function updateWear(s){const character=characters.find(c=>c.charId===s.charId);const equipped=previewEquipped.get(s.charId)||character?.skin||catalog.find(v=>v.charId===s.charId&&v.basic&&v.elite===(character?.elite>=2?2:0))?.id;const allowed=owned.has(s.id)||s.basic&&(character?.elite??0)>=(s.elite||0);const current=equipped===s.id,button=$('wardrobeOwned');button.textContent=current?'현재 복장':allowed?'변경':'미보유';button.disabled=current||!allowed;button.classList.toggle('is-equipped',current);button.onclick=()=>{if(!allowed||current)return;previewEquipped.set(s.charId,s.id);updateWear(s);renderRoster();};}
function paintCards(){
 for(const layer of sceneLayers)applyLeftMotion(layer.el,cardState-layer.index);
 const buttons=[...$('wardrobeGrid').children],scale=862/810,fullWidth=154.39999*scale;
 for(const frame of nativeCardFrames(cardState,buttons.length)){
  const button=buttons[frame.index],visible=frame.weight>0;
  Object.assign(button.style,{width:frame.width*scale+'px',left:`calc(50% + ${frame.x*scale-frame.width*scale/2}px)`,transform:'none',opacity:String(frame.opacity),zIndex:String(100-Math.round(Math.abs(frame.index-cardState)*10)),pointerEvents:visible?'auto':'none'});
  button.dataset.motionWeight=String(frame.weight);
  // Keep portrait pixels at native size while the enclosing bound narrows.
  let content=button.querySelector('.native-card-content');
  if(!content){content=make('div');content.className='native-card-content';content.append(...button.childNodes);button.append(content);}
  Object.assign(content.style,{position:'absolute',top:'0',left:'50%',width:fullWidth+'px',height:'100%',transform:'translateX(-50%)'});
  for(const el of button.querySelectorAll('.native-card-logo,.native-card-name'))el.style.opacity=String(frame.detailOpacity);
  const wash=button.querySelector('.native-card-wash');if(wash)wash.style.opacity=String(frame.wash);
 }
 $('wardrobeGrid').dataset.motionState=String(cardState);
}
function updateCardArrows(){const buttons=[...$('wardrobeGrid').children],selected=buttons.findIndex(b=>b.dataset.skin===selectedSkin);for(const [id,off]of [['wardrobePrev',-1],['wardrobeNext',1]]){const button=$(id);button.disabled=!buttons[selected+off];button.hidden=button.disabled;}}
function layoutCards(){stopCardMotion();cardState=[...$('wardrobeGrid').children].findIndex(b=>b.dataset.skin===selectedSkin);sceneLayers=[{el:$('wardrobeNativeScene'),sd:$('wardrobeSD'),index:cardState}];paintCards();updateCardArrows();}
function finishLeftMotion(){const current=$('wardrobeNativeScene');for(const layer of sceneLayers)if(layer.el!==current){releaseSD(layer.sd);layer.el.remove();}sceneLayers=sceneLayers.filter(layer=>layer.el===current);}
function animateCards(target,frames,smooth=false){if(smooth){stopCardMotion();const version=motionVersion,start=cardState;let begun;const tick=time=>{if(version!==motionVersion)return;begun??=time;const t=Math.min(1,(time-begun)/360),eased=1-(1-t)**3;cardState=start+(target-start)*eased;paintCards();if(t<1)motionFrame=requestAnimationFrame(tick);else finishLeftMotion();};motionFrame=requestAnimationFrame(tick);return;}stopCardMotion();const version=motionVersion,start=cardState;let step=0;const tick=()=>{if(version!==motionVersion)return;cardState=start+(target-start)*(++step/frames);paintCards();if(step<frames)motionFrame=requestAnimationFrame(tick);else finishLeftMotion();};motionFrame=requestAnimationFrame(tick);}
function switchLeftSkin(id,target){if(selectedSkin===id)return;const skin=catalog.find(s=>s.id===id);if(!skin)return;
 // A rapid reversal may revisit a still-outgoing template: discard only that stale copy.
 for(const layer of sceneLayers.filter(l=>l.index===target&&l.el.id!=='wardrobeNativeScene')){releaseSD(layer.sd);layer.el.remove();sceneLayers=sceneLayers.filter(l=>l!==layer);}
 retainLeftScene();selectedSkin=id;show(skin);sceneLayers.push({el:$('wardrobeNativeScene'),sd:$('wardrobeSD'),index:target});
 for(const b of $('wardrobeGrid').children)b.setAttribute('aria-pressed',String(b.dataset.skin===id));updateCardArrows();paintCards();}
function selectCard(id,frames,smooth=false){const buttons=[...$('wardrobeGrid').children],target=buttons.findIndex(b=>b.dataset.skin===id);if(target<0)return;for(let i=Math.ceil(Math.min(cardState,target));i<=Math.floor(Math.max(cardState,target));i++){if(i!==target&&buttons[i]&&!sceneLayers.some(layer=>layer.index===i))switchLeftSkin(buttons[i].dataset.skin,i);}switchLeftSkin(id,target);animateCards(target,frames,smooth);}
for(const [id,direction]of [['wardrobePrev',-1],['wardrobeNext',1]])$(id).onclick=()=>{const buttons=[...$('wardrobeGrid').children],i=buttons.findIndex(b=>b.dataset.skin===selectedSkin);if(buttons[i+direction])selectCard(buttons[i+direction].dataset.skin,NATIVE_MOTION.clickFrames);};
let dragFrame=0;
function updateSmoothDrag(time){dragFrame=0;if(!drag)return;const dt=drag.lastTime===undefined?1000/60:Math.max(0,time-drag.lastTime);drag.lastTime=time;cardState+=(drag.target-cardState)*(1-Math.exp(-dt/100));if(Math.abs(drag.target-cardState)<.0001)cardState=drag.target;const nearest=Math.round(cardState),card=strip.children[nearest];if(card&&card.dataset.skin!==selectedSkin)switchLeftSkin(card.dataset.skin,nearest);paintCards();if(Math.abs(drag.target-cardState)>.0001)dragFrame=requestAnimationFrame(updateSmoothDrag);}
let suppressSwipeClick=false;const strip=$('wardrobeGrid');
strip.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;stopCardMotion();drag={id:e.pointerId,x:e.clientX,state:cardState,target:cardState,moved:false};});
strip.addEventListener('click',e=>{if(suppressSwipeClick){e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const scale=$('wardrobeDetail').getBoundingClientRect().width/1535,dx=(e.clientX-drag.x)/scale;if(Math.abs(dx)>5)drag.moved=true;if(drag.moved){drag.target=nativeDragState(drag.state,dx,strip.children.length,1535*.1);if(!dragFrame){drag.lastTime=undefined;dragFrame=requestAnimationFrame(updateSmoothDrag);}}});
function endCardDrag(e,cancelled=false){if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved,intended=drag.target;cancelAnimationFrame(dragFrame);dragFrame=0;drag=null;if(moved){suppressSwipeClick=true;setTimeout(()=>{suppressSwipeClick=false;},0);const target=cancelled?[...strip.children].findIndex(b=>b.dataset.skin===selectedSkin):Math.round(intended);if(strip.children[target])selectCard(strip.children[target].dataset.skin,NATIVE_MOTION.snapFrames,true);}else animateCards([...strip.children].findIndex(b=>b.dataset.skin===selectedSkin),NATIVE_MOTION.snapFrames);}
window.addEventListener('pointerup',e=>endCardDrag(e));window.addEventListener('pointercancel',e=>endCardDrag(e,true));
window.addEventListener('blur',()=>{if(drag)endCardDrag({pointerId:drag.id},true);});

$('wardrobeZoom').onclick=illustrationFullscreen;
function fitCollection(){
 const detail=$('wardrobeDetail'),wrap=$('wardrobe');
 if(detail.hidden){wrap.style.removeProperty('--collection-height');detail.style.removeProperty('left');return;}
 const barBottom=document.querySelector('.zoot-topbar')?.getBoundingClientRect().bottom||0;
 const fullHeight=Math.max(1,(window.visualViewport?.height??window.innerHeight)-barBottom),mobile=window.matchMedia('(max-width:900px)').matches;const available=Math.max(1,mobile?fullHeight*.52:fullHeight);
 const scale=Math.min(wrap.clientWidth/1535,available/862);
 detail.style.setProperty('--collection-scale',String(scale));
 detail.style.left='0px';
 const canvasHeight=scale*862;wrap.style.setProperty('--collection-height',(mobile?canvasHeight:available)+'px');wrap.closest('main').style.setProperty('--wardrobe-mobile-canvas-height',canvasHeight+'px');
}
new ResizeObserver(fitCollection).observe($('wardrobe'));
new MutationObserver(()=>{fitCollection();syncWardrobeBackButton();}).observe($('wardrobeDetail'),{attributes:true,attributeFilter:['hidden']});
window.addEventListener('resize',fitCollection);window.visualViewport?.addEventListener('resize',fitCollection);fitCollection();


if(demo){
 $('wardrobeAll').checked=true;
 (async()=>{try{
  const response=await fetch('/wardrobe/catalog.json');if(!response.ok)throw Error();catalog=(await response.json()).skins;
  const chars=Object.fromEntries([...new Set(catalog.map(s=>s.charId))].map(charId=>[charId,{charId,evolvePhase:2}]));
  selectedChar='char_2023_ling';selectedSkin='char_2023_ling#2';
  await accept({user:{skin:{characterSkins:Object.fromEntries(catalog.filter(s=>!s.basic&&!(new URLSearchParams(location.search).get('unowned')==='1'&&s.id==='char_2023_ling@nian#9')).map(s=>[s.id,1]))},troop:{chars}}});
  if($('wardrobeGrid').children.length){$('wardrobeRoster').hidden=true;$('wardrobeDetail').hidden=false;render();}
 }catch{$('wardrobeMessage').textContent='테스트 화면을 불러오지 못했습니다.';}})();
}

// The same shared top bar as the public pages; keep preview navigation intentional.
function connectSiteNavigation(){
 const root=demo?'https://moonwhale-ko.github.io/-Arknights-Tool/':'/preview/';
 for(const link of document.querySelectorAll('.zoot-topbar a,.zoot-drawer nav a'))link.href=root+link.getAttribute('href');
 for(const img of document.querySelectorAll('.zoot-drawer nav img'))img.src='https://raw.githubusercontent.com/MoonWhale-ko/-Arknights-Tool/main/'+img.getAttribute('src');
 if(demo){const account=$('zootAccountImport');account?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();location.href=root+'operators.html';},true);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{connectSiteNavigation();syncWardrobeBackButton();});else{connectSiteNavigation();syncWardrobeBackButton();}

function isSkinOwned(s){const character=characters.find(c=>c.charId===s.charId);return s.basic?!!character&&(character.elite??0)>=(s.elite??0):owned?.has(s.id)===true;}
function jumpToSkin(s){
 $('wardrobeAll').checked=true;$('wardrobeSearch').value='';
 if(selectedChar===s.charId&&[...$('wardrobeGrid').children].some(b=>b.dataset.skin===s.id)){selectCard(s.id,NATIVE_MOTION.clickFrames);return;}
 selectedChar=s.charId;selectedSkin=s.id;$('wardrobeRoster').hidden=true;$('wardrobeDetail').hidden=false;render();
}
function skinThumb(s,compact=false){
 const button=make('button');button.type='button';button.className='wardrobe-skin-tile'+(isSkinOwned(s)?'':' unowned');button.setAttribute('aria-label',s.operator+' · '+s.name);button.setAttribute('aria-pressed',String(s.id===selectedSkin));
 const image=make('img');image.alt='';image.loading='lazy';image.src='https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/portrait/'+encodeURIComponent(s.portrait)+'.png';image.onerror=()=>{image.hidden=true;};
 const text=make('span');if(compact)text.append(make('small',s.operator));text.append(make('strong',s.basic?(s.elite>=2?'2정예화':'기본 복장'):s.name),make('small',isSkinOwned(s)?'보유':'미보유'));button.append(image,text);button.onclick=()=>jumpToSkin(s);return button;
}

let seriesRows=[],seriesPosition=0,seriesRAF=0,seriesDrag=null,seriesSuppressClick=false;
function stopSeriesMotion(){cancelAnimationFrame(seriesRAF);seriesRAF=0;}
function paintSeries(){
 const list=$('wardrobeSeriesSkins'),width=Math.min(122,list.clientWidth/2.7),ratio=width/NATIVE_MOTION.boundWidth;const height=width*394/154.39999;list.style.setProperty('--series-card-height',height+'px');$('wardrobeSeriesCarousel').style.height=(height+4)+'px';
 for(const frame of nativeCardFrames(seriesPosition,seriesRows.length)){
  const card=list.children[frame.index];card.hidden=frame.weight<=.001;card.tabIndex=Math.abs(frame.index-seriesPosition)<.5?0:-1;
  card.style.setProperty('--series-image-width',width+'px');Object.assign(card.style,{width:frame.width*ratio+'px',left:`calc(50% + ${frame.x*ratio-frame.width*ratio/2}px)`,opacity:String(frame.opacity),zIndex:String(100-Math.round(Math.abs(frame.index-seriesPosition)*10))});card.style.setProperty('--series-wash',String(frame.wash));card.setAttribute('aria-pressed',String(frame.index===Math.round(seriesPosition)));
 }
 const i=Math.round(seriesPosition),skin=seriesRows[i];$('wardrobeSeriesPrev').disabled=i<=0;$('wardrobeSeriesNext').disabled=i>=seriesRows.length-1;

 list.dataset.position=String(seriesPosition);
}
function moveSeries(target){stopSeriesMotion();target=Math.max(0,Math.min(seriesRows.length-1,target));const start=seriesPosition;let begun;const tick=time=>{begun??=time;const t=Math.min(1,(time-begun)/360);seriesPosition=start+(target-start)*(1-(1-t)**3);paintSeries();if(t<1)seriesRAF=requestAnimationFrame(tick);else seriesRAF=0;};seriesRAF=requestAnimationFrame(tick);}
function renderSeries(){
 stopSeriesMotion();seriesDrag=null;
 const id=skinSeriesCategory(catalog.find(s=>s.id===selectedSkin))?.id,all=catalog.filter(s=>s.charId.startsWith('char_')&&skinSeriesCategory(s)?.id===id).sort((a,b)=>a.operator.localeCompare(b.operator,'ko')||compareSkinOrder(a,b));seriesRows=all;
 $('wardrobeSeriesCount').textContent=all.length?seriesRows.length+'종':'';
 const current=seriesRows.findIndex(s=>s.id===selectedSkin);seriesPosition=Math.max(0,current);
 const list=$('wardrobeSeriesSkins');list.replaceChildren(...seriesRows.map((skin,i)=>{const card=skinThumb(skin,true);card.classList.add('wardrobe-series-card');const text=card.querySelector('span');text.replaceChildren(make('strong',skin.operator),make('small',skin.name),make('small',(i+1)+'/'+seriesRows.length));card.onclick=()=>{if(seriesSuppressClick)return;if(i===Math.round(seriesPosition))jumpToSkin(skin);else moveSeries(i);};return card;}));
 $('wardrobeSeriesCarousel').hidden=!seriesRows.length;
 const empty=$('wardrobeSeriesEmpty');empty.hidden=seriesRows.length>0;empty.textContent='등록된 스킨이 없습니다.';paintSeries();
}
$('wardrobeSeriesPrev').onclick=()=>moveSeries(Math.round(seriesPosition)-1);$('wardrobeSeriesNext').onclick=()=>moveSeries(Math.round(seriesPosition)+1);
const seriesRail=$('wardrobeSeriesSkins');
seriesRail.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();moveSeries(Math.round(seriesPosition)+(e.key==='ArrowLeft'?-1:1));}});
seriesRail.addEventListener('pointerdown',e=>{if(e.button!==0||!seriesRows.length)return;stopSeriesMotion();seriesDrag={id:e.pointerId,x:e.clientX,start:seriesPosition,target:seriesPosition,moved:false};});
function followSeriesDrag(time){seriesRAF=0;if(!seriesDrag)return;const dt=seriesDrag.time===undefined?16.67:Math.max(0,time-seriesDrag.time);seriesDrag.time=time;seriesPosition+=(seriesDrag.target-seriesPosition)*(1-Math.exp(-dt/80));if(Math.abs(seriesDrag.target-seriesPosition)<.0001)seriesPosition=seriesDrag.target;paintSeries();if(Math.abs(seriesDrag.target-seriesPosition)>.0001)seriesRAF=requestAnimationFrame(followSeriesDrag);}
window.addEventListener('pointermove',e=>{if(!seriesDrag||seriesDrag.id!==e.pointerId)return;const dx=e.clientX-seriesDrag.x;if(Math.abs(dx)>5)seriesDrag.moved=true;if(!seriesDrag.moved)return;seriesDrag.target=Math.max(0,Math.min(seriesRows.length-1,seriesDrag.start-dx/(seriesRail.clientWidth*.2)));if(!seriesRAF){seriesDrag.time=undefined;seriesRAF=requestAnimationFrame(followSeriesDrag);}});
function endSeriesDrag(e){if(!seriesDrag||seriesDrag.id!==e.pointerId)return;const {moved,target}=seriesDrag;seriesDrag=null;stopSeriesMotion();if(moved){seriesSuppressClick=true;setTimeout(()=>{seriesSuppressClick=false;},0);moveSeries(Math.round(target));}}
window.addEventListener('pointerup',endSeriesDrag);window.addEventListener('pointercancel',endSeriesDrag);window.addEventListener('blur',()=>{if(seriesDrag)endSeriesDrag({pointerId:seriesDrag.id});});
new ResizeObserver(()=>{if(seriesRows.length&&!$('wardrobeSeriesSection').hidden)paintSeries();}).observe(seriesRail);

function renderSidebar(s){
 $('wardrobeSideOperator').textContent=s.operator;$('wardrobeSideName').textContent=s.basic?(s.elite>=2?'2정예화':'기본 복장'):s.name;$('wardrobeSideBrand').textContent=s.brand;
 const owned=isSkinOwned(s),status=$('wardrobeSideOwned');status.textContent=owned?'보유':'미보유';status.classList.toggle('is-owned',owned);
 const price=$('wardrobeSidePrice');price.replaceChildren();
 if(s.basic||s.price?.amount===0||s.price?.currency==='이벤트 재화')price.textContent='무료';
 else if(s.price?.currency==='순오리지늄'){const icon=make('img');icon.src='https://raw.githubusercontent.com/MoonWhale-ko/-Arknights-Tool/985c0b2f3b64ef7ef1f7394f7a75aab17817ade2/assets/icons/currency/originite-prime.png?v=2';icon.alt='순오리지늄';const secret=make('button');secret.type='button';secret.className='wardrobe-cost-trigger';secret.setAttribute('aria-label','보유 스킨의 순오리지늄 합계 보기');secret.append(icon);secret.onclick=showCollectionCost;price.append(secret,document.createTextNode(s.price.amount.toLocaleString('ko-KR')));}
 else if(s.price?.currency==='KRW'&&Number.isFinite(s.price.amount))price.textContent='₩'+s.price.amount.toLocaleString('ko-KR');
 else price.textContent='—';
 const routes=acquisitionRoutes[s.id]?.routes??(s.obtain?s.obtain.split(',').map(v=>v.trim()).filter(Boolean):['획득 경로 확인 필요']);$('wardrobeSideObtain').replaceChildren(...[...new Set(routes)].map(route=>make('span',route)));
 const category=skinSeriesCategory(s);$('wardrobeSeriesSection').hidden=!category;
 if(!category){stopSeriesMotion();seriesDrag=null;seriesRows=[];$('wardrobeSeriesSkins').replaceChildren();$('wardrobeSeriesCount').textContent='';return;}
 renderSeries();
}

function syncWardrobeBackButton(){
 const home=document.querySelector('.zoot-topbar a[aria-label="홈"]');if(!home)return;
 let back=$('wardrobeHeaderBack');if(!back){back=make('button');back.id='wardrobeHeaderBack';back.type='button';back.className='zoot-icon';back.setAttribute('aria-label','이전');back.title='오퍼레이터 목록으로';back.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>';back.onclick=()=>{$('wardrobeBack').click();};home.before(back);}
 const detailOpen=!$('wardrobeDetail').hidden;home.hidden=detailOpen;back.hidden=!detailOpen;
}

if(!demo&&new URLSearchParams(location.search).get('import')==='1')$('wardrobeLoad').click();

$('wardrobeSkinOwnership').onchange=e=>{rosterFilters.ownership=e.target.value;renderRoster();};
for(const button of $('wardrobeInlineRarities').querySelectorAll('button'))button.onclick=()=>{const n=Number(button.dataset.inlineRarity);if(rosterFilters.rarities.has(n))rosterFilters.rarities.delete(n);else rosterFilters.rarities.add(n);renderRoster();};

let costTimer=0,costOpener,costRun=0;
const costDialog=make('dialog');costDialog.className='wardrobe-cost-dialog';costDialog.setAttribute('aria-label','보유 스킨 재화 환산');
costDialog.innerHTML='<button type="button" class="wardrobe-cost-close" aria-label="닫기">×</button><div class="wardrobe-cost-stage"><p class="wardrobe-cost-sentence" role="status" aria-live="polite"></p></div><p class="wardrobe-cost-basis" hidden>등록 가격 합계 · 185개당 119,000원 · 2026 최저시급 10,320원 기준<br>실제 결제액과 다를 수 있습니다.</p>';
document.body.append(costDialog);
costDialog.querySelector('button').onclick=()=>costDialog.close();
costDialog.addEventListener('close',()=>{costRun++;clearTimeout(costTimer);costTimer=0;costDialog.getAnimations({subtree:true}).forEach(a=>a.cancel());costOpener?.focus();});
function showCollectionCost(){
 if(costDialog.open)return;costOpener=document.activeElement;
 const {total}=collectionOriginiteCost(catalog,owned),{won,hours}=originiteCashEquivalent(total),sentence=costDialog.querySelector('.wardrobe-cost-sentence'),basis=costDialog.querySelector('.wardrobe-cost-basis');
 const lines=['스킨에 쓴 순오리지늄 '+total.toLocaleString('ko-KR')+'개','현금으로 '+won.toLocaleString('ko-KR')+' 원',hours.toLocaleString('ko-KR',{minimumFractionDigits:1,maximumFractionDigits:1})+' 시간 동안 일한 돈'];
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;basis.hidden=true;sentence.textContent='';costDialog.showModal();
 const run=++costRun;
 async function reveal(index){
  if(!costDialog.open||run!==costRun)return;
  sentence.getAnimations().forEach(a=>a.cancel());sentence.style.opacity='0';sentence.textContent=lines[index];basis.hidden=index!==lines.length-1;
  if(reduce){sentence.style.opacity='1';if(index<lines.length-1)costTimer=setTimeout(()=>reveal(index+1),4600);return;}
  try{
   await sentence.animate([{opacity:0},{opacity:1}],{duration:1600,easing:'ease-in-out',fill:'forwards'}).finished;
   if(!costDialog.open||run!==costRun)return;
   costTimer=setTimeout(async()=>{
    if(!costDialog.open||run!==costRun)return;
    try{await sentence.animate([{opacity:1},{opacity:0}],{duration:1400,easing:'ease-in-out',fill:'forwards'}).finished;}catch{return;}
    if(!costDialog.open||run!==costRun)return;
    if(index<lines.length-1)costTimer=setTimeout(()=>reveal(index+1),500);
    else costDialog.close();
   },2400);
  }catch{}
 }

 reveal(0);
}
