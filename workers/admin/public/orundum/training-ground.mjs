// CH training maps use trainingGround.stages, separate from dungeon.stages.
// First-clear reward/entry: https://wiki.biligame.com/arknights/训练场
export const TRAINING_GROUND=Array.from({length:7},(_,i)=>({id:'ch_'+(i+1),code:'CH-'+(i+1),name:['적 목표 탐색','아군 목표 탐색','공격 속도','상태 이상','밀어내기와 당기기','적 원소 피해','아군 원소 피해'][i],amount:200}));
export function trainingGroundRewards(user){
 const stages=user.trainingGround?.stages,known=stages&&typeof stages==='object';
 const main=user.dungeon?.stages?.['main_03-08'];
 const unlocked=main?.state===3||Object.values(stages??{}).some(s=>s.state===3);
 return TRAINING_GROUND.map(p=>{const record=stages?.[p.id],status=!known?'unknown':record?.state===3?'claimed':record&&![0,1,2].includes(record.state)?'unknown':'remaining';return {...p,title:p.code+' · '+p.name,category:'training',status,access:unlocked?'바로 도전 가능':'3-8 클리어 필요',condition:'3-8 클리어 후 메인 화면 → 파일 → 훈련장',reason:!known?'훈련장 기록이 포함된 계정을 다시 가져와 주세요.':status==='claimed'?'훈련 완료 기록':'훈련 미완료'};});
}
