export const gameDay=s=>Math.floor((s+5*3600)/86400);
const week=s=>gameDay(s)-((new Date((s+5*3600)*1000).getUTCDay()||7)-1);
const total=rows=>rows.reduce((a,r)=>{if(Number.isFinite(r.amount))a[r.status]=(a[r.status]||0)+r.amount;return a;},{remaining:0,claimed:0,unknown:0});
export function additional(catalog,data,now){
 const user=data.snapshot?.user??data.user, imported=Date.parse(data.importedAt)/1000;
 const sameDay=Number.isFinite(imported)&&gameDay(imported)===gameDay(now),sameWeek=Number.isFinite(imported)&&week(imported)===week(now);
 const rewards=[],shops=[],random=[],notes=[];
 const add=r=>rewards.push(r);
 const base=(id,name,title,amount,category)=>({id,name,title,amount,category});
 const receipt=user.mission?.missionRewards;
 const period=(catalog.dailyPeriods||[]).find(p=>p.startTime<=now&&now<=p.endTime);
 const weekday=new Date((now+5*3600)*1000).getUTCDay()||7;
 const dailyGroup=period?.periodList.find(p=>p.period.includes(weekday))?.rewardGroupId;
 for(const typ of ['DAILY','WEEKLY']){
  const valid=(catalog.missionRewards||[]).filter(r=>r.type===typ&&(typ==='DAILY'?r.group===dailyGroup:r.start<=now&&now<=r.end));
  const flags=receipt?.rewards?.[typ]||{},fresh=typ==='DAILY'?sameDay:sameWeek;
  const points=receipt?.[typ==='DAILY'?'dailyPoint':'weeklyPoint'];
  const earned=Number.isFinite(points)?points+valid.filter(r=>flags[r.id]===1).reduce((n,r)=>n+r.cost,0):null;
  for(const r of valid.filter(r=>r.amount>0)){
   const flag=flags[r.id],status=!fresh?'unknown':flag===1?'claimed':flag===0?'remaining':'unknown';
   add({...base(r.id,typ==='DAILY'?'오늘 일일 임무':'이번 주 주간 임무',`진척도 ${r.threshold}`,r.amount,'missions'),status,access:status==='claimed'?'수령 완료':!fresh?'계정 재조회 필요':earned!==null&&earned>=r.threshold?'달성 · 수령 가능':'임무 수행 필요',condition:earned===null?'진척도 확인 필요':`${earned} / ${r.threshold}`,reason:!fresh?'기간 갱신 이후의 계정 파일이 필요합니다.':flag===undefined?'수령 기록 항목 없음':'현재 보상 그룹의 수령 기록 기준'});
  }
 }
 for(const event of catalog.events||[]){
  if(event.start>now||now>event.rewardEnd)continue;
  const player=user.activity?.[event.type]?.[event.id];
  if(event.random){random.push({name:event.name,id:event.id,condition:'추첨형 · 확정 합계에서 제외',reason:now>event.end?'추첨 기간 종료':`조회 당시 선택 결과 최대 ${player?.prayMax??'미확인'} · 최종 수령과 구분`});continue;}
  const remainingDays=Math.max(0,gameDay(event.end)-gameDay(now)+1);
  const lastToday=player&&gameDay(player.lastTs)===gameDay(now);
  if(event.type==='CHECKIN_ACCESS'&&event.perDay){
   const count=player?.rewardsCount,known=Number.isInteger(count)&&count>=0&&count<=event.days;
   const pending=known?event.days-count:0;
   const opportunities=remainingDays-(lastToday&&player.currentStatus!==1?1:0);
   const eligible=Math.min(pending,Math.max(0,opportunities));
   add({...base(event.id,event.name,'잔여 출석 보상',known?eligible*event.perDay:event.days*event.perDay,'events'),status:known?'remaining':'unknown',access:known?'기간 내 출석 필요':'계정 이벤트 기록 확인 필요',condition:known?`${count} / ${event.days}회 수령 · 앞으로 ${eligible}회 가능`:'수령 횟수 없음',reason:'게임 데이터의 일일 보상 × 남은 횟수와 남은 개방 일수 중 작은 값'});
   continue;
  }
  for(const r of event.rewards){
   const flag=player?.history?.[r.index],historyLength=player?.history?.length??0;
   const opportunities=remainingDays-(lastToday?1:0);
   const future=flag===undefined&&player&&r.order<=historyLength+Math.max(0,opportunities);
   if(flag===undefined&&player&&!future)continue;
   // Activity check-in history is a receipt-status list: 0 confirmed, 1 claimable.
   const recognized=['CHECKIN_ONLY','CHECKIN_VIDEO'].includes(event.type);
   const status=recognized&&flag===0?'claimed':recognized&&(flag===1||future)?'remaining':'unknown';
   add({...base(event.id+':'+r.index,event.name,`${r.order}번째 출석 보상`,r.amount,'events'),status,access:status==='claimed'?'수령 완료':flag===1?'수령 가능':future?'기간 내 추가 출석 필요':'수령 상태 확인 필요',condition:`조회 기록 ${flag??'없음'}`,reason:'이벤트별 수령 기록 · 남은 출석 기회 기준'});
  }
 }
 const monthly=(catalog.monthly||[]).find(g=>g.start<=now&&now<=g.end&&g.id===user.checkIn?.checkInGroupId);
 if(monthly)for(const r of monthly.rewards){
  const flag=user.checkIn.checkInHistory?.[r.index],remainingDays=gameDay(monthly.end)-gameDay(now)+1;
  const progress=user.checkIn.checkInHistory?.length??0;
  const chance=remainingDays-(sameDay&&user.checkIn.canCheckIn===0?1:0);
  if(flag===undefined&&r.index>=progress+Math.max(0,chance))continue;
  const status=flag===1?'claimed':flag===0||flag===undefined?'remaining':'unknown';
  add({...base('monthly:'+monthly.id+':'+r.index,'이번 달 출석',`${r.index+1}번째 출석 보상`,r.amount,'login'),status,access:status==='claimed'?'수령 완료':'기간 내 출석 필요',condition:'월간 출석 보상',reason:'게임 데이터의 월간 보상표와 출석 기록 기준'});
 }
 const subscription=(catalog.subscriptions||[]).find(g=>g.startTime<=now&&now<=g.endTime);
 const subEnd=user.status?.monthlySubscriptionEndTime,subStart=user.status?.monthlySubscriptionStartTime;
 if(subscription&&Number.isFinite(subEnd)&&subStart<=now&&now<subEnd){
  const perDay=subscription.items.filter(x=>x.id==='4003').reduce((n,x)=>n+x.count,0);
  const days=Math.max(0,gameDay(subEnd-1)-gameDay(now));
  const todayKnown=sameDay&&user.checkIn?.canCheckIn===1?1:0;
  add({...base('subscription','사용 중인 월정액','유효 기간 내 남은 로그인 보상',(days+todayKnown)*perDay,'login'),status:'remaining',access:'기간 내 로그인 필요',condition:`내일부터 ${days}일${todayKnown?' · 오늘 1회 추가':''}`,reason:'현재 구독 중인 기간만 포함 · 새 월정액 구매·연장 제외'});
 }
 const source=data.supplementary?.shops;
 for(const key of ['LS','ES']){
  const name=key==='LS'?'일반증명서 상점':'정보증명서 상점',catalogue=source?.[key],player=user.shop?.[key];
  if(key==='LS'&&(!Number.isFinite(imported)||new Date((imported+5*3600)*1000).toISOString().slice(0,7)!==new Date((now+5*3600)*1000).toISOString().slice(0,7))){notes.push(name+': 지난달 파일이거나 조회 시각이 없어 다시 가져와야 합니다.');continue;}
  if(!Array.isArray(catalogue?.goodList)||!player){notes.push(name+': 상품 가격·한도가 없는 기존 파일입니다. 관리용 계정을 다시 가져오세요.');continue;}
  if(Number.isFinite(catalogue.shopEndTime)&&catalogue.shopEndTime>0&&now>catalogue.shopEndTime){notes.push(name+': 상품 목록의 유효 기간이 지났습니다. 다시 가져오세요.');continue;}
  for(const good of catalogue.goodList.filter(g=>g.item?.id==='4003')){
   const count=player.info?.find(x=>x.id===good.goodId)?.count??0;
   const stock=good.availCount,price=good.price,quantity=good.item.count;
   if(!Number.isInteger(stock)||!Number.isFinite(price)||price<=0||!Number.isFinite(quantity)||quantity<=0){notes.push(name+': 확인되지 않은 상품 수치가 있어 제외했습니다.');continue;}
   const group=good.groupId,groups=catalogue.groups||[],groupIndex=groups.indexOf(group),currentIndex=groups.indexOf(player.curGroupId);
   // A locked later tier must not turn its unlimited stock into free future income.
   const unlocked=key!=='LS'||groupIndex===0||groupIndex>=0&&currentIndex>=groupIndex;
   const currency=key==='LS'?user.status?.lggShard:user.inventory?.REP_COIN;
   const remaining=stock<0?null:Math.max(0,stock-count);
   const affordable=unlocked&&Number.isFinite(currency)?Math.max(0,Math.min(remaining??Infinity,Math.floor(currency/price))):null;
   shops.push({id:good.goodId,name,title:stock<0?'무제한 교환':'한정 교환',amount:remaining===null?null:remaining*quantity,affordable:affordable===null?null:affordable*quantity,condition:`1회 ${quantity}개 / ${price}${key==='LS'?' 일반증명서':' 정보증명서'} · 잔여 ${remaining??'무제한'}회`,access:unlocked?'교환 재화 필요':'이전 단계 상품 구매 필요',reason:'공식 서버 상품 목록과 계정 구매 횟수 기준 · 상점 금액은 무료 보상 합계와 별도'});
  }
 }
 notes.push('우편 보상은 계정 원본에 우편함이 없어 자동 확인할 수 없습니다. 미수령 우편이 없다는 뜻은 아닙니다.');
 return {rewards,shops,random,notes,totals:total(rewards),shopStock:shops.reduce((n,s)=>n+(s.amount??0),0)};
}
