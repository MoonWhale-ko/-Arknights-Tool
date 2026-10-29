# 훈장 화면 원본 렌더링 수정

2026-10-29. 제공된 다섯 화면을 기존 게임 파일과 대조했다.

## 원인과 사용 데이터

- 로도스 장식: DynamicSpriteLoader와 같은 노드의 Image.m_Color.a=0.06이 무시되고 있었다. native-scene 노드 3174·2162·3038의 원본 투명도를 사용한다.
- 검게 보이던 면: white_img(Sprite 892, Texture 414) 등은 TextureFormat.Alpha8이다. 추출 PNG의 RGB=0을 그대로 표시하지 않고 UI/Default의 _TextureSampleAdd에 맞춰 RGB를 흰색으로 복원했다. 원본 알파는 보존한다. 642·796·892 세 이미지의 연결은 native-alpha8.json에 기록했다. 셰이더는 unity_builtin_extra의 Shader 10770이다.
- 글자 잘림: m_BestFit, m_MinSize, m_MaxSize, m_HorizontalOverflow, m_VerticalOverflow와 MultilineBestFit을 해석한다. 문자열을 줄이거나 임의 좌표 이동으로 보정하지 않는다. 웹 글꼴 측정과 Unity TextGenerator의 세부 메트릭이 완전히 동일하다고 검증하지는 않았다.
- 수집 현황 겹침: medal_progress_switch를 medal_list_state 범위에만 적용한다. 초기에는 0초 상태를 유지하며 명시적 재생 요청 없이 끝 상태로 이동하지 않는다. 같은 이름의 다른 상태 노드에 곡선이 잘못 적용되지 않게 한다.
- 미리보기 겹침: 런타임 훈장/배경은 원본 group_container(2221), display_diy(3500), temp_container(2283)의 그리기 순서에 삽입한다. 저장된 배율과 기준점을 사용하며 임의 mesh 오버레이는 제거했다. 홈 컬렉션 영역을 클릭하면 MedalEntryState.OnClickGroup에 대응하여 컬렉션으로 이동한다.
- 체크 모양: medal_hide_expire_switch(root 3003) 프리팹을 추출했다. 선택/해제 Sprite 880·810, 크기 30×30, 원본 글꼴·앵커·클릭 영역을 사용한다. 글자 체크와 CSS 색상 사각형을 제거했다. native-controls.json에 원본 파일 SHA-256과 노드를 보존했다.
- 아이콘 카드: 흰 카드와 회색 필터를 제거하고 medal_obj-3330의 획득/미획득 프리팹, 단색 면, 아이콘 크기, 이름 면을 사용한다. black_add(Material 5)의 UI/Default 색을 런타임 아이콘에도 연결한다. 참조는 native-materials.json에 기록했다.
- 미획득 세트: MedalGroupListItem.Render(0x181923CF0), MedalGroupViewModel.GetLastGetTime(0x181942180)을 추적했다. 구성 훈장을 하나도 보유하지 않으면 temp_container를 숨기고 원본 NO INFO 바탕을 유지한다. 가공 훈장만 획득한 경우에도 획득으로 처리한다.
- 세트 글자 색: Render가 설정하는 원본 색을 반영했다. 보유 이름은 ColorRes.COMMON_BLACK(31/255), 설명은 ColorRes.GRAY(137/255), 미보유 이름은 흰색이다. 미보유 바탕은 BACK_COLOR=0.335이다.
- 부분 로딩: 페이지와 전체 콘텐츠 높이는 유지하고 주변 행만 추가/회수한다. 브라우저 기본 스크롤바와 기존의 고정된 스크롤 핸들을 제거했다. 휠과 터치는 유지한다. 원본의 스크롤 핸들 계산 전체를 이식한 것은 아니다.

## 검증과 한계

실제 배포용 CSP를 적용한 Chromium에서 홈/목록/아이콘/컬렉션/중앙 상세창을 확인했다. 합성 계정 기록과 대체 훈장 아이콘을 사용했으며 개인 계정 데이터는 사용하지 않았다. 대체 아이콘은 배포하지 않는다.

홈 컬렉션 클릭 시 상세창 0개와 컬렉션 화면 1개, 미보유 배경 0개, 전체 목록 높이 보존, 기본 스크롤바 숨김, 중앙 상세창 블러 완료와 브라우저 실행 오류 0개를 확인했다. 게임과의 전체 화면 픽셀 일치와 활성 핫픽스는 아직 검증하지 않았다.
