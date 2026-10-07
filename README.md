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

모든 비용은 해당 단계로 올라가는 **단계별 비용**입니다. 향후 현재 상태→목표 상태 계산에서는 사이 단계의 cost를 ID별로 합산합니다. 모듈은 타입 대신 모듈 ID로 연결해야 합니다. `materials.html?operator=<오퍼레이터 ID>`로 특정 오퍼레이터를 바로 조회할 수 있습니다. `plans.html`의 필요 재료 확인 기능에서 현재→목표의 비용을 자동 합산합니다.

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

부족량은 가방 보유량을 빼서 계산합니다. 제작 가능 수량은 전체 선택 계획에 직접 필요한 재료를 먼저 남겨 둔 후, 남는 재료·용문폐로 계산한 **재료별 최대치**입니다. 서로 다른 제작식에서 같은 재료를 중복 사용할 수 있으므로 동시 제작 계획은 아닙니다. 시설·스테이지 해금, 누적 경험치, 육성권, 제작 부산물은 자동 계산하지 않습니다. 오퍼레이터 획득·잠재·신뢰도는 재료 합계와 구분해 안내하며 실제 보유·계획·가방 저장 데이터에는 쓰지 않습니다.

```sh
node --test tests/test_growth.mjs
```
