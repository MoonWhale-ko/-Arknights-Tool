# 명일방주 도구

GitHub Pages의 단일 사이트: `index.html`, `recruitment.html`, `operators.html`, `materials.html`.

## 육성 데이터 갱신

Python 3만 필요합니다. 저장소 루트에서 실행합니다.

```sh
python scripts/update_data.py
python -m unittest discover -s tests -v
```

갱신 스크립트는 ArknightsAssets/ArknightsGamedata의 master를 하나의 커밋으로 고정한 뒤 `kr/gamedata/excel/`에서 아래 원본을 읽습니다. 결과 `data/operators.json`, `data/items.json`을 함께 커밋하면 Pages 배포에 반영됩니다. 페이지 실행 중에는 이 두 내부 JSON만 읽으며 외부 게임 데이터 JSON을 요청하지 않습니다. 초상화와 재료 **이미지**는 기존 외부 이미지 저장소를 계속 사용하며, 이미지 실패는 재료명·수량 조회에 영향을 주지 않습니다.

- character_table.json: 획득 가능한 char_ 오퍼레이터, 정예화, 스킬 및 마스터리 비용
- char_patch_table.json: 아미야의 가드·메딕 직군, 실제 스킬 및 직군 해금 조건
- item_table.json: 실제 사용되는 재료 ID, 한국어 이름, iconId
- skill_table.json: 실제 보유 스킬의 한국어 이름
- uniequip_table.json: charEquip 연결로 확인한 실제 모듈, 단계별 비용 및 해금 조건
- uniequip_data.json: 원본 확인·해시 기록용. 구형 시험 데이터이므로 최신 모듈을 덮어쓰거나 보충하지 않음
- gamedata_const.json: 등급별 정예화 용문폐 (character_table의 evolveCost에는 없음)

특정 버전을 재현하려면 `python scripts/update_data.py --ref <원본 커밋 SHA>`를 사용합니다. source에 원본 커밋·원본 갱신 시각·파일별 SHA-256을 저장합니다. 동일 원본은 동일 JSON을 생성합니다. 원본 다운로드나 참조 검증이 실패하면 생성 전에 중단합니다.

## 데이터 구조 (version 2)

- operators: ID, 이름, 등급(1~6), 직군, 세부 직군, 최대 잠재, phases, skillLevels, skills, modules
- phases: phase(0/1/2), maxLevel, evolveCost. `4001` 용문폐가 **비용 배열에 한 번 포함**되므로 별도 용문폐를 추가 합산하면 안 됩니다.
- skillLevels: from → to, unlockCondition, cost (Lv.1→2부터 실제 가능한 단계)
- skills: 실제 스킬 ID, index, 한국어 이름, unlockCondition, mastery. mastery는 level(1~3), time(초), unlockCondition, cost.
- modules: 실제 모듈 ID, 한국어 이름, type(X/Y/D/A/B 등 원본 값; D는 화면에서 Δ), costs(stage 1~3), unlockPhase, unlockLevel, missions.
- unlockFavorPointsByStage: 원본 신뢰도 **포인트** 값이며 백분율이 아닙니다. 추후 백분율 표시 시 별도 변환이 필요합니다.
- items: 사용된 재료 ID를 키로 한 `{id, name, iconId}` 사전.

기본 장비(INITIAL), 소환물, 획득 불가능 유닛은 제외합니다. 모듈·마스터리 없는 오퍼레이터는 빈 배열입니다. 동일 이름의 다른 직군은 원본 ID로 구별합니다.

아미야의 캐스터·가드·메딕은 별도 카드와 원본 ID로 저장합니다. `sharedGroup`으로 정예화·레벨·잠재·신뢰도·스킬 레벨을 자동 공유하며 보유 여부(직군 해금), 마스터리와 모듈은 각각 유지합니다. 기존 계정 가져오기의 `classVariants` 데이터는 별도 카드로 자동 이관합니다. 육성 계획도 같은 규칙을 사용하며, 선택된 아미야 카드 사이에서 공통 재료를 한 번만 합산합니다.

모든 비용은 해당 단계로 올라가는 **단계별 비용**입니다. 향후 현재 상태→목표 상태 계산에서는 사이 단계의 cost를 ID별로 합산합니다. 모듈은 타입 대신 모듈 ID로 연결해야 합니다. `materials.html?operator=<오퍼레이터 ID>`로 특정 오퍼레이터를 바로 조회할 수 있습니다. `plans.html`의 필요 재료 확인 기능에서 현재→목표의 비용을 자동 합산합니다.

## 미래시 오퍼레이터

확인한 19명을 기존 목록에 함께 표시하고 사진 위에 `미래시` 배지를 붙입니다. `isFuture: true`, `dataLocale: cn`, 비공식 한국어 이름은 `data/future-names.json`에서 관리합니다. 스킬·모듈 이름과 임무는 중국어 원문이며, 비용·실제 스킬/모듈 목록은 중국 서버 원본에서 추출합니다. 한국 서버에서 사용하는 기존 비용과 공식 이름은 덮어쓰지 않습니다. 추가 재료 4종은 나무위키의 비공식 한국어 표기를 사용합니다. 목록, 계획, 재료 조회, PNG에도 미래시 구분이 유지됩니다. 공개모집 대상에는 추가하지 않습니다.

`update_data.py`는 한국 데이터 생성 후 미래시 데이터를 함께 갱신합니다. 두 원본은 `source`(KR)와 `futureSource`(CN)의 커밋·해시로 추적합니다. 미래시만 갱신할 때는 `python scripts/update_future_data.py --ref <CN 커밋>`을 실행합니다. 로컬 원본 재현은 `--source-dir <CN 파일 폴더>`를 사용하며 폴더의 `source.json`은 해당 GitHub 커밋 API 응답입니다. 전체 로컬 갱신에서는 `update_data.py --future-source-dir <CN 파일 폴더>`를 함께 지정합니다. 한국 데이터에 동일 ID가 등장하면 공식 데이터가 우선하며 미래시 배지를 자동 제거합니다. ID와 저장소 키는 유지하므로 기존 계획도 유지됩니다.

## 저장 데이터 호환성

`operators.html`의 localStorage 키 `arknightsOperatorProgressV1`, 원본 오퍼레이터 ID 및 저장 형식을 유지합니다. 데이터 갱신은 사용자 저장소를 초기화하지 않습니다. 저장 내용은 기존과 같이 같은 브라우저·사이트 주소에서 유지됩니다.

## 검증

```sh
python -m unittest discover -s tests -v
python -m http.server 8000
```

브라우저에서 `/materials.html`의 검색, 정예화 용문폐, 스킬·모듈 비용, 네 페이지 이동을 확인합니다. Pages 워크플로도 배포 전에 데이터 검증을 실행합니다. 공개모집 계산기와 오퍼레이터 관리 페이지 코드는 이 데이터 갱신 작업에서 변경하지 않습니다.

## 게임 계정 가져오기 (Cloudflare 연결 준비)

`operators.html`에 한국 서버 요스타 이메일 인증 가져오기 UI를 추가했습니다.
현재 Workers URL은 비어 있어 연결 안내만 표시합니다. Cloudflare 배포 후 URL을 설정해야 합니다.
계정 조회 서버: `workers/account/`, 브라우저 코드: `assets/js/account-*.mjs`,
신뢰도 변환표: `data/account-favor.json`.
[Cloudflare 연결 절차와 검증 범위](docs/cloudflare-account-setup.md)를 참고하세요.
실제 계정 조회는 배포 후 검증이 필요합니다. 현재→목표 재료 합산은 `plans.html`에서 제공합니다.


## 육성 계획의 추가 재료

`plans.html`에서 목표 상태를 지정하고 **필요 재료 확인**을 누릅니다. 전체 계획 또는 한 명을 선택하여 정예화, 레벨 경험치·용문폐, 공통 스킬, 마스터리, 실제 모듈의 미완료 단계만 합산합니다. 필터로 숨긴 오퍼레이터도 전체 계획 합계에는 포함됩니다. 미보유 오퍼레이터는 E0 Lv.1을 출발점으로 계산합니다.

`data/growth.json`은 같은 한국 서버 원본 커밋의 레벨 비용, 작전기록 경험치, 가공소·제조소 제작식, 칩 전환식 및 그 재료 ID·이름·아이콘을 저장합니다. 갱신 스크립트는 `building_data.json`도 읽어 이 파일을 함께 생성합니다. 브라우저에서는 외부 게임 JSON을 요청하지 않습니다.

부족량은 가방 보유량을 빼서 계산합니다. 제작 가능 수량은 전체 선택 계획에 직접 필요한 재료를 먼저 남겨 둔 후, 남는 재료·용문폐로 계산한 **재료별 최대치**입니다. 서로 다른 제작식에서 같은 재료를 중복 사용할 수 있으므로 동시 제작 계획은 아닙니다. 시설·스테이지 해금, 누적 경험치, 육성권, 제작 부산물은 자동 계산하지 않습니다. 오퍼레이터 획득·신뢰도는 재료 합계와 구분해 안내하며 실제 보유·계획·가방 저장 데이터에는 쓰지 않습니다.

```sh
node --test tests/test_growth.mjs
```


잠재 상승은 추가 단계당 전용 증표 1개를 재료 목록에 합산합니다. 증표를 가리키거나 키보드로 포커스를 두거나 모바일에서 누르면, 해당 오퍼레이터의 공용 증표 대체 가능 여부와 이미지·교환 비율·부족분 대체 수량·보유 수량을 표시합니다. 대체 가능 여부는 `canUseGeneralPotentialItem`, 공용 증표 ID는 한국 서버 `potentialItems`, 수량은 `commonPotentialLvlUpCount`에서 추출합니다. 공용 증표는 여러 오퍼레이터에 공유되므로 자동 차감하지 않습니다. 가방의 증표 분류에서도 보유 수량을 수정할 수 있습니다.

## 기반시설 배치·교대 추천

`base.html`에서 기존 `arknightsOperatorProgressV1`의 보유·정예화·레벨 정보를 읽고, 별도 `arknightsBaseSettingsV1`에 시설·숙소·교대 시각·제외 인원·시작 컨디션·추천 우선순위를 저장합니다. 보유·육성 정보를 수정하지 않으며 아미야의 세 직군은 한 사람으로 계산합니다.

한국 서버 `building_data.json`과 `character_table.json`에서 정리한 `data/base.json`을 사용합니다. 런타임에는 저장소에 포함된 데이터만 읽으며, 갱신은 `python3 scripts/update_base_data.py`로 실행합니다. 1~2성의 레벨 해금도 반영합니다. 한국 서버 미출시 인원은 제외합니다.

계산은 Web Worker에서 시설별 후보 조합과 세 가지 배정 순서를 비교하는 휴리스틱으로 수행합니다. 설정한 교대 시각 사이를 15분 단위로 7일간 모의 운영하며, 시설 인원 제한·중복 배치·숙소 5인 제한·컨디션·일부 연동 스킬·제조소 창고 상한을 적용합니다. 절대 최적해나 모든 특수 조합의 지원을 보장하지 않습니다. 각 스킬의 지원 여부와 계산 제한은 화면에 표시합니다. 미지원 근무 스킬이 있는 인원은 해당 시설의 자동 추천에서 제외합니다.

제조소 출력은 연속 생산 추정량이며, 무역소는 주문 속도만 비교합니다. 특수 주문, 주문 적재 상한, 금괴 공급, 실제 용문폐 수익과 드론 소비는 계산하지 않습니다. 가공소·훈련실은 전력만 계산합니다. 예시 배치는 가상의 전원 보유·최고 육성·컨디션 24 조건이며 실제 보유 정보에 영향을 주지 않습니다.

검증: `node --test tests/test_base.mjs` (해금, 아미야 통합, 조합 효과, 컨디션·숙소 제한, 7일 배치 중복과 설정 오류).
