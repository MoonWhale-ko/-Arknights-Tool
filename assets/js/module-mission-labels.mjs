// Unofficial Korean translations for module missions not yet localized on KR.
const descriptions={
 uniequip_002_closur_1:'전투 5회 완료. 지원 유닛이 아닌 클로저를 편성하고, 매 전투에서 클로저를 첫 번째 오퍼레이터로 배치해야 합니다.',
 uniequip_002_closur_2:'바벨 BB-4를 3★로 클리어. 지원 유닛이 아닌 클로저를 편성·배치하고, 클로저 외에는 뱅가드 오퍼레이터를 편성하지 않아야 합니다.'
};
export const moduleMissionDescription=mission=>descriptions[mission.id]??mission.description;
