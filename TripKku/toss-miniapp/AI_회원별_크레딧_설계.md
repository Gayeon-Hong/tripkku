# Gemini AI 회원별 사용량 정책 제안

Google 로그인은 인증이고 Gemini API의 프로젝트별 요금 결제는 별개입니다.

- 웹: Supabase Google/Kakao로 로그인 -> 사용자 UID를 통한 크레딧 장부.
- Toss: Toss 로그인 -> 서버에서 검증하고 내부 UID와 연결 -> 같은 사용량 DB에 장부 기록.
- Edge Function이 서버 측 `GEMINI_API_KEY`(비밀값)를 사용하며 클라이언트에는 비노출.
- 무료 월 이용량(예: 20회)은 실제 비용을 고려하여 운영자가 설정. 분당 제한·중복 요청 방지·DB 트랜잭션 체크.
- 플랜별 최대 모델/입출력 토큰 제한, 서버측 Gemini usage metadata로 실제 과금용 토큰 기록.
- 유료 크레딧은 결제 전 잔액 확인 및 환불 정책 준비. 토스 미니앱의 디지털 상품 결제는 토스 인앱 결제 정책 준수.
- 다른 사람의 Google AI Studio 프로젝트 사용량을 자동으로 가져오는 기능은 일반 Google SNS 로그인만으로는 지원되지 않습니다.
- Bring Your Own Key는 추후 **웹 전용 선택 기능**으로 엄격한 서버 암호화/회수/검증을 설계할 때만 검토하고, 앱인토스에는 적용하지 않는 편을 권장.

실제 구현 전 참고: https://ai.google.dev/gemini-api/docs/billing
