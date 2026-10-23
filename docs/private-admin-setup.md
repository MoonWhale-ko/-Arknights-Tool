# 관리자 사이트: GitHub 로그인 연결

Cloudflare Access 대신 GitHub OAuth 로그인을 사용합니다. 기존 Worker 주소를 그대로 씁니다.
별도 Zero Trust 요금제나 도메인 구매는 필요하지 않습니다. Workers의 일반 사용 한도는 별개입니다.

## 1. GitHub OAuth App 등록

GitHub Settings → Developer settings → OAuth Apps → New OAuth App으로 들어갑니다.
직접 주소: https://github.com/settings/applications/new

| 항목 | 입력값 |
| --- | --- |
| Application name | `ZOOT Admin` |
| Homepage URL | `https://arknights-private-admin.jo625540.workers.dev` |
| Application description | 선택 사항. 비워도 됨 |
| Authorization callback URL | `https://arknights-private-admin.jo625540.workers.dev/auth/callback` |
| Enable Device Flow | 체크하지 않음 |

등록한 앱에서 Client ID를 확인하고 Generate a new client secret으로 Secret을 발급합니다.
Client Secret은 채팅이나 GitHub 파일에 보내지 않습니다.

## 2. Worker에 로그인 연결값 저장

Cloudflare Workers & Pages → arknights-private-admin → 설정 → 런타임 변수 및 시크릿에서
아래 두 값을 **Secret** 유형으로 추가하고 적용합니다.

| 이름 | 값 |
| --- | --- |
| `GITHUB_CLIENT_ID` | 위 OAuth App의 Client ID |
| `GITHUB_CLIENT_SECRET` | 위 OAuth App의 Client Secret |

두 값 모두 Secret으로 저장하면 Git 재배포가 덮어쓰지 않습니다. Client ID 자체는 공개값이지만
설정을 한곳에서 관리하기 위해 Secret에 둡니다. 이전 Access 변수는 사용하지 않습니다.
Access를 실제로 활성화했다면 관리자 Worker에 걸린 Access 보호를 해제해야 GitHub 로그인에 도달합니다.

Worker 배포 설정은 그대로 유지합니다.

| 항목 | 값 |
| --- | --- |
| 루트 디렉터리 | `workers/admin` |
| 빌드 명령 | `npm test` |
| 배포 명령 | `npm run deploy` |
| 프로덕션 브랜치 | `main` |

허용 계정은 `MoonWhale-ko`의 GitHub 고유 ID `246121769`로 고정되어 있습니다.
계정 이름을 바꿔도 고유 ID가 같으면 로그인할 수 있습니다. 이메일 주소는 검사하거나 저장하지 않습니다.
`ADMIN_ORIGIN`과 `ADMIN_GITHUB_ID`는 wrangler.jsonc에 있으며 변경할 필요가 없습니다.

## 3. 로그인 확인

관리자 주소의 `/login`으로 들어가 GitHub로 로그인합니다. 첫 로그인에서는 등록한 OAuth App의
인증 요청을 확인합니다. 로그인은 공개 프로필 확인만 요청하며 저장소 쓰기 권한을 요청하지 않습니다.
다른 GitHub 계정으로 인증해도 서버가 거부합니다.

세션은 Secure·HttpOnly·SameSite=Lax 쿠키에 저장하고 4시간 후 만료됩니다.
OAuth state와 PKCE를 확인하며, GitHub 토큰을 브라우저나 저장소에 넣지 않습니다.
로그아웃은 현재 브라우저 쿠키를 지웁니다. 모든 세션을 무효화하려면 Client Secret을 교체합니다.

## 4. 데이터 저장 연결 (로그인과 별도)

로그인한 뒤 GitHub 저장 연결 안내가 나오면 Worker에 `GITHUB_TOKEN` Secret도 설정합니다.
이 값은 로그인용 Client Secret과 다릅니다. 이 저장소만 선택한 Fine-grained personal access token의
Repository permissions에 Contents: Read and write, Actions: Read and write를 지정합니다.
토큰을 사이트 입력란, 채팅, 공개 파일에 넣지 않습니다.

관리 화면에서 신규 목록 확인, 미래시 이름·표시 여부, 별칭, 아이템 이미지 주소를 수정할 수 있습니다.
수정 미리보기 후 여러 파일을 하나의 Git 커밋으로 저장합니다. SHA 충돌 시 전체 저장을 거부합니다.
최신 데이터 가져오기는 한국·중국 서버 원본을 고정한 뒤 검증하고 사이트 배포를 실행합니다.
특수 인프라 스킬의 계산 규칙 자동 작성과 계정 원본 내보내기는 포함하지 않습니다.

## 검증

```sh
cd workers/admin
npm ci
npm test
npm run check
```

모의 OAuth와 GitHub로 소유자 제한, state·PKCE·쿠키, 만료·위조 세션, CSRF·입력 제한,
원자적 저장·충돌을 검사합니다. 실제 OAuth App 설정과 실제 로그인·저장은 연결 이후 확인해야 합니다.
관리자 소스는 공개 GitHub에 있지만, 개인 계정 정보와 인증 비밀값은 포함하지 않습니다.
관리자 HTML은 일반 GitHub Pages 배포 대상에서 제외합니다.
