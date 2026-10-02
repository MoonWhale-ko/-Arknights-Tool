# 한국 서버 계정 가져오기 연결

GitHub Pages 화면 + Cloudflare Workers 계정 조회 API + 브라우저 localStorage 구성입니다.
Workers 코드/프런트엔드/모의 응답 테스트는 준비되어 있습니다. 실제 요스타 계정 로그인은
Cloudflare 배포 후 사용자가 자신의 브라우저에서 검증해야 합니다. 아직 실계정 동작을 보장하지 않습니다.

## Cloudflare에서 처음 한 번 설정

1. Cloudflare에 로그인합니다. Workers & Pages에서 **Worker**를 생성하고 GitHub 저장소를 연결합니다.
   Pages 프로젝트로 만들지 마세요. 저장소 권한은 `MoonWhale-ko/-Arknights-Tool`만 선택합니다.
2. 배포 설정을 다음처럼 지정합니다. 화면 문구는 계정 UI에 따라 다를 수 있습니다.

| 항목 | 값 |
| --- | --- |
| 프로젝트/Worker 이름 | `arknights-account-import` |
| 저장소 | `MoonWhale-ko/-Arknights-Tool` |
| 프로덕션 브랜치 | `main` |
| 루트 디렉터리 | `workers/account` |
| 빌드 명령 | `npm test` |
| 배포 명령 | `npm run deploy` |

npm 의존성은 package-lock.json으로 설치됩니다. 설정 파일은 `workers/account/wrangler.jsonc`입니다.
Workers Builds가 제공하는 배포 인증을 사용하므로 Cloudflare API 토큰을 채팅이나 사이트에 넣지 않습니다.
별도 데이터베이스, KV, 도메인 구매는 필요하지 않습니다. Rate Limiting 바인딩은 설정 파일에 포함되어 있습니다.
`1001`~`1003` namespace_id는 이 Cloudflare 계정의 다른 용도와 겹치면 다른 양의 정수 문자열로 바꿉니다.

3. 배포 완료 후 표시되는 HTTPS `workers.dev` 주소를 복사합니다.
4. 그 주소를 `assets/js/account-config.js`의 빈 문자열에 넣습니다.
   예: `window.ARKNIGHTS_ACCOUNT_API = 'https://arknights-account-import.<내 하위 도메인>.workers.dev';`
   이것은 공개 API 주소이며 비밀키가 아닙니다. 주소를 알려주면 저장소 설정에 반영할 수 있습니다.
5. GitHub Pages 배포 완료 후 오퍼레이터 관리의 **게임 계정 가져오기**를 엽니다.
   한국 서버 요스타 연동 이메일 → 인증번호 받기 → 6자리 인증번호 → 현재 상태 조회 → 조회 결과 적용.
   이 과정은 기존 게임 접속을 종료할 수 있습니다. 게임을 종료하고 테스트하세요.

`/health`는 브라우저에서 올바른 Origin으로 호출해야 합니다. 주소창에서 직접 열면 Origin이 없어 403이 정상입니다.
프런트엔드는 health에서 서비스 이름/한국 서버 지원을 확인한 뒤 인증 버튼을 활성화합니다.
Workers URL이 비어 있으면 버튼은 연결 준비 안내만 표시하고 인증정보를 전송하지 않습니다.

## 저장과 적용 범위

- 현재 상태: 보유, 정예화, 레벨, 잠재, 신뢰도, 스킬 레벨, 스킬 ID별 마스터리, 모듈 ID별 단계.
- 직군 전환 오퍼레이터: `tmpl`의 각 실제 ID를 별도로 매핑합니다.
- 성공한 전체 목록을 적용하면 목록에 없는 기존 오퍼는 미보유가 됩니다. 육성 수치와 사용자 추가 필드는 유지합니다.
- 진행 중인 훈련을 완료 상태로 미리 올리거나, 보유 증표를 잠재로 미리 적용하지 않습니다.
- 재료: 실제 보유 수량을 `arknightsInventoryV1`에 저장합니다. 재료 페이지에서는 자체 items.json에 있는 육성 재료만 표시합니다.
- 기존 진행 저장 키 `arknightsOperatorProgressV1`을 유지합니다. 목표/사용자 추가 필드는 보존합니다.
- 적용 전 두 저장소를 `arknightsAccountImportBackupV1`에 백업합니다. **가져오기 전으로 복원**으로 되돌립니다.
  최신 적용 직전 백업 한 개만 유지합니다. 일반 백업 버튼은 기존처럼 오퍼 진행만 내보냅니다.
- 현재 → 목표 필요 재료 합산은 후속 기능입니다. 이번에는 계정 조회와 현재 상태·재료 저장/표시를 연결합니다.

이메일/인증번호/토큰/전체 게임 응답은 데이터베이스에 저장하거나 console에 기록하지 않습니다.
서버 응답에는 필요한 육성·재료 정보만 포함하고 토큰·UID·프로필은 제외합니다.
요청은 POST body로 보내고 응답 캐시를 금지합니다. 입력 크기 제한과 IP/이메일 해시별 요청 제한을 적용합니다.
Cloudflare 자체 접속 로그 정책과 요스타 서버의 기록은 이 코드로 통제하지 않습니다.
CORS는 허용 Origin을 제한하는 브라우저 규칙이지, 외부 요청에 대한 인증 수단은 아닙니다.
Rate Limiting은 Cloudflare 지역 단위의 완화 제한이며 완전한 남용 방지를 보장하지 않습니다.

## 검증

```sh
node --test tests/test_account_import.mjs workers/account/test/*.test.mjs
node tests/test_operators.cjs
node tests/test_recruitment.cjs
python3 -m unittest discover -s tests -v
cd workers/account
npm ci
npx wrangler deploy --dry-run
```

실계정으로 레벨/정예화/잠재/신뢰도/스킬/모듈 한 명 이상과 용문폐·재료 수량을 게임과 대조합니다.
그 뒤 적용 전 복원이 정상인지 확인합니다. 실패나 불완전한 응답은 기존 저장을 변경하지 않습니다.
요스타 또는 게임 API 변경 시 `workers/account/src/game.mjs`를 갱신해야 합니다.
코드 참고: [ArkPRTS](https://github.com/ashleney/ArkPRTS), [Krooster](https://github.com/neeia/ak-roster).
Terra Archive의 비공개 중계 서버를 사용하지 않습니다.
신뢰도 변환표는 자체 JSON입니다. 게임 데이터를 갱신한 뒤 `python scripts/update_account_favor.py`로
operators.json과 같은 한국 서버 원본 커밋의 변환표를 갱신합니다.

Cloudflare 공식 문서:
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
