# Tripkku 설치와 앱스토어 출시

## 지금 바로 휴대폰 홈 화면에 설치(PWA)

웹사이트: https://gayeon-hong.github.io/tripkku/

- **Android Chrome:** 사이트 열기 → 우측 상단 ⋮ 메뉴 → `앱 설치` 또는 `홈 화면에 추가` → 설치.
- **iPhone Safari:** 사이트 열기 → 공유 아이콘 → `홈 화면에 추가` → 추가. Chrome의 iOS 홈 화면 추가 지원은 버전에 따라 다르므로 Safari 권장.
- 홈 화면 아이콘을 눌러 앱처럼 실행합니다. GitHub Pages의 새 버전이 배포되면 웹 콘텐츠도 업데이트됩니다. 네트워크가 필요한 날씨, 지도 지오코딩, SNS 로그인, 친구 초대는 인터넷 연결이 필요합니다.

> 이 방식은 **앱스토어 목록에 공개되는 것이 아닙니다.** 별도 설치 파일이나 스토어 심사 없이 친구와 시험할 때 좋습니다.

## Google Play에 정식 출시

1. `native-app` Capacitor 시작 프로젝트를 사용합니다. Android Studio, Node.js 설치.
2. `native-app` 폴더에서 `npm install` → `npm run prepare:web` → `npx cap add android`(최초 1회) → `npx cap sync android` → `npx cap open android`.
3. 고유 `appId`를 먼저 정합니다(예: `com.example.tripkku`, 실제 본인 소유 패키지). 바꾸기 어려우므로 출시 전 확정하세요.
4. 실제 기기에서 앱 기능·OAuth·초대·AI·오프라인 동작을 테스트하고 서명 키를 안전하게 보관합니다.
5. Android Studio에서 **Generate Signed Bundle / APK → Android App Bundle**로 `.aab` 생성.
6. Play Console 개발자 등록($25 1회), 정책·개인정보 고지·테스트 요구사항 충족 후 심사 제출.

## iPhone App Store에 정식 출시

1. Mac 및 Xcode, Apple Developer Program(보통 연 $99)이 필요합니다.
2. 같은 `native-app` 폴더에서 `npm install`, `npm run prepare:web`, `npx cap add ios`, `npx cap sync ios`, `npx cap open ios`.
3. Xcode에서 서명/프로비저닝 → 실제 iPhone 및 TestFlight 테스트 → Archive → App Store Connect 제출.
4. 애플의 최소 기능 요건(단순 웹뷰 이상의 네이티브 가치), Apple 로그인 관련 정책, 계정 삭제, 개인정보 처리, 알림·위치 권한, 앱스토어 스크린샷 등을 완성해야 합니다.

## 출시 준비 전 남아 있는 일

- Supabase 로그인·초대·실시간 공동 편집 실제 계정 테스트(현재 설정 필요)
- Gemini AI 서버 키와 요금·호출량 설정(현재 설정 필요)
- 사용자 계정 삭제·개인정보처리방침 및 권리행사 구현
- 날씨 API 상업 이용 라이선스 검토(Open-Meteo 무료 API는 비상업 용도)
- 앱스토어 심사 서류·테스터·결제·고객지원 채널 준비

`tripkku.ait`는 앱인토스 전용 번들로 Play Store와 App Store에 직접 제출할 수 없습니다.
