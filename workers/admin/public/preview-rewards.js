import {audit,totals} from '/mining/engine.mjs';
import {calculate} from '/orundum/engine.mjs';
import {storyLabel} from '/mining/story-labels.mjs';
import {REWARDS_KEY} from './assets/js/account-state.mjs?v=9';
import {openAccountImport} from './assets/js/account-menu.mjs';
const $=id=>document.getElementById(id),labels={remaining:'미수령',claimed:'수령 완료',unknown:'확인 필요'};
const n=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
let account,rows=[],catalogs;
const unit=r=>r.currency==='originite'?'순오리지늄':'합성옥';
function currencyIcon(currency){const img=n('img');img.src='https://raw.githubusercontent.com/fexli/ArknightsResource/main/items/'+(currency==='originite'?'DIAMOND':'DIAMOND_SHD')+'.png';img.alt='';img.setAttribute('aria-hidden','true');img.width=28;img.height=28;img.loading='lazy';return img;}
function rewardRow(r,open,nested=false){
   const row=n('details',undefined,'reward-item '+r.status+(nested?' reward-mode':''));row.dataset.key='item|'+r.currency+'|'+r.id;row.open=open.has(row.dataset.key);
   const summary=n('summary'),identity=n('div',undefined,'reward-item-identity');
   if(r.charId){const img=n('img',undefined,'reward-avatar');img.src=`https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/charavatars/${encodeURIComponent(r.charId)}.png`;img.alt='';img.loading='lazy';img.width=40;img.height=40;img.addEventListener('error',()=>img.replaceWith(n('span',r.name?.slice(0,1)||'·','reward-avatar reward-avatar-fallback')),{once:true});identity.append(img);}
   const name=n('div',undefined,'reward-item-name');name.append(n('strong',nested?(r.mode==='험지 작전'?'험지 작전':'기본 작전'):(r.code||r.title)));if(!nested&&r.code&&r.name)name.append(n('small',r.name));identity.append(name);
   const badges=n('div',undefined,'reward-item-badges');
   if(!nested&&r.mode&&r.mode!=='일반')badges.append(n('span',r.mode,'reward-tag'));
   if(r.status!=='remaining')badges.append(n('span',labels[r.status],'reward-tag '+r.status));
   else if(r.access&&!['개방 중','바로 도전 가능'].includes(r.access))badges.append(n('span',r.access==='육성 후 도전 가능'?'육성 필요':r.access,'reward-tag'));
   const value=n('div',undefined,'reward-item-value');value.append(currencyIcon(r.currency),n('b',r.amount.toLocaleString()));value.setAttribute('aria-label',`${unit(r)} ${r.amount}`);
   summary.append(identity,badges,value,n('span',undefined,'reward-chevron'));row.append(summary);
   const detail=n('div',undefined,'reward-item-detail');if(r.modeDescription)detail.append(n('p',r.modeDescription));for(const text of r.unlockDetails||[])detail.append(n('p',text));detail.append(n('p',r.reason));if(r.condition)detail.append(n('p',r.condition));row.append(detail);return row;
}
function positionStagePanel(grid){
 const headers=[...grid.querySelectorAll(':scope > .reward-group')],columns=window.innerWidth<=600?1:3;
 const selected=headers.findIndex(card=>card.open),selectedRow=selected<0?-1:Math.floor(selected/columns)+1;
 for(const [index,card]of headers.entries()){
  const row=Math.floor(index/columns)+1;card.style.gridColumn=String(index%columns+1);card.style.gridRow=String(row+(selectedRow>0&&row>selectedRow?1:0));
  const panel=document.getElementById(card.querySelector('summary').getAttribute('aria-controls'));
  if(panel){panel.hidden=!card.open;if(card.open)panel.style.gridRow=String(selectedRow+1);}
 }
}
window.addEventListener('resize',()=>{const grid=document.querySelector('.reward-content-grid');if(grid)positionStagePanel(grid);});
function render(){
 const query=$('rewardsSearch').value.trim().toLowerCase(),currency=$('rewardsCurrency').value,status=$('rewardsStatus').value;
 const filtered=rows.filter(r=>(!currency||r.currency===currency)&&(!status||r.status===status)&&(!query||[r.storyLabel,r.group,r.title,r.name,r.id].join(' ').toLowerCase().includes(query)));
 const box=$('rewardsGroups'),open=new Set([...box.querySelectorAll('details[open]')].map(d=>d.dataset.key));box.replaceChildren();
 const groups=new Map();for(const row of filtered){const key=row.currency+'|'+row.group;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 $('rewardsCount').textContent=`${groups.size.toLocaleString()}개 콘텐츠 · ${filtered.length.toLocaleString()}개 보상`;
 const headerGrid=n('div',undefined,'reward-content-grid'),panels=[];box.append(headerGrid);
 let groupIndex=0;
 for(const [key,list] of groups){
  const d=n('details',undefined,'reward-group');d.dataset.key=key;d.open=open.has(key);
  const index=groupIndex++,panel=n('section',undefined,'reward-stage-panel');panel.id='reward-stage-panel-'+index;panel.hidden=!d.open;
  const h=n('summary'),heading=n('div',undefined,'reward-group-heading');h.id='reward-content-heading-'+index;h.setAttribute('aria-controls',panel.id);h.setAttribute('aria-expanded',String(d.open));panel.setAttribute('aria-labelledby',h.id);
  const suffix=list[0].storyLabel?.replace(/^(?:메인 스토리|사이드 스토리)\s*/,'')||'';
  const titleNode=n('b',list[0].group);if(suffix)titleNode.append(n('span',' '+suffix,'reward-title-suffix'));
  heading.append(titleNode,n('small',`${list.length.toLocaleString()}개 보상`));
  const sum=list.filter(r=>r.status===(status||'remaining')).reduce((a,r)=>a+r.amount,0),amount=n('div',undefined,'reward-group-amount');
  amount.append(n('small',labels[status||'remaining']),currencyIcon(list[0].currency),n('strong',sum.toLocaleString()));amount.setAttribute('aria-label',`${labels[status||'remaining']} ${unit(list[0])} ${sum}`);
  h.append(heading,amount,n('span',undefined,'reward-chevron'));d.append(h);
  const panelTitle=n('h2',list[0].group,'reward-stage-panel-title');if(suffix)panelTitle.append(n('span',' '+suffix,'reward-title-suffix'));panel.append(panelTitle);
  const stageList=n('div',undefined,'reward-stage-list');panel.append(stageList);
  const entries=new Map();
  const adverse=new Set(rows.filter(r=>r.currency==='originite'&&r.mode==='험지 작전').map(r=>r.id.replace(/#s$/,'')));
  for(const r of list){const base=r.id.replace(/#s$/,'');const paired=r.currency==='originite'&&adverse.has(base)&&['일반','험지 작전'].includes(r.mode);const k=paired?'stage|'+base:'single|'+r.id;if(!entries.has(k))entries.set(k,{r,paired,base});}
  for(const {r,paired,base} of entries.values()){
   if(!paired){stageList.append(rewardRow(r,open));continue;}
   const variants=rows.filter(v=>v.currency===r.currency&&v.group===r.group&&v.id.replace(/#s$/,'')===base&&['일반','험지 작전'].includes(v.mode)).sort((a,b)=>(a.mode==='험지 작전')-(b.mode==='험지 작전'));
   const state=variants.every(v=>v.status==='claimed')?'claimed':variants.some(v=>v.status==='remaining')?'remaining':'unknown';
   const row=n('details',undefined,'reward-item reward-stage '+state);row.dataset.key='stage|'+r.currency+'|'+base;row.dataset.stage=base;row.open=open.has(row.dataset.key);
   const summary=n('summary'),identity=n('div',undefined,'reward-item-identity'),name=n('div',undefined,'reward-item-name');name.append(n('strong',r.code),n('small',r.name));identity.append(name);
   const value=n('div',undefined,'reward-item-value'),sum=variants.filter(v=>v.status===(status||'remaining')).reduce((n,v)=>n+v.amount,0);value.append(currencyIcon(r.currency),n('b',sum.toLocaleString()));value.setAttribute('aria-label',`${labels[status||'remaining']} ${unit(r)} ${sum}`);
   summary.append(identity,n('div',undefined,'reward-item-badges'),value,n('span',undefined,'reward-chevron'));row.append(summary);
   const children=n('div',undefined,'reward-stage-variants');for(const variant of variants)children.append(rewardRow(variant,open,true));row.append(children);stageList.append(row);
  }
  headerGrid.append(d,panel);panels.push(panel);
  d.addEventListener('toggle',()=>{
   if(!d.isConnected)return;
   panel.hidden=!d.open;h.setAttribute('aria-expanded',String(d.open));
   if(d.open){for(const other of headerGrid.querySelectorAll('.reward-group'))if(other!==d){other.open=false;other.querySelector('summary').setAttribute('aria-expanded','false');}for(const other of panels)if(other!==panel)other.hidden=true;}
   positionStagePanel(headerGrid);
  });
 }
 positionStagePanel(headerGrid);
 if(!groups.size)box.append(n('p','조건에 맞는 보상이 없습니다.','reward-empty'));
}
async function accept(value){
 if(!value)return;
 try{
  if(!catalogs)catalogs=await Promise.all(['/mining/catalog.json','/orundum/catalog.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('보상 기준 데이터를 불러오지 못했습니다.');return r.json();}));
  const mine=audit(catalogs[0],value),or=calculate(catalogs[1],value);
  account=value;
  rows=[...mine.included.map(r=>({...r,currency:'originite',amount:r.op,storyLabel:storyLabel(r),title:r.code+' · '+r.mode})),...or.rows.map(r=>({...r,currency:'orundum',group:r.category==='paradox'?'역설 시뮬레이션':r.name,title:r.category==='paradox'?r.name:r.title}))];
  $('rewardsOriginite').textContent=totals(mine.included).remaining.toLocaleString();$('rewardsOrundum').textContent=or.totals.remaining.toLocaleString();
  $('rewardsMessage').hidden=true;$('rewardsResults').hidden=false;render();
 }catch(e){clear();showError('보상 기록이 포함된 계정을 다시 가져와주세요.');}
}
function clear(){account=null;rows=[];$('rewardsResults').hidden=true;$('rewardsOriginite').textContent='—';$('rewardsOrundum').textContent='—';$('rewardsMessage').hidden=true;}
function fromStorage(){try{const saved=JSON.parse(localStorage.getItem(REWARDS_KEY)||'null');if(saved)accept(saved);else clear();}catch{clear();}}
function showError(text){$('rewardsMessage').textContent=text;$('rewardsMessage').hidden=false;}
$('rewardsImport').onclick=()=>openAccountImport().catch(e=>showError(e.message));
for(const id of ['rewardsSearch','rewardsCurrency','rewardsStatus'])$(id).addEventListener(id==='rewardsSearch'?'input':'change',render);
window.addEventListener('arknights-account-updated',fromStorage);window.addEventListener('storage',e=>{if(e.key===REWARDS_KEY)fromStorage();});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='preview-account')accept(e.data.account);if(e.data?.type==='preview-clear')clear();});
fromStorage();if(parent!==window)parent.postMessage({type:'preview-account-request'},location.origin);
setInterval(()=>{if(account)accept(account);},60000);
