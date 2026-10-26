const $=id=>document.getElementById(id),make=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
let catalog,owned=null,selectedChar=null,selectedSkin=null;
const asset=(folder,id)=>`https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/${folder}/${encodeURIComponent(id)}.png`;
export function ownedSkins(data){const skins=(data?.snapshot?.user??data?.user??data?.rewards?.user)?.skin?.characterSkins;if(!skins||typeof skins!=='object')return null;return new Set(Object.entries(skins).filter(([,value])=>Number(value)>0).map(([id])=>id));}
async function accept(data){if(!data)return;owned=ownedSkins(data);if(owned){try{localStorage.setItem('zootAdminWardrobeSkins',JSON.stringify([...owned]));}catch{}}if(!owned){$('wardrobeMessage').textContent='스킨 보유 정보가 없습니다. 관리자 계정을 다시 가져와 주세요.';$('wardrobeGrid').replaceChildren();$('wardrobeCount').textContent='';return;}try{if(!catalog){const r=await fetch('/wardrobe/catalog.json');if(!r.ok)throw Error();catalog=(await r.json()).skins;}render();}catch{$('wardrobeMessage').textContent='스킨 목록을 불러오지 못했습니다. 다시 적용해 주세요.';}}
function render(){
 if(!catalog||!owned)return;
 const query=$('wardrobeSearch').value.trim().toLocaleLowerCase(),all=$('wardrobeAll').checked,known=new Set(catalog.map(s=>s.id));
 const unknown=[...owned].filter(id=>!known.has(id)).map(id=>({id,charId:id.split('@')[0],operator:id.split('@')[0],name:'이름 확인 필요',brand:'게임 목록 미등록'}));
 const rows=[...catalog,...unknown].filter(s=>(all||owned.has(s.id))&&[s.operator,s.name,s.brand,s.id].join(' ').toLocaleLowerCase().includes(query)).sort((a,b)=>Number(owned.has(b.id))-Number(owned.has(a.id))||a.operator.localeCompare(b.operator,'ko')||a.name.localeCompare(b.name,'ko'));
 $('wardrobeMessage').textContent=`보유 스킨 ${owned.size}종 · 기본·정예화 외형 제외`;
 const chars=new Map();for(const skin of rows){if(!chars.has(skin.charId))chars.set(skin.charId,[]);chars.get(skin.charId).push(skin);}
 const list=$('wardrobeOperators');list.replaceChildren();for(const [id,skins]of chars){const button=make('button',skins[0].operator);button.type='button';button.append(make('small',`${skins.length}종`));button.onclick=()=>{selectedChar=id;selectedSkin=null;render();$('wardrobeDialog').close();};list.append(button);}
 if(!chars.has(selectedChar))selectedChar=rows[0]?.charId??null;
 const skins=chars.get(selectedChar)||[];
 $('wardrobeCount').textContent=`${chars.size}명 · ${rows.length}종`;
 $('wardrobeOperator').textContent=skins[0]?.operator||'오퍼레이터 선택';
 const grid=$('wardrobeGrid');grid.replaceChildren();
 if(!skins.length){$('wardrobeArt').hidden=true;$('wardrobeArt').removeAttribute('src');$('wardrobeArtStatus').textContent='조건에 맞는 스킨이 없습니다.';for(const id of ['wardrobeBrand','wardrobeOperatorName','wardrobeTitle','wardrobeOwned'])$(id).textContent='';return;}
 if(!skins.some(s=>s.id===selectedSkin))selectedSkin=skins[0].id;
 for(const skin of skins){const card=make('button');card.type='button';card.className='wardrobe-card'+(owned.has(skin.id)?'':' unowned');card.dataset.skin=skin.id;card.setAttribute('aria-pressed',String(skin.id===selectedSkin));const img=make('img');img.alt='';img.loading='lazy';if(skin.portrait)img.src='https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/portrait/'+encodeURIComponent(skin.portrait)+'.png';img.onerror=()=>{img.hidden=true;};card.append(img,make('span',skin.name),make('small',owned.has(skin.id)?'보유':'미보유'));card.onclick=()=>{selectedSkin=skin.id;show(skin);for(const button of grid.children)button.setAttribute('aria-pressed',String(button.dataset.skin===selectedSkin));};grid.append(card);}
 show(skins.find(s=>s.id===selectedSkin));
}
function show(s){$('wardrobeBrand').textContent=s.brand;$('wardrobeOperatorName').textContent=s.operator;$('wardrobeTitle').textContent=s.name;$('wardrobeOwned').textContent=owned.has(s.id)?'보유 중':'미보유';const img=$('wardrobeArt');img.hidden=false;img.alt=`${s.operator} · ${s.name}`;$('wardrobeArtStatus').textContent='';img.onerror=()=>{img.hidden=true;$('wardrobeArtStatus').textContent='일러스트를 불러오지 못했습니다.';};if(s.illustration)img.src=asset('characters/'+s.charId,s.illustration.replace(/^illust_/,''));else{img.hidden=true;$('wardrobeArtStatus').textContent='등록된 일러스트가 없습니다.';}}
$('wardrobeOperator').onclick=()=>{$('wardrobeDialog').showModal();$('wardrobeSearch').focus();};
for(const [id,direction]of [['wardrobePrev',-1],['wardrobeNext',1]])$(id).onclick=()=>$('wardrobeGrid').scrollBy({left:direction*300,behavior:'smooth'});
const strip=$('wardrobeGrid');let drag=null;
strip.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType==='touch')return;drag={x:e.clientX,left:strip.scrollLeft,moved:false};});
window.addEventListener('pointermove',e=>{if(!drag)return;const distance=e.clientX-drag.x;if(Math.abs(distance)>5)drag.moved=true;if(drag.moved){strip.scrollLeft=drag.left-distance;e.preventDefault();}});
strip.addEventListener('click',e=>{if(drag?.moved){e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('pointerup',()=>{setTimeout(()=>{drag=null;},0);});window.addEventListener('pointercancel',()=>{drag=null;});
$('wardrobeClose').onclick=()=>$('wardrobeDialog').close();$('wardrobeDialog').addEventListener('click',e=>{if(e.target===$('wardrobeDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
document.querySelector('[data-tab="wardrobe"]')?.addEventListener('click',()=>window.dispatchEvent(new Event('wardrobe-request-account')));window.addEventListener('wardrobe-account',e=>accept(e.detail));window.addEventListener('mining-clear',()=>{try{localStorage.removeItem('zootAdminWardrobeSkins');}catch{}owned=null;$('wardrobeGrid').replaceChildren();$('wardrobeCount').textContent='';$('wardrobeMessage').textContent='계정 데이터를 지웠습니다.';$('wardrobeDialog').close();});$('wardrobeSearch').oninput=render;$('wardrobeAll').onchange=render;

window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='preview-account')accept(e.data.account);if(e.data?.type==='preview-clear')window.dispatchEvent(new Event('mining-clear'));});if(parent!==window)parent.postMessage({type:'preview-account-request'},location.origin);

try{const ids=JSON.parse(localStorage.getItem('zootAdminWardrobeSkins')||'null');if(Array.isArray(ids))accept({user:{skin:{characterSkins:Object.fromEntries(ids.filter(id=>typeof id==='string').map(id=>[id,1]))}}});}catch{}

function readImportedSkins(){try{const data=JSON.parse(localStorage.getItem('arknightsOneTimeRewardsV1')||'null');if(ownedSkins(data))accept(data);}catch{}}
window.addEventListener('arknights-account-updated',readImportedSkins);window.addEventListener('storage',e=>{if(e.key==='arknightsOneTimeRewardsV1'||e.key==='zootAdminWardrobeSkins')readImportedSkins();});readImportedSkins();

$('wardrobeLoad').addEventListener('click',async()=>{try{const {openAccountImport}=await import('/preview/assets/js/account-menu.mjs');await openAccountImport();}catch{$('wardrobeMessage').textContent='계정 가져오기를 열지 못했습니다. 새로고침 후 다시 시도해 주세요.';}});
