Tripkku 홈/상세 화면 + 릴스·먹거리 체크리스트 패치

[웹 배포]
- GitHub 최상위 경로의 index.html, app.js, style.css, sw.js를 교체합니다.
- 최상위 경로에 새 trip-reels.js를 업로드합니다.
- 기존 ai.js, trip-extras.js, trip-bookings.js 등은 삭제하지 마세요.
- 홈: 샘플/새 여행 만들기 / 사이드바에서 여행 선택
- 상세: 일정·예산·예약·릴스 장소/먹거리 목록 / '홈'으로 이동

[DB 설정]
- Supabase SQL Editor에서 trip_reels.sql을 실행합니다.
- 기존 is_trip_member(trip_id) DB 함수가 필요합니다.
- 해당 함수가 없으면 임의로 보안정책을 해제하지 말고 먼저 함수 정의 확인하세요.

[Gemini AI 분석]
- Supabase Edge Functions에서 trip-reel-analyze 이름으로 index.ts 내용을 배포합니다.
- GEMINI_API_KEY Secret은 기존 것 사용. JWT verification을 켜세요.
- 릴스 URL만으로 인스타그램 본문이나 실제 썸네일을 자동 조회할 수 있는 것은 아닙니다.
- 영상 설명/캡션을 붙여넣고 'AI 추출'하면 음식/장소 제안이 나옵니다.
- 직접 확인하고 저장하면 여행별 DB 목록에 표시됩니다.
- 장소명 입력 시 Google Maps 검색/길찾기 링크가 자동 생성됩니다.
- '꼭 먹을 것' 체크박스는 Supabase에 저장됩니다.
- 이미지 URL은 직접 넣었을 때만 썸네일로 표시되며 없는 경우 이모지 카드로 표시됩니다.

[확인]
- index.html, app.js, style.css, sw.js, trip-reels.js 업로드 후 배포 완료 대기.
- Ctrl+Shift+R 새로고침, 오래된 Service Worker 캐시 제거.
- 테스트 여행에서 릴스 등록, 지도 열기, 먹거리 체크, 삭제, 홈 화면 전환 확인.
- 코드 구문 검사만 수행했으며 실제 DB/AI 배포 후 실행 검증은 하지 않았습니다.
