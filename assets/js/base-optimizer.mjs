import {compileSkill,unlockSkills,hasGroup} from './base-skills.mjs?v=3';
const EPS=1e-8;
export const DEFAULT_OPTIONS={teams:2,rotation:'first',extraActions:false,priority:['F_GOLD','F_EXP','F_DIAMOND'],ambience:{},missingClues:[1,2,3,4,5,6,7]};
export function normalizeOptions(value={}){
 const priority=Array.isArray(value.priority)?[...new Set(value.priority)].filter(x=>DEFAULT_OPTIONS.priority.includes(x)):[];
 const missingClues=Array.isArray(value.missingClues)?[...new Set(value.missingClues)].filter(n=>Number.isInteger(n)&&n>=1&&n<=7).sort((a,b)=>a-b):[1,2,3,4,5,6,7];
 return {missingClues,teams:value.teams===3?3:2,rotation:['first','all','12h','24h'].includes(value.rotation)?value.rotation:'first',extraActions:value.extraActions===true,priority:[...priority,...DEFAULT_OPTIONS.priority.filter(x=>!priority.includes(x))],ambience:value.ambience&&typeof value.ambience==='object'?value.ambience:{}};
}
export function compareScores(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){const delta=(a[i]??0)-(b[i]??0);if(Math.abs(delta)>EPS)return Math.sign(delta);}return 0;}
export function prepareModel(data,base,progress,products,rawOptions){
 const options=normalizeOptions(rawOptions),buffs=Object.fromEntries(Object.values(data.buffs).map(b=>[b.id,compileSkill(b)]));
 const warnings=[],pool=[],identities=new Set();
 for(const [id,state] of Object.entries(progress??{})){
  if(state?.owned!==true)continue;
  const def=data.characters[id];if(!def){warnings.push({operator:id,reason:'한국 서버 기반시설 스킬 데이터 없음'});continue;}
  if(identities.has(def.identity))continue;
  identities.add(def.identity);
  const skills=unlockSkills(def,{elite:Number(state.elite)||0,level:Number(state.level)||1},buffs);
  const op={...def,elite:Math.max(0,Math.min(2,Number(state.elite)||0)),skills,index:pool.length};pool.push(op);
  for(const skill of skills.filter(s=>s.kind==='unsupported'))warnings.push({operator:def.name,room:skill.room,skill:skill.name,description:skill.description,reason:'해당 효과가 있는 시설의 추천에서 제외'});
 }
 const counters={},rooms=[],missing=[];
 for(const [id,raw] of Object.entries(base.rooms??{})){
  if(!(raw.level>0))continue;
  const type=raw.type;if(!['MANUFACTURE','POWER','TRADING','HIRE','CONTROL','DORMITORY','MEETING'].includes(type))continue;
  counters[type]=(counters[type]??0)+1;
  const capacity=type==='DORMITORY'?5:type==='CONTROL'?raw.level:type==='MEETING'?2:type==='HIRE'||type==='POWER'?1:Math.min(3,raw.level);
  const room={id,type,level:raw.level,capacity,number:counters[type]};
  if(type==='MANUFACTURE'){
   room.recipe=data.recipes[String(products?.[id])];
   if(!room.recipe)missing.push(`${id}: 제조소 생산 품목을 선택해 주세요.`);
  }
  if(type==='DORMITORY'){
   const ambience=options.ambience[id]??raw.ambience;
   const limit=data.dorms[raw.level-1]?.decorationLimit??raw.level*1000;
   if(ambience===null||ambience===undefined||ambience===''||!Number.isFinite(Number(ambience))||Number(ambience)<0||Number(ambience)>limit)missing.push(`숙소 ${room.number}: 인테리어 점수(0~${limit})를 입력해 주세요.`);
   room.ambience=Number(ambience)||0;room.recovery=(data.dorms[raw.level-1]?.manpowerRecover??160)/100+room.ambience*.0004;
  }
  rooms.push(room);
 }
 if(!pool.length)missing.push('보유 오퍼레이터가 없습니다. 계정 가져오기 또는 오퍼레이터 화면에서 보유 상태를 설정해 주세요.');
 if(!rooms.some(r=>r.type==='MANUFACTURE'))missing.push('건설된 제조소가 없습니다. 기반시설을 불러와 주세요.');
 const maxFactory=Math.max(0,...rooms.filter(r=>r.type==='MANUFACTURE').map(r=>r.level));
 for(const r of rooms.filter(r=>r.recipe))if(r.recipe.unlockLevel>maxFactory)missing.push(`제조소 ${r.number}: 해당 생산 품목의 개방 조건이 충족되지 않았습니다.`);
 const model={data,base,options,pool,rooms,warnings,missing};
 model.canPlace=(op,room)=>!op.skills.some(s=>s.room===room.type&&s.kind==='unsupported')&&(room.type==='DORMITORY'||op.skills.some(s=>s.room===room.type));
 return model;
}
const isActive=(op,morale)=>morale[op.index]>EPS;
const roomSkills=(op,type)=>op.skills.filter(s=>s.room===type);
const matches=(skill,recipe)=>!skill.targets.length||skill.targets.includes(recipe?.category);
const countGroup=(ops,g)=>ops.filter(op=>hasGroup(op,g)).length;
function contextFor(model,placements,morale){
 const all=placements.flatMap(p=>p.ops),byType=t=>placements.filter(p=>p.room.type===t),control=byType('CONTROL').flatMap(p=>p.ops),powerOps=byType('POWER').flatMap(p=>p.ops),dorms=byType('DORMITORY');
 const ctx={all,control,powerOps,dorms,power:model.rooms.filter(r=>r.type==='POWER').length,trading:model.rooms.filter(r=>r.type==='TRADING').length,dormLevels:dorms.reduce((n,p)=>n+p.room.level,0),training:Math.max(0,...Object.values(model.base.rooms??{}).filter(r=>r.type==='TRAINING').map(r=>r.level)),globalProd:0,hireBonus:0,hireThreshold:false,meetingBonus:0,meetingClues:[],meetingMinos:0,meetingInes:0,meetingStudents:0,controlRecovery:0,controlPenalty:0,dormBonus:0,resources:{worldly:0,perception:0,thought:0,witchcraft:0,robots:0,dishes:0,info:0,drink:0,passion:0,dream:0,measure:0},individualRecovery:{},extraFactory:[],globalCount:g=>countGroup(all,g)};
 ctx.bots=powerOps.filter(o=>o.maxMorale===24&&/^(Lancet-2|Castle-3|THRM-EX|Friston-3|저스티스 나이트|PhonoR-0|CONFESS-47)$/.test(o.name)).length;
 const activeControl=control.filter(o=>isActive(o,morale));
 for(const op of activeControl)for(const s of roomSkills(op,'CONTROL')){
  switch(s.kind){
   case 'globalProd':ctx.globalProd=Math.max(ctx.globalProd,s.amount);break;
   case 'botGlobalProd':if(ctx.bots>=2)ctx.globalProd=Math.max(ctx.globalProd,.02);break;
   case 'lancetPower':if(powerOps.some(o=>o.name==='Lancet-2'))ctx.power+=2;break;
   case 'controlRecovery':ctx.controlRecovery+=s.amount;break;
   case 'factionRecovery':ctx.controlRecovery+=countGroup(control,s.group)*s.amount;break;
   case 'amiyaRecovery':if(control.some(o=>o.identity==='char_002_amiya')){ctx.individualRecovery[op.index]=(ctx.individualRecovery[op.index]??0)+s.amount;for(const other of control.filter(o=>o.identity==='char_002_amiya'))ctx.individualRecovery[other.index]=(ctx.individualRecovery[other.index]??0)+s.amount;}break;
   case 'aakRecovery':if(control.some(o=>o.name==='아'))ctx.controlRecovery+=.25;break;
   case 'controlPenalty':ctx.controlPenalty+=s.amount;break;
   case 'globalDorm':ctx.dormBonus=Math.max(ctx.dormBonus,s.amount);break;
   case 'passionDorm':ctx.resources.passion+=dorms.reduce((n,p)=>n+p.ops.length,0);break;
   case 'passionSelf':ctx.resources.passion+=20;break;
   case 'meetingGlobal':ctx.meetingBonus=Math.max(ctx.meetingBonus,s.amount);break;
   case 'meetingControlClue':ctx.meetingClues.push(s.clue);break;
   case 'meetingInes':ctx.meetingInes=.05;break;
   case 'meetingMinos':ctx.meetingMinos=Math.max(ctx.meetingMinos,Math.min(5,ctx.globalCount('minos'))*s.amount);break;
   case 'meetingStudents':ctx.meetingStudents+=.1;break;
   case 'passionTen':ctx.resources.passion+=10;ctx.meetingBonus=Math.max(ctx.meetingBonus,s.meetingBonus??0);ctx.hireBonus=Math.max(ctx.hireBonus,s.hireBonus??0);break;
   case 'hireThreshold':ctx.hireThreshold=true;break;
   case 'factionResource':ctx.resources[s.resource]+=countGroup(control,s.group);break;
   case 'lowWorldly':ctx.controlRecovery+=.05;if(morale[op.index]<12)ctx.resources.worldly+=15;break;
   case 'highPerception':if(morale[op.index]>=12)ctx.resources.perception+=10;break;
   case 'suiWorldly':ctx.resources.worldly+=Math.min(5,all.filter(o=>!dorms.some(p=>p.ops.includes(o))&&hasGroup(o,'sui')).length)*5;break;
   case 'lingResource':ctx.resources[morale[op.index]>12?'worldly':'perception']+=morale[op.index]>12?15:10;break;
   case 'pinus':ctx.extraFactory.push({kind:'pinus'});break;
   case 'blacksteelControl':ctx.extraFactory.push({kind:'blacksteel'});break;
  }
 }
 for(const op of powerOps.filter(o=>isActive(o,morale)))for(const s of roomSkills(op,'POWER'))if(s.kind==='extraPower'&&ctx.bots===0)ctx.power++;
 let convertPerception=false,convertWorldly=false;
 for(const p of placements)for(const op of p.ops)for(const s of roomSkills(op,p.room.type)){
  if(p.room.type!=='DORMITORY'&&!isActive(op,morale))continue;
  if(s.kind==='perception')ctx.resources.perception+=dorms.reduce((n,d)=>n+d.ops.length,0),convertPerception=true;
  if(s.kind==='robots')ctx.resources.robots=Math.min(64,Object.values(model.base.rooms??{}).filter(r=>r.type!=='PRIVATE').reduce((n,r)=>n+r.level,0));
  if(s.kind==='worldlyConvert')convertWorldly=true;
  if(s.kind==='dreamRecovery')ctx.resources.dream+=p.room.level;
  if(s.kind==='measureRecovery')ctx.resources.measure+=p.room.level;
  if(s.kind==='dishes')ctx.resources.dishes+=p.room.level;
 }
 for(const p of placements.filter(p=>p.room.type==='DORMITORY'))for(const op of p.ops)for(const s of roomSkills(op,'DORMITORY'))if(s.kind==='perceptionConvert')ctx.resources.perception+=ctx.resources[s.id.endsWith('[100]')?'measure':'dream'];
 if(convertPerception)ctx.resources.thought+=ctx.resources.perception;
 if(convertWorldly)ctx.resources.witchcraft+=Math.floor(ctx.resources.worldly/5);
 return ctx;
}
export function evaluateSnapshot(model,placements,morale,worked){
 const ctx=contextFor(model,placements,morale),rates=new Float64Array(model.pool.length),factories=[],offices=[],meetings=[],details=[];
 const ccReduction=ctx.control.length*.05;
 for(const p of placements){
  const {room,ops}=p;if(room.type==='DORMITORY')continue;
  const active=ops.filter(o=>isActive(o,morale));
  let allDrain=0;for(const op of active)for(const s of roomSkills(op,room.type))if(s.kind==='factoryDrain')allDrain-=.1;
  const caps=new Map(),prods=new Map();let automation=false,facilityProd=0,roomAllProd=0,skillTransform=active.some(o=>roomSkills(o,room.type).some(s=>s.kind==='skillChange'));
  const countSkill=text=>active.flatMap(o=>roomSkills(o,room.type)).filter(s=>text==='표준화'&&skillTransform?/표준화|라인테크|피누스 실베스트리스/.test(s.name):s.name.includes(text)).length;
  for(const op of ops){
   let prod=0,cap=0,drain=1-ccReduction+(['MANUFACTURE','TRADING'].includes(room.type)?(model.data.workerCost[ops.length]??0)/100:0)+allDrain;
   if(room.type==='CONTROL'&&roomSkills(op,'CONTROL').some(s=>s.kind==='meetingMinos')&&ctx.control.some(o=>o!==op&&hasGroup(o,'sargon')))drain+=.02;
   if(room.type==='CONTROL'&&roomSkills(op,'CONTROL').some(s=>s.kind==='meetingStudents'))drain+=.5;
   if(room.type==='CONTROL')drain+=ctx.controlPenalty-ctx.controlRecovery-(ctx.individualRecovery[op.index]??0);
   if(isActive(op,morale))for(const s of roomSkills(op,room.type)){
    if(!matches(s,room.recipe)&&room.type==='MANUFACTURE')continue;
    switch(s.kind){
     case 'simple':prod+=s.prod;cap+=s.capacity;drain+=s.drain;break;
     case 'meetingMissing':case 'meetingOwned':case 'meetingTarget':prod+=s.prod;break;
     case 'meetingGroup':prod+=s.prod+(active.some(o=>o!==op&&hasGroup(o,s.group))?s.amount:0);drain+=s.drain;break;
     case 'meetingPartner':prod+=s.prod+(active.some(o=>o.name===s.partner)?s.amount:0);drain+=s.drain;break;
     case 'meetingDormPartner':if(ctx.dorms.some(p=>p.ops.some(o=>o.name==='피아메타')))prod+=.1;break;
     case 'meetingSolo':if(ops.length===1){prod+=s.amount;drain+=s.drain;}break;
     case 'meetingResource':prod+=s.prod+Math.floor(ctx.resources[s.resource]/s.divisor)*s.amount;break;
     case 'hireDorm':prod+=s.prod+ctx.dormLevels*s.amount;drain+=s.drain;break;
     case 'hireResources':prod+=s.prod+(ctx.resources.info+ctx.resources.drink)*.05;drain+=s.drain;break;
     case 'hireElite':prod+=s.prod+Math.min(5,placements.filter(p=>p.ops.some(o=>hasGroup(o,'elite'))).length)*.04;break;
     case 'hirePartner':prod+=s.prod+(ctx.control.some(o=>o.name==='실버애쉬 더 레인프로스트')?.1:0);drain+=s.drain;break;
     case 'automation':automation=true;facilityProd+=ctx.power*s.amount;break;
     case 'capacityAutomation':automation=true;cap+=ops.length*5;if(s.id.endsWith('[100]'))facilityProd+=ops.length*.1;break;
     case 'ramp':prod+=Math.min(s.max,s.initial+Math.max(0,Math.floor(worked[op.index]??0))*s.step);break;
     case 'moraleLoss':prod+=.30-Math.floor((op.maxMorale-morale[op.index]+EPS)/4)*.05;break;
     case 'moraleThreshold':if(op.maxMorale-morale[op.index]>=12){prod+=.1;cap+=6;}break;
     case 'trainingLevel':facilityProd+=Math.min(.3,ctx.training*.1);break;
     case 'tradeCount':facilityProd+=ctx.trading*s.amount;break;
     case 'dormLevels':facilityProd+=ctx.dormLevels*.01;break;
     case 'powerBots':facilityProd+=ctx.bots*s.amount;break;
     case 'pair':if(ops.some(o=>o.name===s.partner))prod+=s.amount;break;
     case 'gummy':if(placements.some(p=>p.room.type==='TRADING'&&p.ops.some(o=>o.name==='굼')))prod+=.35;break;
     case 'skillCount':prod+=countSkill(s.id.endsWith('[000]')?'표준화':s.id.endsWith('[010]')?'라인테크':'금속공예')*.05;break;
     case 'skillCapacity':cap+=countSkill('라인테크')*5;break;
     case 'reserveA1':prod+=countGroup(ops,'reserve1')*.1;break;
     case 'factionGold':prod+=Math.min(s.id.endsWith('[000]')?3:5,ctx.globalCount(s.id.endsWith('[000]')?'blacksteel':'rhine'))*(s.id.endsWith('[000]')?.02:.03);if(s.id.endsWith('[000]'))drain-=.15;break;
     case 'resourceProd':prod+=Math.floor(ctx.resources[s.resource]/s.divisor)*s.amount;break;
     case 'ursusExp':prod+=s.prod+(countGroup(ops,'student')>Number(hasGroup(op,'student'))?.1:0);break;
     case 'suiWorldly':case 'highPerception':case 'blacksteelControl':drain+=.5;break;
     case 'passionSelf':drain+=Math.floor(ctx.resources.passion/8)*.01;break;
    }
   }
   caps.set(op.index,cap);prods.set(op.index,prod);rates[op.index]=-drain;
  }
  if(room.type==='MEETING'){
   const passive=ops.reduce((sum,o)=>sum+(model.data.meeting.basicSpeedBuff+({4:.02,5:.04,6:.05}[o.rarity]??0)+(o.elite??0)*.08),0);
   const external=ctx.meetingBonus+ctx.meetingMinos+(active.some(o=>o.name==='이네스')?ctx.meetingInes:0)+active.filter(o=>hasGroup(o,'student')).length*ctx.meetingStudents;
   const multiplier=ops.length?Math.max(0,1+([.07,.14,.25][room.level-1]??0)+passive+[...prods.values()].reduce((a,b)=>a+b,0)+external):0;
   const missing=model.options.missingClues,targets=new Set(ctx.meetingClues.filter(n=>missing.includes(n)));let broad=false,owned=false;
   for(const o of active)for(const s of roomSkills(o,'MEETING')){
    if(s.kind==='meetingMissing'||(s.kind==='meetingPartner'&&s.missing))broad=true;
    if(s.kind==='meetingTarget'&&missing.includes(s.clue))targets.add(s.clue);
    if(s.kind==='meetingOwned')owned=true;
   }
   // Qualitative policy only: unknown probability magnitudes are never invented.
   const preference=missing.length>0&&missing.length<7?Number(broad||targets.size>0)-Number(owned):0;
   const meeting={id:room.id,multiplier,preference,targetClues:broad?[...missing]:[...targets]};meetings.push(meeting);details.push(meeting);
  }
  if(room.type==='HIRE'){
   const localBonus=(ops.length?model.data.hire.basicSpeedBuff:0)+[...prods.values()].reduce((a,b)=>a+b,0);
   // The unique threshold checks local speed, independently of other control buffs.
   const bonus=localBonus+ctx.hireBonus+(ctx.hireThreshold&&localBonus<.30-EPS?.20:0);
   const office={id:room.id,multiplier:Math.max(0,1+bonus)};offices.push(office);details.push(office);
  }
  if(room.type==='MANUFACTURE'){
   const bubble=active.some(o=>roomSkills(o,room.type).some(s=>s.kind==='bubble')),vermeil=active.some(o=>roomSkills(o,room.type).some(s=>s.kind==='vermeil'));
   if(bubble||vermeil)for(const [index,cap] of caps)prods.set(index,prods.get(index)+Math.max(0,cap)*(bubble?(cap>16?.03:.01):.02));
   let operatorProd=[...prods.values()].reduce((a,b)=>a+b,0);
   if(active.some(o=>roomSkills(o,room.type).some(s=>s.kind==='mizuki')))operatorProd+=Math.min(.4,Math.floor((operatorProd+EPS)/.05)*.05);
   if(automation)operatorProd=0;
   let external=ctx.globalProd;
   for(const e of ctx.extraFactory)if(e.kind==='pinus')external+=countGroup(ops,'pinus')*(room.recipe.category==='F_EXP'?.1:room.recipe.category==='F_GOLD'?-.1:0);else if(e.kind==='blacksteel')external+=countGroup(ops,'blacksteel')*.05;
   if(ctx.powerOps.some(o=>isActive(o,morale)&&roomSkills(o,'POWER').some(s=>s.kind==='wildmane'))&&ops.some(o=>o.name==='와일드메인'))external+=.05;
   if(room.recipe.category==='F_GOLD')for(const op of ctx.control.filter(o=>isActive(o,morale)))for(const s of roomSkills(op,'CONTROL'))if(s.kind==='passionProd')external+=s.amount*(1+Math.floor(ctx.resources.passion/20));
   const multiplier=ops.length?Math.max(0,1+ops.length*.01+operatorProd+facilityProd+external):0;
   const capacity=Math.max(0,(model.data.factory.phases[room.level-1]?.outputCapacity??24)+[...caps.values()].reduce((a,b)=>a+b,0));
   const f={id:room.id,multiplier,capacity,recipe:room.recipe,room};factories.push(f);details.push({id:room.id,multiplier,capacity});
  }
 }
 // Recovery skills remain effective at zero morale. Providers are selected by their effect, not rarity.
 for(const p of placements.filter(p=>p.room.type==='DORMITORY')){
  const groupBonuses=[],singles=[],self=new Map(),all=p.ops;
  for(const provider of all)for(const s of roomSkills(provider,'DORMITORY')){
   let amount=s.amount??0;
   switch(s.kind){
    case 'selfRecovery':self.set(provider.index,(self.get(provider.index)??0)+amount);break;
    case 'selfAndAll':self.set(provider.index,(self.get(provider.index)??0)+.7);if(all.length>1)groupBonuses.push({provider,amount:.05});break;
    case 'allRecovery':groupBonuses.push({provider,amount});break;
    case 'selfAll':self.set(provider.index,(self.get(provider.index)??0)+s.self);if(s.all)groupBonuses.push({provider,amount:s.all,excludesSelf:s.excludesSelf});break;
    case 'singleRecovery':case 'partnerRecovery':case 'groupSingle':case 'measureRecovery':singles.push({provider,skill:s,amount:s.single});break;
    case 'selfSingle':self.set(provider.index,(self.get(provider.index)??0)+s.self);singles.push({provider,skill:s,amount:s.single});break;
    case 'unfullRecovery':groupBonuses.push({provider,amount:amount+(s.id.endsWith('[001]')?all.filter(o=>morale[o.index]<o.maxMorale-EPS).length*.01:0)});break;
    case 'powerRecovery':groupBonuses.push({provider,amount:amount+ctx.power*.05});break;
    case 'levelRecovery':groupBonuses.push({provider,amount:amount+(s.id.endsWith('[100]')?p.room.level*.02:0)});break;
    case 'dreamRecovery':groupBonuses.push({provider,amount:.1});break;
    case 'tiredRecovery':groupBonuses.push({provider,amount:s.id.endsWith('[000]')?.15:0,tired:s.id.endsWith('[000]')?18:20,tiredBonus:.1});break;
    case 'suiRecovery':groupBonuses.push({provider,amount:Math.min(4,ctx.globalCount('sui'))*.06});break;
    case 'medicRecovery':groupBonuses.push({provider,amount:Math.min(4,ctx.all.filter(o=>o.subclass==='wandermedic').length)*.06});break;
    case 'partyRecovery':groupBonuses.push({provider,amount:.15,partyBonus:.15});break;
   }
  }
  for(const op of all){
   if(roomSkills(op,'DORMITORY').some(s=>s.kind==='fixedRecovery')){rates[op.index]=2;continue;}
   const bonus=Math.max(0,...groupBonuses.filter(b=>!b.excludesSelf||b.provider!==op).map(b=>b.amount+(b.tired!==undefined&&morale[op.index]<=b.tired?b.tiredBonus:0)+(b.partyBonus&&hasGroup(op,'dungeon')?b.partyBonus:0)));
   rates[op.index]=p.room.recovery+bonus+(self.get(op.index)??0)+ctx.dormBonus;
  }
  // Each strongest single-target effect serves one eligible recipient in room order.
  if(singles.length){
   const best=[...singles].sort((a,b)=>b.amount-a.amount)[0],target=all.find(o=>o!==best.provider&&morale[o.index]<o.maxMorale-EPS);
   if(target&&!roomSkills(target,'DORMITORY').some(s=>s.kind==='fixedRecovery')){
    let amount=best.amount;const s=best.skill;
    if(s.kind==='partnerRecovery'&&['실론','가비알','블루포이즌'][Number(s.id.match(/\[(\d+)\]/)[1])]===target.name)amount+=.45;
    if(s.kind==='groupSingle'&&hasGroup(target,s.id.endsWith('[000]')?'sami':'laterano'))amount+=.45;
    rates[target.index]+=amount;
   }
  }
  const distributed=all.find(o=>roomSkills(o,'DORMITORY').some(s=>s.kind==='distributedRecovery'));
  if(distributed){const targets=all.filter(o=>o!==distributed&&morale[o.index]<o.maxMorale-EPS&&!roomSkills(o,'DORMITORY').some(s=>s.kind==='fixedRecovery'));for(const o of targets)rates[o.index]+=.8/Math.max(1,targets.length);}
 }
 return {rates,factories,offices,meetings,details,context:ctx};
}
function restPlacements(model,plan,team,morale,support,previous){
 const work=plan.teams[team].map((indices,i)=>({room:plan.rooms[i],ops:indices.filter(i=>i!==null).map(i=>model.pool[i])}));
 const busy=new Set(work.flatMap(p=>p.ops.map(o=>o.index))),dorms=model.rooms.filter(r=>r.type==='DORMITORY');
 const supporters=(support??[]).filter(i=>!busy.has(i));
 const returnOrder=new Map();for(let distance=1;distance<model.options.teams;distance++){const t=(team+distance)%model.options.teams;for(const group of plan.teams[t])for(const i of group)if(i!==null&&!returnOrder.has(i))returnOrder.set(i,distance);}
 const waiting=model.pool.filter(o=>!busy.has(o.index)&&!supporters.includes(o.index)&&morale[o.index]<o.maxMorale-EPS).sort((a,b)=>(returnOrder.get(a.index)??99)-(returnOrder.get(b.index)??99)||morale[a.index]-morale[b.index]||a.index-b.index);
 const used=new Set(busy),rest=[];
 for(const room of dorms){
  const indices=[];
  const oldRoom=previous?.find(p=>p.room.id===room.id);
  const preferredSupport=oldRoom?.ops.filter(o=>supporters.includes(o.index)).map(o=>o.index)??supporters;
  for(const i of preferredSupport)if(!used.has(i)&&model.canPlace(model.pool[i],room)&&indices.length<1){indices.push(i);used.add(i);}
  for(const op of oldRoom?.ops??[]){
   if(indices.length>=room.capacity)break;
   if(used.has(op.index)||!model.canPlace(op,room))continue;
   const needsBed=waiting.some(o=>!used.has(o.index)&&o.index!==op.index);
   if(morale[op.index]<op.maxMorale-EPS||!needsBed){indices.push(op.index);used.add(op.index);}
  }
  while(indices.length<room.capacity&&waiting.length){const op=waiting.shift();if(used.has(op.index)||!model.canPlace(op,room))continue;indices.push(op.index);used.add(op.index);}
  // Empty beds may retain a fully recovered operator for occupancy-linked production.
  const filler=model.pool.filter(o=>!used.has(o.index)&&model.canPlace(o,room));while(indices.length<room.capacity&&filler.length){const op=filler.shift();indices.push(op.index);used.add(op.index);}
  rest.push({room,ops:indices.map(i=>model.pool[i])});
 }
 return [...work,...rest];
}
export function validatePlan(model,plan){
 const global=new Map();
 for(let t=0;t<plan.teams.length;t++){
  const seen=new Set();
  for(let r=0;r<plan.rooms.length;r++){
   const indices=plan.teams[t][r];if(indices.length>plan.rooms[r].capacity)throw Error('시설 정원 초과');
   for(const i of indices){if(i===null)continue;if(!model.pool[i]||seen.has(i))throw Error('동시 중복 배치');seen.add(i);if(!model.canPlace(model.pool[i],plan.rooms[r]))throw Error('해당 시설 스킬이 없거나 미지원 스킬이 있는 배치');
    if(global.has(i)&&!plan.residents.includes(i))throw Error('교대조 간 중복 배치');global.set(i,t);
   }
  }
 }
 return true;
}
export function simulatePlan(model,plan,{cycles=6,record=false}={}){
 validatePlan(model,plan);
 const n=model.pool.length,morale=Float64Array.from(model.pool,o=>o.maxMorale),worked=new Float64Array(n),inventory=new Map(),totals={HIRE:0,MEETING_PREFERENCE:0,MEETING:0,F_GOLD:0,F_EXP:0,F_DIAMOND:0},stageLogs=[],actions=[];
 let clock=0,measured=0,valid=true,reason='',residentValid=true,lastAssignment=new Map(),previousBoundary=null,converged=false;
 const stageCount=cycles*model.options.teams,activeResidents=new Set(plan.residents),warmupStages=model.options.teams*2;
 for(let stage=0;stage<stageCount;stage++){
  const team=stage%model.options.teams,start=clock,startMorale=[...morale],stageProducts={HIRE:0,MEETING_PREFERENCE:0,MEETING:0,F_GOLD:0,F_EXP:0,F_DIAMOND:0},blocked=new Set();
  let placements=restPlacements(model,plan,team,morale,plan.support),stageHours=0,steps=0;
  const workIndices=placements.filter(p=>p.room.type!=='DORMITORY').flatMap(p=>p.ops.map(o=>o.index)),rotating=workIndices.filter(i=>!activeResidents.has(i));
  const assignment=new Map(placements.flatMap(p=>p.ops.map(o=>[o.index,p.room.id])));
  for(let i=0;i<n;i++)if(lastAssignment.get(i)!==assignment.get(i))worked[i]=0;
  lastAssignment=assignment;
  // A fully recovered Fiammetta can transfer morale at a shift boundary even without mid-shift actions.
  function exchange(){
   for(const p of placements.filter(p=>p.room.type==='DORMITORY')){
    const provider=p.ops.find(o=>roomSkills(o,'DORMITORY').some(s=>s.kind==='moraleExchange')&&morale[o.index]>=o.maxMorale-EPS);
    if(!provider)continue;
    let target=p.ops.filter(o=>o!==provider&&morale[o.index]<o.maxMorale-EPS).sort((a,b)=>morale[a.index]-morale[b.index])[0];
    if(model.options.extraActions){const worker=workIndices.filter(i=>!activeResidents.has(i)&&morale[i]<=12).map(i=>model.pool[i]).sort((a,b)=>morale[a.index]-morale[b.index])[0];if(worker&&(!target||morale[worker.index]<morale[target.index]))target=worker;}
    if(target){const old=morale[target.index];morale[target.index]=morale[provider.index];morale[provider.index]=old;if(workIndices.includes(target.index))worked[target.index]=0;if(record&&stage>=warmupStages)actions.push({hour:clock,room:p.room.id,type:'exchange',provider:provider.index,target:target.index});}
   }
  }
  exchange();
  if(record&&stage>=warmupStages)stageLogs.push({team,start:clock,rooms:placements.map(p=>({id:p.room.id,type:p.room.type,operators:p.ops.map(o=>o.index)})),startMorale:[...morale]});
  while(stageHours<168&&steps++<1500){
   const snap=evaluateSnapshot(model,placements,morale,worked);
   if(plan.residents.some(i=>snap.rates[i]<-EPS)){residentValid=false;valid=false;reason='상주 조건이 일부 조 또는 시간대에서 유지되지 않습니다.';break;}
   const eligible=rotating.filter(i=>snap.rates[i]<-EPS||morale[i]<=EPS);
   const shouldRotate=['12h','24h'].includes(model.options.rotation)?stageHours>=parseInt(model.options.rotation)-EPS:model.options.rotation==='first'?eligible.some(i=>morale[i]<=EPS):eligible.length>0&&eligible.every(i=>morale[i]<=EPS);
   if(shouldRotate)break;
   const drainTimes=eligible.filter(i=>morale[i]>EPS&&snap.rates[i]<-EPS).map(i=>morale[i]/-snap.rates[i]);
   if(!['12h','24h'].includes(model.options.rotation)&&!eligible.length){valid=false;reason='소진에 따른 교대 시각이 없습니다. 수거가 필요한 상주 배치입니다. 12시간 교대로 비교할 수 있습니다.';break;}
   let dt=Math.min(Math.floor(clock+EPS)+1-clock,...drainTimes,['12h','24h'].includes(model.options.rotation)?parseInt(model.options.rotation)-stageHours:Infinity);
   for(const p of placements)for(const o of p.ops){
    const rate=snap.rates[o.index];if(rate>EPS&&morale[o.index]<o.maxMorale-EPS)dt=Math.min(dt,(o.maxMorale-morale[o.index])/rate);
    for(const threshold of [4,8,12,16,18,20])if(Math.abs(rate)>EPS&&(threshold-morale[o.index])/rate>EPS)dt=Math.min(dt,(threshold-morale[o.index])/rate);
   }
   for(const f of snap.factories){
    const state=inventory.get(f.id)??{count:0,progress:0};inventory.set(f.id,state);
    if(f.multiplier>0&&state.count*f.recipe.weight<f.capacity-EPS)dt=Math.min(dt,(f.recipe.seconds-state.progress)/(f.multiplier*3600));
   }
   if(!Number.isFinite(dt)||dt<EPS){valid=false;reason='0시간 이벤트가 반복되는 배치입니다.';break;}
   for(const f of snap.factories){
    const state=inventory.get(f.id);if(state.count*f.recipe.weight>=f.capacity-EPS){blocked.add(f.id);continue;}
    state.progress+=dt*f.multiplier*3600;
    if(state.progress>=f.recipe.seconds-EPS){state.progress=Math.max(0,state.progress-f.recipe.seconds);state.count+=f.recipe.count;const amount=f.recipe.category==='F_EXP'?f.recipe.xp:f.recipe.count;stageProducts[f.recipe.category]+=amount;if(stage>=warmupStages)totals[f.recipe.category]+=amount;}
   }
   const contactWork=dt*snap.offices.reduce((sum,o)=>sum+o.multiplier,0);stageProducts.HIRE+=contactWork;if(stage>=warmupStages)totals.HIRE+=contactWork;
   for(const key of ['MEETING','MEETING_PREFERENCE']){const amount=dt*snap.meetings.reduce((n,m)=>n+(key==='MEETING'?m.multiplier:m.preference),0);stageProducts[key]+=amount;if(stage>=warmupStages)totals[key]+=amount;}
   for(let i=0;i<n;i++)morale[i]=Math.max(0,Math.min(model.pool[i].maxMorale,morale[i]+snap.rates[i]*dt));
   for(const i of workIndices)worked[i]+=dt;
   clock+=dt;stageHours+=dt;if(stage>=warmupStages)measured+=dt;
   if(model.options.extraActions){
    const next=restPlacements(model,plan,team,morale,plan.support,placements);
    const before=placements.filter(p=>p.room.type==='DORMITORY').flatMap(p=>p.ops.map(o=>o.index)).join(','),after=next.filter(p=>p.room.type==='DORMITORY').flatMap(p=>p.ops.map(o=>o.index)).join(',');
    if(before!==after){placements=next;if(record&&stage>=warmupStages)actions.push({hour:clock,type:'dorm',rooms:next.filter(p=>p.room.type==='DORMITORY').map(p=>({id:p.room.id,operators:p.ops.map(o=>o.index)}))});}
    exchange();
   }
  }
  if(!valid)break;
  if(stageHours<EPS){valid=false;reason='휴식 후 컨디션이 부족해 즉시 재교대가 필요합니다.';break;}
  if(stageHours>=168-EPS||steps>=1500){valid=false;reason='교대 시각 계산 한도에 도달했습니다.';break;}
  // Products are collected at the shift boundary. In-progress work is preserved.
  for(const state of inventory.values())state.count=0;
  if(record&&stage>=warmupStages){const entry=stageLogs.at(-1);Object.assign(entry,{hours:stageHours,end:clock,endMorale:[...morale],products:stageProducts,blocked:[...blocked]});}
  if((stage+1)%model.options.teams===0){
   const boundary=[...morale];if(previousBoundary){const diff=Math.max(...boundary.map((v,i)=>Math.abs(v-previousBoundary[i])));converged=diff<1e-5;}previousBoundary=boundary;
  }
 }
 const score=['HIRE','MEETING_PREFERENCE','MEETING',...model.options.priority].map(p=>measured>EPS?totals[p]/measured:0);
 return {valid,reason,residentValid,converged,score,totals,hours:measured,clock,morale:[...morale],stages:stageLogs,actions,cycles,plan};
}
function clonePlan(p){return {...p,teams:p.teams.map(t=>t.map(r=>[...r])),residents:[...p.residents],support:[...p.support]};}
function desirability(model,op,room){
 if(!model.canPlace(op,room))return -Infinity;
 let value=0;
 for(const s of roomSkills(op,room.type)){
  if(['simple','hireDorm','hireResources','hireElite','hirePartner','meetingTarget','meetingMissing','meetingOwned'].includes(s.kind))value+=s.prod*100-s.drain*3+Math.max(0,s.capacity)*.15;
  else if(s.kind==='irrelevant')value+=0;
  else value+=({ramp:22,automation:22,bubble:15,vermeil:16,globalProd:30,controlRecovery:9,factionRecovery:12,lancetPower:20,botGlobalProd:10,extraPower:10,perception:12,resourceProd:15,pinus:15,tradeCount:22,gummy:20,capacityAutomation:10,reserveA1:12,trainingLevel:30,skillCount:10,powerBots:15,dormLevels:15,partnerRecovery:8}[s.kind]??7);
  if(room.type==='MEETING'&&model.options.missingClues.length>0&&model.options.missingClues.length<7){if(s.kind==='meetingMissing'||s.kind==='meetingTarget'&&model.options.missingClues.includes(s.clue)||s.kind==='meetingPartner'&&s.missing)value+=100;if(s.kind==='meetingOwned')value-=100;}
  if(s.kind==='meetingGlobal')value+=s.amount*100;
  if(s.kind==='meetingControlClue'&&model.options.missingClues.includes(s.clue)&&model.options.missingClues.length<7)value+=50;
  if(s.kind==='hireDorm')value+=model.rooms.filter(r=>r.type==='DORMITORY').reduce((n,r)=>n+r.level,0)*s.amount*100;
  if(room.type==='MANUFACTURE'&&!matches(s,room.recipe))value-=Math.max(0,s.prod*100);
 }
 return value;
}
function makePlan(model,random,seedIndex=0,residents=[]){
 const rooms=model.rooms.filter(r=>r.type!=='DORMITORY'),teams=Array.from({length:model.options.teams},()=>rooms.map(()=>[])),used=new Set(residents),control=rooms.findIndex(r=>r.type==='CONTROL');
 if(control>=0)for(const team of teams)team[control]=[...residents];
 const positions=[];for(let t=0;t<teams.length;t++)for(let r=0;r<rooms.length;r++)for(let seat=teams[t][r].length;seat<rooms[r].capacity;seat++)positions.push({t,r,seat});
 positions.sort((a,b)=>{
  const priority=r=>r.type==='HIRE'?-2:r.type==='MEETING'?-1:r.type==='MANUFACTURE'?model.options.priority.indexOf(r.recipe.category):r.type==='CONTROL'?0.5:r.type==='POWER'?3:r.type==='TRADING'?4:5;
  return priority(rooms[a.r])-priority(rooms[b.r])||a.seat-b.seat||a.t-b.t;
 });
 for(const p of positions){
  const choices=model.pool.filter(o=>!used.has(o.index)&&model.canPlace(o,rooms[p.r])).map(op=>({op,value:desirability(model,op,rooms[p.r])+(seedIndex?random()*18:0)})).sort((a,b)=>b.value-a.value||a.op.index-b.op.index);
  const best=choices[0]?.op;if(best){teams[p.t][p.r].push(best.index);used.add(best.index);}else teams[p.t][p.r].push(null);
 }
 const supporters=model.pool.filter(o=>!used.has(o.index)&&o.skills.some(s=>s.room==='DORMITORY'&&s.kind!=='unsupported')&&!o.skills.some(s=>s.room==='DORMITORY'&&s.kind==='unsupported')).map(op=>({op,value:op.skills.filter(s=>s.room==='DORMITORY').reduce((n,s)=>n+(s.single??0)+(s.all??0)+(s.amount??0),0)})).sort((a,b)=>b.value-a.value);
 const support=supporters.slice(0,model.rooms.filter(r=>r.type==='DORMITORY').length*(seedIndex%3===1?0:seedIndex%3===2?2:1)).map(v=>v.op.index);
 return {rooms,teams,residents,support};
}
function residentCandidates(model){
 const control=model.rooms.find(r=>r.type==='CONTROL');if(!control)return [];
 const rainbow=model.pool.filter(o=>model.canPlace(o,control)&&o.skills.some(s=>s.kind==='factionRecovery'&&s.group==='rainbow'));
 const result=[];if(rainbow.length>=4&&control.capacity>=4)result.push(rainbow.slice(0,4).map(o=>o.index));
 const alters=model.pool.filter(o=>o.alter&&model.canPlace(o,control));
 const recovery=alters.filter(o=>o.skills.some(s=>s.kind==='factionRecovery'&&s.group==='alter'));
 if(control.capacity===5&&recovery.length>=3&&alters.length>=5){const selected=[...recovery.slice(0,3),...alters.filter(o=>!recovery.slice(0,3).includes(o)).slice(0,2)];result.push(selected.map(o=>o.index));}
 return result;
}
export async function optimizeBase(model,{budgetMs=8000,onProgress=()=>{},isCancelled=()=>false}={}){
 if(model.missing.length)throw Error(model.missing.join('\n'));
 let seed=47319;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const started=Date.now(),residentSets=[[],...residentCandidates(model)],seeds=[];let tested=0,best=null,bestInvalid=null;const finalists=[];
 const evaluate=plan=>{tested++;const value=simulatePlan(model,plan,{cycles:5});if(value.valid){finalists.push(value);finalists.sort((a,b)=>compareScores(b.score,a.score));if(finalists.length>4)finalists.pop();}if(value.valid&&(!best||compareScores(value.score,best.score)>0))best=value;else if(!value.valid&&!bestInvalid)bestInvalid=value;return value;};
 for(let i=0;i<Math.max(6,residentSets.length*3);i++){
  if(isCancelled())throw Error('계산을 취소했습니다.');
  const plan=makePlan(model,random,i,residentSets[i%residentSets.length]);const result=evaluate(plan);seeds.push(result);
  onProgress({tested,elapsed:Date.now()-started});await new Promise(r=>setTimeout(r,0));
  if(Date.now()-started>=budgetMs)break;
 }
 // Joint swaps include different shifts, different facilities and unused operators.
 let current=best??seeds.find(s=>s.valid)??seeds[0],iterations=0;
 while(current&&Date.now()-started<budgetMs&&iterations++<1500){
  if(isCancelled())throw Error('계산을 취소했습니다.');
  const next=clonePlan(current.plan),positions=[];
  for(let t=0;t<next.teams.length;t++)for(let r=0;r<next.rooms.length;r++)for(let s=0;s<next.teams[t][r].length;s++)if(!next.residents.includes(next.teams[t][r][s]))positions.push([t,r,s]);
  if(!positions.length)break;
  const a=positions[Math.floor(random()*positions.length)],get=p=>next.teams[p[0]][p[1]][p[2]],set=(p,v)=>next.teams[p[0]][p[1]][p[2]]=v;
  if(next.rooms[a[1]].type==='MEETING'&&get(a)!==null&&random()<.12)set(a,null);
  else if(random()<.65&&positions.length>1){const b=positions[Math.floor(random()*positions.length)],av=get(a),bv=get(b);if(av!==null&&!model.canPlace(model.pool[av],next.rooms[b[1]])||bv!==null&&!model.canPlace(model.pool[bv],next.rooms[a[1]]))continue;set(a,bv);set(b,av);}
  else{const used=new Set(next.teams.flat(2).filter(i=>i!==null)),unused=model.pool.filter(o=>!used.has(o.index)&&!next.support.includes(o.index)&&model.canPlace(o,next.rooms[a[1]]));if(!unused.length)continue;set(a,unused[Math.floor(random()*unused.length)].index);}
  const candidate=evaluate(next);
  if(candidate.valid&&(!current.valid||compareScores(candidate.score,current.score)>=0))current=candidate;
  if(tested%12===0){onProgress({tested,elapsed:Date.now()-started});await new Promise(r=>setTimeout(r,0));}
 }
 if(!best)return {status:'infeasible',reason:bestInvalid?.reason??'현재 인원과 설정으로 실행 가능한 배치를 찾지 못했습니다.',tested,warnings:model.warnings};
 let final=null;for(const candidate of finalists){const checked=simulatePlan(model,candidate.plan,{cycles:10,record:true});if(checked.valid&&(!final||compareScores(checked.score,final.score)>0))final=checked;}
 if(!final)return {status:'infeasible',reason:'장기 반복 검증에서 유지 가능한 배치를 찾지 못했습니다.',tested,warnings:model.warnings};
 const maxStages=model.options.teams;
 return {...final,status:'recommended',optimal:false,tested,elapsed:Date.now()-started,warnings:model.warnings,pool:model.pool.map(o=>({id:o.id,name:o.name})),stages:final.stages.slice(-maxStages*2),actions:final.actions.filter(a=>a.hour>=(final.stages.at(-maxStages*2)?.start??0)),coverage:{known:Object.values(model.data.buffs).filter(b=>compileSkill(b).kind!=='unsupported').length,total:Object.keys(model.data.buffs).length}};
}
