# 영광의 길 블러 원본 추적 결과

확인일: 2026-10-29. 업로드된 Windows 클라이언트 정적 파일 기준이다. 사이트 수정·배포 또는 실행 중 핫픽스 적용 여부 확인은 이번 조사에 포함하지 않았다.

## 확인된 호출 경로

`MedalDetailMiddleHolderSingleton.OnOpenDetail` → `UIPopupWindow.ShotBlurredImage` → `UIPopupWindow._ShotBlurredCamera` → `Torappu.GraphicUtil.ShotBlurredCamera` → `Torappu.GraphicUtil.Blur`.

- 중앙 상세창은 `_blurImage`를 전달하여 배경을 캡처한다. 목록 행 상세창 전체에 같은 효과를 일괄 적용한다는 의미가 아니다.
- `level1`~`level5`의 `UIPopupWindow._blurShader`는 모두 외부 참조 fileID=1, pathID=21이다. 해당 외부 파일은 `globalgamemanagers.assets`이다.
- `globalgamemanagers.assets`, pathID=21은 **`Hidden/Torappu/PostEffect/MobileBlur`** 셰이더이다. 이전 단계의 미확정 참조가 이번에 해결됐다.

## 확정된 기본 코드 값

`GraphicUtil.ShotBlurredCamera`의 블러 호출 인수:

| 인수 | 값 |
|---|---|
| source | 카메라 합성용 원본 크기 RenderTexture |
| destination | 가로·세로 절반 크기 RenderTexture |
| downsample | 1 |
| blurSize | 아래 해상도 계산식 |
| blurIterations | 3 |
| blurMaterial | 전달된 MobileBlur 셰이더로 만든 머티리얼 |

실제 캡처 크기를 W,H라 할 때, 기본 강도 계산은 다음과 같다.

`blurSize = max(1, RoundToInt(4 * min(max(W,H)/1920, min(W,H)/1080)))`

따라서 1920×1080에서는 blurSize=4이다. Unity의 반올림은 정확히 절반인 경우 짝수 쪽으로 반올림하는 동작이다. 화면을 보고 정한 CSS 픽셀 반경이 아니다.

`GraphicUtil.Blur`는 source의 각 차원을 `>> downsample`한 임시 텍스처를 사용한다. 이 경로에서는 원본의 절반 크기이며, 절반을 또 절반으로 줄인 1/4 크기가 아니다.

처리 순서:

1. `_Parameter=(blurSize/2, -blurSize/2, 0, 0)`을 설정하고 셰이더 pass 0으로 축소한다.
2. i=0,1,2에서 `_Parameter=(blurSize/2+i, -blurSize/2-i, 0, 0)`을 설정한다.
3. 각 i마다 pass 1(세로)과 pass 2(가로)를 수행한다.
4. 마지막 임시 텍스처를 목적지로 복사한다.

1920×1080에서는 각 반복의 저해상도 텍셀 간격이 2,3,4이다. 이 수치를 CSS `blur(4px)`와 동일하다고 취급하면 안 된다.

## 셰이더 바이트코드 확인

원본 Shader의 LZ4 블록을 해제하여 DXBC 프로그램을 확인했다.

- 셰이더는 5개 pass를 가진다.
- 이 호출 경로에서 사용하는 pass는 0,1,2이다.
- pass 0은 4개 샘플을 평균낸다(각 0.25).
- pass 1과 pass 2는 같은 프래그먼트 프로그램(blob 6)을 공유한다.
- pass 1과 pass 2의 버텍스 프로그램(blob 4,7)은 방향을 세로·가로로 바꾼다.
- 프래그먼트 프로그램은 7번 샘플링한다. 가중치는 다음과 같다.

`[0.0205, 0.0855, 0.232, 0.324, 0.232, 0.0855, 0.0205]`

가중치 합은 1이다. 상수 버퍼 원본 값은 float32이므로 소수점 아래 작은 표현 오차가 있다.

## 재현 근거 위치

아래 주소는 이 GameAssembly.dll의 정적 가상 주소이며 다른 버전에는 그대로 적용할 수 없다.

| 함수/구간 | 주소 |
|---|---|
| 중앙 상세창 OnOpenDetail | 0x181920E00 |
| ShotBlurredImage 호출 | 0x181920F88 |
| UIPopupWindow.ShotBlurredImage | 0x1811FFE00 |
| UIPopupWindow._ShotBlurredCamera | 0x181202160 |
| GraphicUtil.ShotBlurredCamera | 0x185A7A650 |
| 해상도 기반 강도 계산 | 0x185A7AC79~0x185A7ACEE |
| downsample=1, iterations=3 전달 | 0x185A7AD1D~0x185A7AD33 |
| GraphicUtil.Blur | 0x185A773C0 |
| 반복별 Parameter 갱신 | 0x185A775D0~0x185A7760C |
| 세로 pass 1 호출 | 0x185A77661~0x185A77679 |
| 가로 pass 2 호출 | 0x185A776C7~0x185A776DF |

메타데이터는 버전 29, 클라이언트 Unity 버전은 2021.3.39f1이다. 메서드 토큰을 각 어셈블리의 CodeGenModule 메서드 포인터에 연결하여 함수 이름과 주소를 대조했다. `GraphicUtil`은 Assembly-CSharp가 아니라 Torappu.Common.dll에 속한다.

## 구분해야 할 남은 검증

- 위 결과는 파일의 기본 네이티브 실행 경로이다. 관련 함수에 `__Hotfix` 분기가 있으므로 실행 중 교체 코드가 활성화됐는지는 별도 검증 대상이다.
- 활성 핫픽스가 없다는 사실을 확인한 것은 아니다. 다만 기본 경로의 블러 강도를 더 이상 미상으로 둘 필요는 없다.
- 실제 웹 화면에 적용하고 원본 스크린샷과 비교한 작업은 이번에 수행하지 않았다.
- 계정 데이터, 서버 동작, 게임 파일을 수정하지 않았다.

## 입력 파일 SHA-256

| 파일 | SHA-256 |
|---|---|
| globalgamemanagers.assets | 87c0f2e309bcb83384b016f2d39a0d334e292853320935166575c677d87667d7 |
| sharedassets1.assets | 269f6299ea46690f94ac0e765cf46b814b64c605718e200de29172d3fac0c048 |
| GameAssembly.dll | d706712dc4bc1de23cab958a0080a4242c4b5dead5353d6544a1ff6a444594fa |
| global-metadata.dat | d89ef2176c704483bd0124ee9e43a12adfa0ba8ca5a7eb4b3e080bea73755bbf |

## 웹 적용 (2026-10-29)

관리자 미리보기의 중앙 상세창에서 현재 native canvas를 자급식 SVG 스냅샷으로 캡처한다. 이미지·마스크·9분할 테두리·게임 글꼴을 포함하고 스크롤 위치를 보존한다. 캡처의 실제 표시 픽셀 크기(devicePixelRatio 포함)를 기준으로 위 강도를 계산한다. 별도 Worker에서 pass 0과 pass 1/2를 실행하므로 기본 화면의 조작을 막지 않는다. 매 패스는 8비트 출력으로 저장하고 7탭의 알파 채널은 원본처럼 중앙 샘플을 유지한다.

목록 행에서 확대되는 상세창에는 블러를 적용하지 않는다. 중앙 상세창을 닫거나 다시 열면 이전 작업을 취소하며, 창 크기가 바뀌면 새 해상도로 재계산한다. 임의의 CSS blur 반경을 추가하지 않는다. 원본 GPU와 브라우저의 색 관리·반올림 차이까지 픽셀 단위로 동일하다고 검증한 것은 아니다.

검증: 관리자 Node 검사 87개 통과, Wrangler 배포 dry-run 통과. Chromium에서 행 상세창의 블러 미적용, 중앙 상세창의 실제 캡처·Worker 출력, 크기 변경, 닫기 직후 다시 열기를 검사했으며 브라우저 실행 오류가 없었다. 브라우저 검사에는 합성 계정 상태와 대체 훈장 아이콘을 사용했다. 개인 계정 데이터는 사용하지 않았다.
