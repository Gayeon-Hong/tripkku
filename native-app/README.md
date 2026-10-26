# Tripkku Android / iOS 앱 프로젝트 (시작점)

> 이 폴더는 스토어 제출용 완성 앱이 아닙니다. `.ait` 파일은 토스 전용이며, 이 프로젝트는 Capacitor로 Android/iOS 앱을 만들기 위한 출발점입니다.

## Windows에서 Android 앱 생성

1. Node.js 22 이상, Android Studio + Android SDK 설치
2. 이 `native-app` 폴더에서 터미널 열기
3. `npm install`
4. `npm run prepare:web` (상위 폴더의 최신 웹 코드를 `www`로 복사)
5. `npx cap add android`
6. `npx cap sync android`
7. `npx cap open android`
8. Android Studio에서 실제 기기 테스트 → 서명 키 생성 → **Build > Generate Signed Bundle / APK > Android App Bundle** 로 `.aab` 생성
9. Google Play Console에서 비공개 테스트 후 출시 심사

`capacitor.config.json`의 `appId`는 예시 `com.tripkku.app`입니다. 최초 배포 전에 **실제로 사용할 고유 패키지 ID**로 반드시 변경하세요.

## macOS에서 iPhone 앱 생성

1. Mac + Xcode (공식 Xcode 빌드 환경) + Apple Developer Program 등록
2. `npm install && npm run prepare:web`
3. `npx cap add ios && npx cap sync ios && npx cap open ios`
4. Xcode에서 iPhone 실제 기기 테스트 → Signing & Capabilities 설정 → Archive → App Store Connect 배포

## 출시 심사 전 필수

- SNS 로그인/OAuth 네이티브 콜백 연결, 초대/공동편집 서버 실사용 점검
- 계정 삭제, 개인정보 처리방침, 데이터 삭제 요청, 권한 최소화
- 실제 Gemini 서버 연동 및 사용자별 사용량 제한
- 오프라인 데이터/개인경비 보안 및 백업 정책
- **Apple 4.2 최소 기능**: 웹사이트 단순 래핑 이상으로 고유한 앱 기능(오프라인 일정, 여행 알림 등)을 완성
- 앱 스토어용 아이콘 및 스크린샷, 평가자용 테스트 계정 준비

**주의:** `.ait` 번들은 Google Play의 `.aab`나 Apple Store의 iOS 앱 바이너리로 변환되지 않습니다.
