# 영광의 길 원본 UI 추적 기록

2026-10-29. 제공된 한국 PC 클라이언트 파일을 기준으로 확인했다. 이번 변경은 조사 자료 저장이며 화면 동작 변경은 아니다. 계정 정보는 포함하지 않는다.

## 확인 범위

- 훈장 화면·관련 프리팹 및 공통 메뉴의 413개 노드: 부모 구조, 순회/그리기 순서, 회전, 컴포넌트와 이미지 설정.
- 기존 native-scene/native-common의 앵커·피벗·크기·배율에 추가하여 원본 Canvas/CanvasGroup 및 머티리얼 참조를 조사했다.
- GameAssembly.dll과 global-metadata.dat v29에서 상세창 기본 실행 코드 33개 메서드를 제한적으로 역어셈블했다. 핫픽스 분기가 있으므로 실제 실행 결과 전체를 검증한 것은 아니다.
- 원본 배경 70개, 배치 프리팹 68개, 기존 전환 클립 4개에 더해 상세 확대 클립 3개를 확인했다.

## 구체적으로 확인한 사항

| 항목 | 원본에서 확인한 값·연결 | 현재 구현과의 관계 |
| --- | --- | --- |
| 중앙 상세창의 흐림 | MedalDetailMiddleHolderSingleton의 `_blurImage`. OnOpenDetail → UIPopupWindow.ShotBlurredImage → _ShotBlurredCamera 호출 | 배경 화면을 캡처해 처리하는 경로. 단순한 검은 반투명 배경과 동일하지 않음 |
| 행 확장 상세창 | MedalDetailHolderSingleton은 중앙 상세창과 다른 클래스이며 `_blurImage` 필드가 없음 | 모든 상세창에 동일한 블러를 적용하면 원본과 달라짐 |
| 상세 확대 방향 | `enlarge_already_get_down`, `enlarge_already_get_up` | 두 클립 모두 원본 상세 프리팹 2594/1822의 Animation 목록에 직접 연결됨 |
| 확대 시간 | 두 클립 모두 0.5초. container 이동은 0~0.283333초, 내용 CanvasGroup 알파는 0.283333초의 0에서 0.5초의 1로 전환 | 현재의 화면 관측 기반 reveal/fade와 구별해야 함 |
| 확대 기준 크기 | 클립 container의 SizeDelta 1112.30005 × 332.60001 | 현재 수동 재배치의 1112 × 311과 같지 않음. 실제 보이는 범위는 마스크·부모 변환까지 계산해야 함 |
| 정적 확대 상태 | `large_common`, duration 0, mask_container m_Enabled=0 | 위치·크기뿐 아니라 마스크 활성 상태가 바뀜 |
| 가장자리 페이드 | SoftMask + ScrollRectSoftMask. both_mask_v / bottom_mask_v / head_mask_v | 모두 1×476 이미지. 양방향/아래/위 페이드가 따로 있으며 직사각형 자르기만으로는 재현되지 않음 |
| 페이드 실제 알파 | both_mask_v 중앙 알파 255, 첫·마지막 픽셀 알파 2. 위/아래 전용은 반대쪽 끝 알파 255 | 임의 CSS blur와 다른 알파 마스킹. 스크롤 상태에 따른 선택 로직은 실행 코드와 함께 검증 필요 |
| 소프트 마스크 셰이더 | globalgamemanagers.assets Shader 22: Hidden/UI Default (Soft Masked), 26: ETC1 변형 | 참조와 셰이더 데이터 확인됨 |
| 작은 회전 장식 | no_get_part/.../const_img_right 및 already_get_part/.../const_img_down의 Quaternion z=-1,w=0 | 정확히 180도. 기존 DOM 렌더러는 회전을 처리하지 않음 |
| 미획득 아이콘 | `black_add` 머티리얼, 이미지 알파 약 0.347. 목록의 일부 tint RGB 약 0.337255 | 현재 grayscale/opacity 0.3은 원본 재현이 아님. 머티리얼의 최종 셰이더 해석은 별도 필요 |
| 9분할 테두리 | Sprite m_Border 및 Image m_Type, m_PixelsPerUnitMultiplier에 정의 | 이미지 확대 방식까지 맞춰야 함. 도형을 새 SVG로 대체할 이유 없음 |
| 단색 도형 | Sprite가 null인 Image도 존재하며 m_Color로 단색 면을 그림 | 현재 appendImage는 file이 없으면 건너뛰므로 일부 단색 면이 누락될 수 있음. 런타임 아이콘 할당 노드와 구분 필요 |
| 투명도 상속 | CanvasGroup이 별도 컴포넌트. 목록/상단 상태의 저장 초기 알파는 0인 경우가 있음 | 선택 상태에서 실행 코드가 바꿈. 저장값 0을 그대로 적용하면 화면이 사라짐 |
| 부모·겹침 | 원본 hierarchy 순회 순서와 앵커·피벗·배율이 확인됨 | 현재 renderer가 평탄화된 DOM 뒤에 훈장 이미지를 추가하므로 원본 draw order와 완전히 같다고 볼 수 없음 |
| 화면 비율 | CanvasScaler 저장 referenceResolution=1280×720, UICanvasScalerHelper에 safe rect/fit mode 변경 경로 있음 | 현재 1424×800은 제공 캡처에 맞춘 논리 캔버스이며 모든 비율에서 원본 값이라고 단정하면 안 됨 |

## 아직 확정하지 않은 부분

1. 캡처 블러의 최종 셰이더·반경·축소 렌더 타깃·반복 횟수. `_ShotBlurredCamera`가 UIPopupWindow의 `_blurShader`를 다음 렌더 함수로 넘기는 경로까지 확인했다. 이 컴포넌트 인스턴스는 제공된 `.assets`에서 발견되지 않았다.
2. `black_add`가 가리키는 Resources/unity_builtin_extra의 Shader 10770. 해당 파일이 현재 제공되지 않아 이름·최종 연산을 확정하지 않았다. 머티리얼 `_Strength=0.215` 등을 곧바로 blur 반경으로 해석하면 안 된다.
3. 상세창의 일부 Animation 경로는 현재 프리팹 계층과 일치하지 않는다. 일치하는 curve와 실제 영향을 받지 않는 잔여 curve를 나눠야 한다.
4. 핫픽스가 기본 실행 코드를 바꾸는지 여부. 메타데이터에 Hotfix 필드와 기본 코드 분기가 있으나 활성 패치까지 검증하지 않았다.
5. 임의 화면 비율·safe area에 대한 실제 캔버스 계산 및 동적 상세창 기준점. 캡처를 통한 보정값을 원본 값으로 오인하지 않아야 한다.

`medals-native-audit.json` 조사 파일에는 복원한 노드별 설정과 머티리얼, 메타데이터 필드, 상세 확대 곡선을 보존했다. 기존 구현이 원본과 완전히 같다는 판정은 내리지 않았다.
