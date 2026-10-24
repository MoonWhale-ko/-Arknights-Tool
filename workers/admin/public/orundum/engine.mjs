import { additional } from './additional.mjs';
export function gameWeek(seconds) {
  const d=new Date((seconds+5*3600)*1000),weekday=d.getUTCDay()||7;
  d.setUTCDate(d.getUTCDate()-weekday+1);return d.toISOString().slice(0,10);
}
export function summarize(rows) {return rows.reduce((n,r)=>{n[r.status]=(n[r.status]||0)+r.amount;return n;},{remaining:0,claimed:0,unknown:0});}
export function calculate(catalog,data,{now=Date.now()/1000}={}) {
  const user=data?.snapshot?.user??data?.user;
  if(!user?.troop?.chars||!user?.campaignsV2?.instances)throw Error('오퍼레이터·섬멸 정보가 포함된 계정 원본 JSON을 선택하세요.');
  const owned=new Map(Object.values(user.troop.chars).map(x=>[x.charId,x]));
  const rows=[],excluded=[];
  for(const p of catalog.paradox){
    if(p.start>now){excluded.push({...p,category:'paradox',exclusion:'미개방'});continue;}
    const char=owned.get(p.charId);
    if(!char){excluded.push({...p,category:'paradox',exclusion:'미보유 오퍼레이터'});continue;}
    const record=user.troop.addon?.[p.charId]?.stage?.[p.id];
    let unlockKnown=true;
    const unlocked=p.unlock.every(g=>{if(g.unlockType!=='AWAKE'){unlockKnown=false;return false;}const phase=Number(g.unlockParam1),level=Number(g.unlockParam2);return char.evolvePhase>phase||char.evolvePhase===phase&&char.level>=level;});
    const condition=p.unlock.map(g=>g.unlockType==='AWAKE'?`정예화 ${g.unlockParam1} · Lv.${g.unlockParam2}`:'해금 조건 확인 필요').join(', ');
    const status=record?.state===3?'claimed':record&&![0,1,2].includes(record.state)?'unknown':'remaining';
    const access=unlocked?'바로 도전 가능':unlockKnown?'육성 후 도전 가능':'해금 조건 확인 필요';
    const reason=status==='claimed'?'완료 기록으로 초회 보상 수령 확인':record?`완료 전 · state ${record.state}`:'개별 기록 없음 · 미완료로 판정';
    rows.push({...p,category:'paradox',status,access,condition,reason});
  }
  for(const map of catalog.annihilation){
    const windows=map.windows.filter(w=>w.start<=now&&now<=w.end);
    if(!windows.length){excluded.push({...map,category:'annihilation',exclusion:map.windows.some(w=>w.start>now)?'현재 미개방 · 다음 개방 대기':'현재 미개방'});continue;}
    const instance=user.campaignsV2.instances[map.id],kills=instance?.maxKills??0;
    for(const reward of map.rewards){
      const flag=instance?.rewardStatus?.[reward.index];
      const status=flag===1?'claimed':flag===0||!instance?'remaining':'unknown';
      const ready=status==='remaining'&&kills>=reward.kills;
      rows.push({id:map.id+':'+reward.index,mapId:map.id,category:'annihilation',name:map.name,title:`${reward.kills}명 처치`,amount:reward.amount,status,access:ready?'달성 · 보상 수령 가능':'처치 수 달성 필요',condition:`최고 ${kills} / ${reward.kills}명`,reason:status==='claimed'?'해당 처치 수 보상 수령 기록':status==='unknown'?'수령 상태 항목 확인 필요':instance?'처치 수 보상 미수령 기록':'개별 기록 없음 · 미수령으로 판정',openKind:[...new Set(windows.map(w=>w.kind))].join(' · ')});
    }
  }
  const campaign=user.campaignsV2,imported=Date.parse(data.importedAt)/1000;
  const stale=Number.isFinite(imported)?gameWeek(imported)!==gameWeek(now):true;
  const valid=Number.isFinite(campaign.campaignCurrentFee)&&Number.isFinite(campaign.campaignTotalFee)&&campaign.campaignCurrentFee>=0&&campaign.campaignTotalFee>=0&&campaign.campaignCurrentFee<=campaign.campaignTotalFee;
  const weekly={obtained:valid?campaign.campaignCurrentFee:null,cap:valid?campaign.campaignTotalFee:null,remaining:valid&&!stale?Math.max(0,campaign.campaignTotalFee-campaign.campaignCurrentFee):null,stale,week:gameWeek(now)};
  return {additional:additional(catalog,data,now),rows,excluded,weekly,totals:summarize(rows),calculatedAt:new Date(now*1000).toISOString()};
}
