# 오이타 친구 여행 · v18 배포 및 연결 (간단판)

## 가장 쉬운 방법 — GitHub에 `index.html` 한 파일만 바꾸기

1. https://github.com/gayeon-hong/tripkku 열기 → **Code** 탭.
2. 최상단 파일 목록의 `index.html` 위치 확인. 그 파일을 **이번 압축의 `index.html`로 교체**하고 Commit changes. **`website` 폴더 안에 올리는 것이 아닙니다.**
3. **Settings → Pages**에서 Source=Deploy from a branch이고 Branch=`main`, Folder=`/(root)`가 맞는지 확인. 배포가 GitHub Actions 기반이라면 해당 워크플로를 확인.
4. Actions에서 Pages 배포 성공을 확인. 처음엔 https://gayeon-hong.github.io/tripkku/index.html?v=18 에서 새 화면인지 테스트. 이후 일반 주소로 접속.
5. 여전히 예전 사이트면 크롬 시크릿 창에서 위 URL을 열어 보기. 시크릿에서는 새 화면인데 일반 창만 예전이면 기존 Tripkku의 서비스워커/캐시 문제. `설정 → 개인정보 보호 및 보안 → 사이트 설정 → 모든 사이트 데이터 → gayeon-hong.github.io`의 데이터 삭제(로그인 정보도 초기화됨) 또는 Chrome 개발자 도구 Application → Service Workers → Unregister 후 강력 새로고침.

**새 파일을 ZIP 그대로 GitHub에 올리는 것이 아니라 `index.html` 파일을 올려야 합니다.**

## Supabase · 친구 동기화 연결 (처음 한 번만)

- Supabase URL과 공개 publishable 키가 파일 내에 이미 포함됨. `service_role` 비밀키는 절대 웹에 넣지 마세요.
- 기존 v14/v15/v16에서 SQL을 이미 실행하여 `oita_rooms`, `oita_room_members`, `oita_save_room`이 있으면 다시 실행할 필요 없음. 없다면 `setup/01_SUPABASE_SQL_EDITOR.sql`을 프로젝트의 SQL Editor에서 한 번 실행.
- Supabase Authentication → URL Configuration: Site URL `https://gayeon-hong.github.io/tripkku/` 와 Redirect URLs 등록 여부 확인(이미 등록했다면 그대로).
- Authentication → Providers: Google/카카오에서 사용할 로그인을 켜고 해당 개발자 콘솔 OAuth 설정도 완료해야 함. 단, 어떤 로그인 제공자를 사용할지는 사용자 선택.
- 첫 로그인 후 **우리 여행방 생성하기**, 친구 초대 링크 복사하여 친구가 같은 URL에서 로그인. 두 명만 참여할 수 있도록 SQL에서 제한.
- 인스타 릴스 / 일정 / 정산 등은 Supabase에 저장됨. 유효한 초대코드와 로그인 없이는 여행 내용 조회 불가하도록 RLS를 적용. GitHub Pages URL 자체는 공개 페이지이므로 로그인 화면은 누구나 열 수 있음.
- Gemini 자유 질문 챗봇은 `setup/oita-chat-index.ts`를 Supabase Edge Function `oita-chat`로 배포하고 그 함수 전용 AI 키를 Supabase Secrets에 넣어야 함. 기본 일정/정산 안내는 함수 없이 가능.
- 저장된 예전 Tripkku 릴스가 있다면 `📷 릴스·장소` 탭의 맨 아래 **예전 트립꾸에 저장한 릴스 가져오기 (선택)**을 눌러 복사 가능. 예전 테이블이나 접근 권한이 없으면 자동 가져오기 되지 않음.

## 이 버전이 유지하는 내용

- 일정: 10/31 MYSTAYS 짐 맡기기 → 이치란 → 몽벨 → 이자카야; 11/1 벳푸역 직원 짐보관 → 가마지옥 → 버스 36 → 유후인역 → 모미지 셔틀 약 5분 → 체크인·산책 → 가이세키; 11/2 모미지 조식 → 유후인 공항버스.
- 2일 차는 **기본안/지연·우천 대체안** 딱 2개. 교통정보는 추정치이며 현지 실시간 운행/예약 확인 필수.
- 공용 숙소비: 내가 96,200원, 친구가 517,514원 결제. 1인 306,857원, 현재 내가 친구에게 210,657원 송금.
- 작은 지구 + 낮/밤 버튼 + 4개 표정 버튼. 장식/여행 꾸미기/장소 체크박스 없음. 준비물 체크만 유지.
- 친구가 함께 편집하는 인스타·유튜브·틱톡 릴스 링크·장소·지도, 챗봇, 한국어 교통 예약 링크, 날씨 확인.

## 검수 한계

본 파일은 브라우저에서 정적 화면/모의 공동 데이터로 검사했습니다. GitHub 실제 저장소 및 실제 Supabase 데이터에 직접 접근하여 배포하거나 두 사용자 동시 로그인 검증을 수행하지는 못했습니다. 배포 후 로그인/친구 초대/실시간 저장을 실제로 확인해 주세요.

중요: 이 HTML 파일을 더블클릭하여 file:// 주소에서 열면 Google/카카오 OAuth 로그인이 정상 동작하지 않습니다. 반드시 GitHub Pages의 https:// 주소에서 로그인하세요.
