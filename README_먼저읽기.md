# 오이타 친구용 공유 여행 플래너 · 배포 순서

## 먼저 알아둘 점
- 사용 주소: https://gayeon-hong.github.io/tripkku/
- 이 파일은 **기존 GitHub Pages의 Tripkku 첫 화면을 교체**합니다. 기존 파일을 먼저 GitHub에서 백업하세요.
- 기존 Supabase `trips`, `plan_items`, `trip_members` 등은 수정하거나 삭제하지 않습니다. 오이타 전용 테이블 `oita_rooms`, `oita_room_members`만 새로 만듭니다.
- 공개 GitHub 저장소에 올라간 코드는 누구나 읽을 수 있습니다. `config.js`에는 기존의 공개 가능한 **publishable key**만 들어 있습니다. 서비스 역할 키(service_role)·이메일 비밀번호 등은 절대 넣지 마세요.
- 여행 내용의 실제 수정본은 Supabase RLS로 **방 멤버 2명만 읽고 수정**하도록 제한됩니다. 다만 공개 웹코드의 최초 시작 예시 데이터(숙소명, 기본 금액)는 외부에서 볼 수 있습니다.

## 1. Supabase 설정 (한 번만)
1. https://supabase.com/dashboard/project/aachvbbblwycutggzdpp/sql/new 열기
2. `setup/01_SUPABASE_SQL_EDITOR.sql` 내용 전체 붙여넣기 → Run
3. Supabase → Authentication → URL Configuration으로 이동
4. Redirect URLs에 `https://gayeon-hong.github.io/tripkku/**` 추가 (기존 다른 주소는 유지)
5. Google 또는 Kakao OAuth provider가 켜져 있는지 확인

## 2. GitHub Pages 교체
1. GitHub 저장소 `https://github.com/gayeon-hong/tripkku`를 엽니다.
2. 기존 파일을 ZIP 등으로 백업합니다. 교체 시 기존 Tripkku 첫 화면은 사라집니다.
3. 패키지 `website/` 폴더 안의 `index.html`, `app.js`, `style.css`, `config.js`, `sw.js` **5개 파일**을 GitHub 저장소 **최상위(루트)**에 업로드해 기존 파일을 교체합니다.
4. `sw.js`도 함께 교체하세요. 새 HTML은 예전 Tripkku 서비스워커 등록을 자동 해제합니다. 기존 `index.html`은 완전히 교체하세요.
5. Commit changes → GitHub Pages 배포 완료 확인 → 사이트 강력 새로고침 (`Ctrl+Shift+R`).

## 3. 첫 로그인 · 친구 초대
1. https://gayeon-hong.github.io/tripkku/ 접속
2. Google 또는 카카오 로그인 → `우리 여행방 생성하기` 클릭
3. 여행방 안에서 `친구 초대 링크` 클릭 → 카카오톡으로 친구에게 보내기
4. 친구가 받은 링크로 로그인하면 같은 여행방이 열립니다. 최대 **2명(나+친구)**만 참여할 수 있습니다.
5. 둘이 각자 일정 수정, 체크리스트, 지출 추가 → 같은 Supabase 데이터에 저장됩니다.

## 4. 자동 저장과 개인정보
- 일정 수정/삭제·정산 추가·체크·메모 저장은 즉시 서버에 저장됩니다.
- 서로 동시에 저장하면 서버 버전 검사 후 다른 사람의 최신 데이터를 불러와 해당 수정만 재적용합니다. 다만 **같은 항목**을 동시에 수정한 경우 나중에 저장한 값이 최종값입니다.
- Supabase Realtime의 Postgres Changes 사용. 네트워크가 불안정할 경우 새로고침으로 최신 내용이 보입니다.
- 기본 숙소비: 내가 96,200원 / 친구가 517,514원 결제, 두 비용 모두 공용 50:50.
- 2일 차 유후인역에서 숙소 셔틀 **약 5분**은 사용자 확인 정보로 반영했습니다. 출발 전 픽업 시각 예약은 별도로 확인하세요.
- 버스 예시 시간과 요금은 실시간 연동이 아니라 계획용입니다.

## 5. 문제가 생긴다면
- `LOGIN_REQUIRED`: 먼저 로그인
- `ROOM_FULL_TWO_PEOPLE`: 이미 두 명이 참여한 방
- `function public.oita_create_room ... not found`: Supabase SQL 실행 확인
- OAuth redirect mismatch: Supabase URL Configuration과 Google/Kakao OAuth 도메인 설정 확인
- 옛 화면: Chrome 개발자도구 → Application → Service Workers → Unregister → 새로고침
- GitHub Pages는 공개 URL입니다. 초대 링크는 비밀번호처럼 보관하고, 타인에게 전달하지 마세요.
