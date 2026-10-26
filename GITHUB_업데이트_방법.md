# 최신 지도·날씨 버전 GitHub 업로드 (GitHub Desktop)

저장소: https://github.com/Gayeon-Hong/tripkku
웹주소: https://gayeon-hong.github.io/tripkku/

1. 다운로드한 `Tripkku_지도날씨_업데이트.zip` 파일을 **압축 해제**합니다.
2. GitHub Desktop에서 `tripkku` 저장소 선택 → **Repository → Show in Explorer**로 실제 클론 폴더를 엽니다.
3. ZIP **안의 파일·폴더**(예: `index.html`, `app.js`, `destination-map.js`, `world-coasts.js`, `assets`)를 클론 폴더 최상위에 복사합니다. 같은 이름은 덮어쓰기, 새 이름은 추가합니다. `.git` 폴더는 건드리지 마세요.
4. `config.js`는 ZIP에 없습니다. 기존 Supabase 설정을 지우지 않고 유지합니다.
5. GitHub Desktop의 **Changes**가 0이 아닌지 확인한 뒤 변경 파일을 살펴보세요. 개인 데이터·비밀번호·관리자 키가 보이면 업로드를 중단합니다.
6. Summary에 `Add destination globe and weather` 입력 → **Commit to main** → **Push origin**.
7. GitHub에서 `Settings → Pages`에 `Deploy from a branch / main / (root)`가 설정되어 있는지 확인합니다. 이미 사이트가 열린다면 다시 설정할 필요 없습니다.
8. 최신 웹사이트를 엽니다. 이전 화면이 계속 보이면 `Ctrl + Shift + R`을 누르고, 홈 화면 앱에서는 완전히 종료 후 재실행해 보세요.

메뉴가 `None`으로 표시되고 `main`이 선택되지 않을 경우: 저장소 `Code` 탭에 **브랜치 `main`과 루트의 `index.html`**이 있는지 확인하세요. GitHub Desktop에서 Push하지 않은 변경은 Pages에 나타나지 않습니다.

**이 ZIP은 웹/PWA 변경 파일만 포함합니다.** 앱인토스 `.ait`, Android `.aab`, iOS 빌드는 새 소스로 따로 다시 빌드해야 합니다.
