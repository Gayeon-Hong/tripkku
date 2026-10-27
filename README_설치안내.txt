Tripkku 도시·예산 기반 AI 여행 추천 패치 (2026-10-27)

1) GitHub 저장소 최상위에 index.html, app.js, style.css, sw.js 교체하고 trip-recommend.js 신규 추가.
   기존 trip-reels.js / trip-bookings.js / trip-extras.js / ai.js는 삭제하지 않습니다.
   이 패치는 2026-10-27 Home+Reels 버전을 기준으로 합니다. 이전 패치가 섞인 저장소는 전체 소스 확인 후 병합하세요.
2) Supabase SQL Editor에서 trip_ai_guides.sql 실행 (RLS 유지). public.is_trip_member 함수가 필요합니다.
3) Supabase Edge Functions > trip-guide-ai > Via Editor 에서 supabase/functions/trip-guide-ai/index.ts 배포.
   JWT 검증 ON. Secrets: GEMINI_API_KEY 이미 등록한 값 사용, ALLOWED_ORIGINS=https://실제-사이트-도메인 (예: https://계정.github.io).
4) 로그인 → 여행 선택 → '내 여행 맞춤 추천'에서 도시·총예산·취향 입력 → Gemini 추천 만들기.
   추천 생성은 여행 소유자만 허용하며 여행별 Supabase DB에 저장됩니다.
5) 추천 장소 '지도·길찾기'는 Google Maps 검색 결과로 연결됩니다. '일정에 추가'는 1일 차 PLAN A에 임시시간으로 저장합니다.
   해당 DB의 plan_items RLS INSERT 정책이 이를 허용해야 합니다.

중요 사항:
- 친구용 오이타의 고정 콘텐츠를 별도 추천 영역에서 제거했지만, 오이타/런던 등 기존 샘플 PRESETS 자체는 유지합니다.
- Gemini 추천은 실시간 검색 API가 아닙니다. 장소·가격·영업시간의 최신성은 직접 확인해야 합니다.
- 항공권·숙소 캡처 분석 기능은 기존 trip-bookings.js 및 trip-booking-ocr에 의존합니다.
- 릴스는 여행 상세 화면에서만 표시됩니다.
- 추천 결과는 DB 저장되지만 실제 운영 DB/배포 환경에서 테스트하지 않았습니다.
- 새로운 코드를 적용해도 기존 여행 데이터가 삭제되지 않습니다.
