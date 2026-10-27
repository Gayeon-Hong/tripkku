Tripkku AI 여행 스튜디오 적용 (2026-10-27)
기준: Tripkku_Dynamic_Travel_Recommendations 패치. 다른 버전과 부분 혼합 시 기능 누락 가능.
1. GitHub 최상위에 index.html,app.js,style.css,sw.js,trip-recommend.js 교체, trip-studio.js 새로 추가. trip-reels.js도 패키지 기준 버전 유지.
2. Supabase에 trip_ai_guides.sql 이미 실행했다면 재실행 불필요.
3. Edge Functions trip-guide-ai 의 index.ts를 패키지 supabase/functions/trip-guide-ai/index.ts 코드로 교체하고 재배포. 기존 GEMINI_API_KEY 사용; ALLOWED_ORIGINS 실제 사이트 도메인 확인.
4. 여행 로그인 후 홈에서 국가·도시·날짜·인원·예산 입력 → 여행 만들고 Gemini 초안 생성. 실패 시 Edge Functions Logs 확인. AI 가이드는 생성 시 DB에 저장, 일정(plan_items) 반영은 상세화면에서 이용자가 승인 버튼 클릭.
5. 여행 상세에서 날짜·지구 표정·테마를 수정할 수 있습니다. 사용자 사진·커버는 로컬 미리보기이며 서버에 보관하거나 AI 캐릭터로 생성하지 않습니다. AI 캐릭터 생성은 별도의 이미지 생성 API 및 이용자 동의·비용·저장정책 설계가 필요합니다.
주의: 서버 배포와 Supabase DB 실사용 테스트는 이 환경에서 할 수 없었습니다. AI 생성 장소·예산·경로는 최신 지도/실시간 항공편 검색 결과가 아닌 초안입니다.
