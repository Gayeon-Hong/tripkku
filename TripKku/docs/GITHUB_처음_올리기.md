# 처음 하는 GitHub 업로드 — 트립꾸 2번부터 따라하기

> 준비: GitHub 로그인(`Gayeon-Hong`), 이 ZIP을 다운로드한 PC, Chrome/Edge.
> 이 방법은 **프로그램 설치, 명령어, Git 지식 없이** GitHub 웹화면만 사용합니다.

## 2번. ZIP 풀기

1. 이 문서가 포함된 `TripKku_GitHub_출시준비_소스.zip` 파일을 다운로드합니다.
2. 윈도우 파일 탐색기에서 ZIP **마우스 오른쪽 → 압축 풀기 / 모두 압축 풀기**.
3. 압축이 풀린 폴더로 들어갑니다. 이 ZIP은 **프로젝트 파일이 최상위에 바로 들어 있습니다.**
4. 폴더에 `index.html`, `app.js`, `style.css`, `config.js`, `README.md`, `assets`, `docs`, `sql`, `supabase`, `toss`가 보여야 합니다.
5. **ZIP 파일 자체를 GitHub에 올리면 안 됩니다.** 꼭 *압축을 푼 파일과 폴더*를 올리세요.

## 3번. 내 저장소 열기

1. [GitHub 로그인](https://github.com/login) 후 오른쪽 위 프로필을 클릭합니다.
2. `Your repositories` → `tripkku` 저장소를 클릭합니다. 아직 없다면 [New repository](https://github.com/new)에서 이름 `tripkku`로 만드세요.
3. 지금 파일 업로드는 Private/Public 어느 쪽에서도 가능합니다. **무료 GitHub Pages 게시 전에는 Public이 필요합니다.**

## 4번. 파일 업로드

1. GitHub 저장소 `Code` 화면을 엽니다.
2. `Add file` → `Upload files`를 클릭합니다. (빈 저장소라면 `uploading an existing file` 링크가 보일 수 있습니다.)
3. **2번에서 압축을 푼 폴더 안쪽 파일과 폴더를 전부 선택한 뒤** GitHub 업로드 영역에 끌어다 놓습니다. `index.html`이 저장소 최상위에 있어야 합니다.
4. 업로드 목록에 `assets/`, `docs/`, `sql/`, `supabase/` 등 하위 폴더 경로가 보이는지 확인합니다.
5. 아래 **Commit changes** 영역에 `첫 트립꾸 앱 업로드`라고 적습니다.
6. `Commit changes`를 누르면 업로드가 완료됩니다.
7. GitHub에서 `index.html`이 목록 맨 위 깊이(최상위)에 보이는지 확인합니다. `TripKku_GitHub_배포용/index.html`이라는 중간 폴더가 보이면 배치가 잘못된 겁니다.

## 5번. 무료 웹주소 생성

1. `tripkku` 저장소의 `Settings` 탭 → 왼쪽 메뉴 `Pages`.
2. 무료 계정에서 저장소가 `Private`이면 먼저 `Settings → General → Danger Zone → Change repository visibility → Public`로 변경해야 Pages를 이용할 수 있습니다. **공개하면 누구나 소스코드를 볼 수 있습니다.** 개인정보나 API 비밀키가 없어야 합니다.
3. `Build and deployment`의 `Source`에서 `Deploy from a branch` 선택.
4. `Branch` → `main`, 폴더 → `/(root)`, `Save` 클릭.
5. 배포가 완료되면 Pages 화면에 사이트 주소가 표시됩니다. 기본 예상 주소는 `https://gayeon-hong.github.io/tripkku/`입니다.
6. 휴대전화에서 이 주소를 열면 앱 화면을 볼 수 있습니다. **아직 로그인·실시간 편집·Gemini AI는 설정 전이므로 데모 모드만 작동합니다.**

## 6번. 올린 뒤 파일 업데이트

1. 저장소 `Code` → 수정할 파일 (`config.js` 등)을 클릭.
2. 오른쪽 위 **연필(Edit this file)**을 클릭.
3. 수정 후 오른쪽 위 `Commit changes...` → 메시지 입력 → `Commit changes`.
4. 파일 여러 개를 바꿀 때는 위 4번 `Add file → Upload files`로 업데이트한 파일을 다시 올릴 수 있습니다. 같은 경로로 올라가게 확인하세요.
5. `새로 고침`이나 스마트폰 브라우저 재시작 후 최신 버전을 확인합니다. 캐시가 남으면 강력 새로고침하세요.

## 자주 하는 실수

- GitHub 프로필 `https://github.com/Gayeon-Hong`는 **저장소 주소가 아닙니다**. 저장소는 `/tripkku`까지 붙어야 합니다.
- ZIP 파일만 올리거나 `TripKku_GitHub_배포용` 폴더를 그대로 상위에 넣으면 Pages에서 `index.html`을 찾지 못합니다.
- **API 키(GEMINI_API_KEY), 서비스 비밀키, OAuth Client Secret**은 절대 GitHub `config.js`에 넣지 않습니다.
- 최초 배포 사이트는 로그인 기능이 없는 것이 정상이므로, 별도 문서 [`AI_로그인_연결.md`](./AI_로그인_연결.md)를 확인하세요.

공식 참고: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
