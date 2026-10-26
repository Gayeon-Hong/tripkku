Tripkku 기능 통합: 친구용 오이타 가이드 + 예약 캡처 AI 분석

이 패치는 Tripkku_Sidebar_Memory_Update 적용본 기준입니다. 기존 기능은 유지합니다.

1. index.html / style.css를 프로젝트 최상위에서 교체합니다.
2. trip-extras.js / trip-bookings.js를 프로젝트 최상위에 추가합니다.
3. Supabase SQL Editor에서 trip_reservations.sql을 검토 후 실행합니다.
4. Supabase Edge Functions에 trip-booking-ocr 이름으로 supabase/functions/trip-booking-ocr/index.ts를 배포합니다.
5. Supabase Secrets의 GEMINI_API_KEY를 재사용합니다. JWT 검증을 유지하세요. ALLOWED_ORIGINS에 배포 사이트 origin 등록 필요.
6. 사이트 로그인 후 여행 선택 → 예약 사진(JPEG/PNG/WebP, 3MB 이하) 선택 → Gemini 분석 → 추출값 검수 → 저장합니다.

주의: 오이타 상세 정보는 샘플 참고 카드입니다. 다른 여행지의 호텔/항공/인스타 자동 큐레이션은 아직 구현되지 않았습니다.
공통 예산은 원래 배포용 페이지에 남아 있습니다. 예약 사진은 서버의 Gemini API로 전송되므로 사전에 개인 식별 정보와 결제 정보를 가리고 업로드하세요. 원본 사진은 DB에 저장하지 않습니다.
예약 정보를 저장해도 plan_items 일정 항목이나 예산 테이블이 자동 수정되는 것은 아닙니다. 이를 위해서는 별도의 사용자 승인 기반 매핑을 추가해야 합니다.
파일 교체 및 DB 수정 전 백업하고 테스트용 여행에서 검증하세요.
