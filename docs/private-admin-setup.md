# 관리자 전용 사이트 연결

일반 사이트는 기존 GitHub Pages를 유지합니다. 관리자 화면과 API는 별도 Worker
`arknights-private-admin`에서 제공합니다. Access 인증을 통과한 **지정 이메일 하나**만
이용할 수 있습니다. Worker는 JWT 서명·발급자·앱 AUD·만료·이메일을 다시 검증합니다.
인증 설정이나 이메일이 비어 있으면 화면 파일을 포함해 전부 503으로 차단합니다.
Pages 배포에는 일반 사이트의 HTML·assets·data·research만 포함하므로 관리자 화면은
GitHub Pages의 하위 경로로 별도 공개되지 않습니다. 저장소 자체가 공개되어 있으므로
소스 코드는 공개되며, 관리자 인증과 비밀값은 Cloudflare 서버에서 처리합니다.

## 1. Worker 생성

Cloudflare Workers & Pages에서 GitHub의 이 저장소를 연결해 Worker를 만듭니다.

| 설정 | 값 |
| --- | --- |
| 이름 | `arknights-private-admin` |
| 브랜치 | `main` |
| 루트 디렉터리 | `workers/admin` |
| 빌드 명령 | `npm test` |
| 배포 명령 | `npm run deploy` |

설정은 `workers/admin/wrangler.jsonc`에 있습니다. 별도 도메인 구매나 데이터베이스는
필요하지 않습니다. `ASSETS.run_worker_first`는 반드시 `true`로 유지합니다.
이는 이미지·JavaScript·HTML 파일이 인증 검사를 우회하지 않도록 합니다.
Worker 버전 미리보기 URL은 비활성화되어 있습니다.

## 2. 본인 이메일만 Access에 허용

1. Cloudflare Zero Trust에서 팀 이름을 설정합니다.
2. 로그인 방법에 **One-time PIN**을 활성화합니다.
3. Access의 Applications에서 관리자 Worker를 보호할 Self-hosted 앱을 추가합니다.
   Worker 이름으로 보호하거나, 배포된 `workers.dev` 호스트 전체를 지정합니다.
   `/api`만 보호하지 말고 **호스트 전체**를 보호합니다.
4. Allow 정책의 Include를 **Emails → 본인 이메일 주소 하나**로 설정합니다.
   `Everyone`, 이메일 도메인 전체, `Bypass` 정책은 추가하지 않습니다.
5. 앱의 Application Audience(AUD) 값을 복사합니다.
6. Worker의 Settings → Variables and Secrets에 다음을 설정합니다.

| 이름 | 종류 | 내용 |
| --- | --- | --- |
| `ACCESS_TEAM_DOMAIN` | 일반 변수 | `https://팀이름.cloudflareaccess.com` |
| `ACCESS_AUD` | 일반 변수 | 위 Access 앱의 AUD |
| `ADMIN_EMAIL` | **Secret** | 정책에 허용한 본인 이메일 |

일반 변수는 연결 뒤 `wrangler.jsonc`의 동일한 항목에도 반영해야 Git 재배포 때
초기 빈 값으로 덮어쓰이지 않습니다. AUD와 팀 주소는 비밀번호가 아닙니다.
본인 이메일과 비밀키는 설정 파일에 작성하거나 공개 저장소에 올리지 않습니다.

## 3. GitHub 저장 권한 연결

GitHub에서 **이 저장소만 선택한** Fine-grained personal access token을 만듭니다.
권한은 Repository permissions의 **Contents: Read and write**, **Actions: Read and write**,
그리고 기본 Metadata: Read입니다. 다른 저장소나 조직 관리 권한은 필요하지 않습니다.
만료일을 지정하고 만료 시 교체합니다.

토큰은 관리자 Worker의 `GITHUB_TOKEN` **Secret**에 입력합니다.
채팅, 사이트 입력란, 브라우저 localStorage, Git 파일에는 넣지 않습니다.
GitHub App의 자동 갱신 설치 토큰은 이 구현에 포함되지 않습니다.

## 4. 사용

- 관리자 주소를 열고 허용한 이메일로 PIN 인증합니다.
- **신규 목록 확인**에서 중국 서버 원본에 있는 추가 후보를 확인합니다.
  신규 후보에 한국어 이름과 미래시 여부를 지정해 저장하면 `future-names.json`에
  등록되고 데이터 갱신 워크플로가 자동으로 실행됩니다.
- **검색 별칭**과 **아이템 이미지**는 변경 미리보기 후 저장하면 사이트 배포로 반영됩니다.
- **최신 데이터 가져오기**는 원본을 특정 커밋으로 고정해 신규 스킬·육성 비용·모듈,
  기본 기반시설 데이터, 계정 가져오기용 캐릭터 목록·신뢰도 표, 추가 후보 목록을 갱신합니다.
  특수 인프라 스킬의 계산 규칙을 자동 작성하는 기능은 아닙니다.
- 목록에 아직 없는 최신 캐릭터는 먼저 데이터를 갱신한 다음 신규 목록을 확인합니다.
- 데이터 검증이 실패하거나 main에 다른 변경이 들어오면 생성 데이터 저장은 실패하며,
  기존 공개 데이터를 덮어쓰지 않습니다. 워크플로의 로그에서 원인을 확인합니다.
- 저장은 여러 파일을 한 Git 커밋으로 처리하며 SHA 충돌 시 전체 저장을 거부합니다.
- 최근 실행은 데이터 갱신과 Pages 배포를 구분해 보여줍니다. 저장 완료가 배포 완료는 아닙니다.

공개 모집 풀 변경, 오퍼레이터 이미지 직접 수정, 공지·가이드 편집, 계정 원본 내보내기는
이번 관리자 화면의 범위에 포함하지 않습니다. 게임 계정 정보는 이 Worker가 조회하거나
저장하지 않습니다.

## 5. 연결 확인

1. 로그아웃/시크릿 창에서 관리자 주소를 열면 Access 로그인 화면이 나와야 합니다.
2. 허용하지 않은 이메일은 로그인할 수 없어야 합니다.
3. 허용 이메일 인증 뒤 관리자 화면과 데이터가 정상 로딩되어야 합니다.
4. 별칭 하나를 저장하고 GitHub 커밋과 Pages 성공을 확인한 뒤 사이트 검색을 확인합니다.
5. 데이터 갱신을 실행하고 검사 성공·새 커밋·Pages 성공을 확인합니다.

모의 JWT와 모의 GitHub로 보안/충돌 동작을 검사하는 명령:

```sh
cd workers/admin
npm ci
npm test
npm run check
```

실제 Cloudflare Access 인증, GitHub 비밀값을 사용한 저장, 실제 배포는 위 연결 이후에
별도로 확인해야 합니다. 로컬 실행에서도 인증을 우회하는 환경변수나 개발용 뒷문은 없습니다.
