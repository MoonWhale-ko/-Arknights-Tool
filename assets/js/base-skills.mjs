// Explicit, versioned skill handlers. Unknown skills are never silently interpreted as zero.
const number=(text,re,fallback=0)=>Number(text.match(re)?.[1]??fallback);
const tagMap={'용문근위국':'lgd','우르수스 학생자치단':'student','쉐라그':'karlan','레인보우 팀':'rainbow','라인 랩':'rhine','블랙스틸 월드와이드':'blacksteel','피누스 실베스트리스':'pinus','예비작전팀 A1':'reserve1','쉐이':'sui','사미':'sami','라테라노':'laterano','글래스고':'glasgow','어비설 헌터스':'abyssal','정예':'elite','아이루와 유쾌한 친구들':'mh'};
export const hasGroup=(op,group)=>group==='alter'?op.alter:op.groups?.includes(group);
export function compileSkill(buff){
 const {id,description:d,room}=buff,head=id.split('[')[0];
 const rule={...buff,kind:'unsupported',prod:0,capacity:0,drain:0};
 const simple=()=>{rule.kind='simple';rule.prod=buff.base||0;rule.capacity=number(d,/창고 용량 상한\s*([+-][\d.]+)/);rule.drain=number(d,/시간당 컨디션 소모\s*([+-][\d.]+)/);return rule;};
 if(room==='MANUFACTURE'){
  if(['manu_prod_spd','manu_prod_spd&limit','manu_prod_limit&cost','manu_formula_cost','manu_formula_limit','manu_prod_spd&limit&cost','manu_formula_spd','manu_formula_spd&limit&cost','manu_formula_spd&cost','manu_formula_spd&bd'].includes(head)){
   simple();if(head==='manu_formula_spd&bd'&&id.endsWith('[001]'))rule.kind='ursusExp';return rule;
  }
  const kinds={'manu_prod_spd&power':'automation','manu_prod_spd&manu':'capacityAutomation','manu_prod_spd_variable':'vermeil','manu_prod_spd_variable3':'bubble','manu_prod_spd_variable2':'mizuki','manu_prod_spd_addition':'ramp','manu_prod_spd_reduce':'moraleLoss','manu_prod_spd_addition&cost':'moraleThreshold','manu_prod_spd_train&lv':'trainingLevel','manu_prod_spd&trade':'tradeCount','manu_formula_spd&dorm&lv':'dormLevels','manu_token_prod_spd':'powerBots','manu_prod_spd_double':'pair','manu_formula_spd_P':'gummy','manu_skill_spd1':'skillCount','manu_skill_change':'skillChange','manu_skill_limit':'skillCapacity','manu_prod_spd&fraction':'reserveA1','manu_formula_spd&cost_bd':'factionGold','manu_prod_spd_bd_n1':'perception','manu_constrLv':'robots','manu_prod_spd_bd':'resourceProd','manu_bd_to_bd':'worldlyConvert','manu_cost':'factoryDrain'};
  if(kinds[head]){
   rule.kind=kinds[head];
   if(head==='manu_prod_spd_double')rule.partner=id.endsWith('[000]')?'워미':'트라고디아';
   if(rule.kind==='ramp'){rule.initial=buff.base;rule.step=number(d,/(?:그 이후 )?시간당\s*\+([\d.]+)%/)/100;rule.max=number(d,/최대\s*\+([\d.]+)%/)/100;}
   if(rule.kind==='resourceProd'){
    const resources={'[100]':['robots',16,.05],'[110]':['robots',8,.05],'[000]':['thought',2,.01],'[010]':['thought',1,.01],'[200]':['witchcraft',1,.01],'[201]':['witchcraft',1,.02],'[300]':['worldly',3,.01],'[400]':['dishes',1,.01]};
    [rule.resource,rule.divisor,rule.amount]=resources[id.slice(id.indexOf('['))]??[];if(!rule.resource)rule.kind='unsupported';
   }
   if(rule.kind==='automation')rule.amount=number(d,/생산력\s*\+([\d.]+)%/)/100;
   if(rule.kind==='tradeCount'||rule.kind==='powerBots')rule.amount=number(d,/생산력\s*\+([\d.]+)%/)/100;
   if(rule.kind==='pair')rule.amount=number(d,/생산력\s*\+([\d.]+)%/)/100;
   return rule;
  }
  // Skills with unverified resource providers/condition-removal rules are explicitly excluded.
  return rule;
 }
 if(room==='CONTROL'){
  if(head==='control_hire_spd'){rule.kind='hireThreshold';return rule;}
  if(head==='control_prod_spd'){rule.kind='globalProd';rule.amount=.02;return rule;}
  if(head==='control_token_prod_spd'){rule.kind='botGlobalProd';return rule;}
  if(head==='control_pow_bot'){rule.kind='lancetPower';return rule;}
  if(head==='control_mp_cost'){rule.kind='controlRecovery';rule.amount=.05;return rule;}
  if(head==='control_mp_cost&faction'){
   const group=Object.entries(tagMap).find(([label])=>d.includes(label))?.[1]??(d.includes('얼터네이트')?'alter':null);
   if(group){rule.kind='factionRecovery';rule.group=group;rule.amount=.05;}return rule;
  }
  if(head==='control_mp_cost_double'){rule.kind='amiyaRecovery';rule.amount=number(d,/회복\s*\+([\d.]+)/);return rule;}
  if(head==='control_allCost_condChar'){rule.kind='aakRecovery';return rule;}
  if(head==='control_dorm_rec'){rule.kind='globalDorm';rule.amount=.05;return rule;}
  if(head==='control_dorm_rec_tag'){rule.kind='eliteDorm';return rule;}
  if(head==='control_dorm_bd'){rule.kind='passionDorm';return rule;}
  if(head==='control_prod_bd_spd'){rule.kind='passionProd';rule.amount=number(d,/생산력\s*\+([\d.]+)%/)/100;return rule;}
  if(head==='control_mp_bd&trade'){rule.kind='passionSelf';return rule;}
  if(head==='control_meeting_spd&bd'||head==='control_hire_spd&bd'){rule.kind='passionTen';rule.hireBonus=head==='control_hire_spd&bd'?.1:0;return rule;}
  if(head==='control_mp_bd'){rule.kind='factionResource';rule.group=id.endsWith('[000]')?'rainbow':'student';rule.resource=id.endsWith('[000]')?'info':'drink';return rule;}
  if(head==='control_mp_cost&bd1'){rule.kind='lowWorldly';return rule;}
  if(head==='control_mp_cost&bd2'&&id.endsWith('[000]')){rule.kind='highPerception';return rule;}
  if(head==='control_mp_cost&bd_up'){rule.kind='suiWorldly';return rule;}
  if(head==='control_costToBD'){rule.kind='lingResource';return rule;}
  if(head==='control_mp_psk'){rule.kind='pinus';return rule;}
  if(head==='control_bd_spd'){rule.kind='blacksteelControl';return rule;}
  if(head==='control_clue_cost'){rule.kind='controlPenalty';rule.amount=number(d,/소모\s*\+([\d.]+)/);return rule;}
  if(['control_tra_spd','control_tra_limit&spd','control_tra_limit&spd2','control_tra_limit&spd3','control_meeting&ord','control_upMeetingSpeed','control_clue_faction','control_train_spd','control_hire_spd','control_token_tra_spd'].includes(head)){rule.kind='irrelevant';return rule;}
  return rule;
 }
 if(room==='POWER'){
  if(head==='power_count'){rule.kind='extraPower';return rule;}
  if(head==='power_prod_spd_P'){rule.kind='wildmane';return rule;}
  if(head==='power_rec_spd&cost')return simple();
  // Drone effects do not enter the objective; none of these handlers grants a morale bonus.
  if(head.startsWith('power_rec_')){rule.kind='irrelevant';return rule;}
 }
 if(room==='HIRE'){
  if(head==='hire_spd_dorm&lv'){simple();rule.kind='hireDorm';rule.amount=id.endsWith('[010]')?.02:.01;return rule;}
  if(head==='hire_spd_blitz'){simple();rule.kind='hireResources';return rule;}
  if(head==='hire_spd_tag'){simple();rule.kind='hireElite';return rule;}
  if(id==='hire_spd_cost&char[001]'){simple();rule.kind='hirePartner';return rule;}
  // Slot-count-dependent morale and resource effects remain excluded until modeled.
  if(id==='hire_spd_cost&clue[000]')return rule;
  if(/^(hire_spd|hire_spd_cost|hire_spd&clue|hire_spd_cost&char|hire_spd_cost&clue|hire_spd&clue2)$/.test(head))return simple();
  return rule;
 }
 if(room==='TRADING'){
  // No trade revenue objective. Resource and conditional morale skills require their own handlers.
  if(/bd|tag|dorm|power|variable|limit_count|hire/.test(head)||/모든 오퍼레이터|각각|마다.*컨디션|컨디션.*마다/.test(d))return rule;
  simple();rule.prod=0;return rule;
 }
 if(room==='DORMITORY'){
  const fixed={dorm_recExcludeOther:'fixedRecovery',dorm_exchangeAp:'moraleExchange',dorm_rec_oneself:'selfRecovery',dorm_rec_oneself2:'selfAndAll',dorm_rec_single:'singleRecovery',dorm_rec_single_P:'partnerRecovery',dorm_rec_single_power:'groupSingle',dorm_rec_single_distribute:'distributedRecovery',dorm_rec_all:'allRecovery','dorm_rec_all&single':'distributedRecovery'};
  // '&' keys are quoted below to keep their identifiers explicit.
  const kinds={...fixed,'dorm_rec_all&unfull':'unfullRecovery','dorm_powToRecAll':'powerRecovery','dorm_rec_all&lv':'levelRecovery','dorm_rec_single&oneself':'selfSingle','dorm_rec_all&oneself':'selfAll','dorm_rec_all&tag':'partyRecovery','dorm_rec_all&group':'suiRecovery','dorm_rec_all&profession':'medicRecovery','dorm_rec_all&tired':'tiredRecovery','dorm_rec_bd_n1_n2':'dreamRecovery','dorm_rec_bd_n1_n3':'measureRecovery','dorm_rec_bd_n1':'perceptionConvert','dorm_rec_bd_dungeon':'dishes'};
  if(kinds[head]){
   rule.kind=kinds[head];rule.amount=number(d,/회복(?: 속도)?\s*([+-][\d.]+)/);
   if(['singleRecovery','partnerRecovery','groupSingle','selfSingle','measureRecovery'].includes(rule.kind))rule.single=number(d,/회복\s*\+([\d.]+)/);
   if(rule.kind==='selfSingle')rule.self=number(d,/자신의 시간당 컨디션 회복\s*\+([\d.]+)/);
   if(rule.kind==='selfAll'){
    rule.self=number(d,/자신의 시간당 컨디션 회복\s*([+-][\d.]+)/);rule.all=number(d,/(?:모든 오퍼레이터의 시간당 컨디션 회복|모든 오퍼레이터의 시간당 회복)\s*\+([\d.]+)/);rule.excludesSelf=d.includes('자신을 제외한');
   }
   return rule;
  }
 }
 return rule;
}
export function unlockSkills(character,progress,buffs){
 return (character.chains??[]).flatMap(chain=>{
  const row=chain.filter(r=>Number(progress.elite)>r.elite||(Number(progress.elite)===r.elite&&Number(progress.level)>=r.level)).at(-1);
  return row&&buffs[row.id]?[buffs[row.id]]:[];
 });
}
