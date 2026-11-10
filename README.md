# 트립꾸 (Tripkku) · 함께 꾸미는 여행 플래너

여행지와 날짜만 넣으면 AI가 동선을 제안하고, 친구와 일정·예산·메모를 함께 고치는 여행 플래너입니다.
설치 없이 브라우저에서 돌아가고, 홈 화면에 추가하면 앱처럼 열립니다.

- 웹앱: <https://gayeon-hong.github.io/tripkku/next/>
- 이 저장소의 결과물은 모두 정적 파일입니다. 빌드 도구 없이 GitHub Pages로 바로 배포됩니다.

## 지금 무엇이 돌아가나

| 기능 | 상태 | 위치 |
| --- | --- | --- |
| 카카오/구글 로그인, 초대 링크로 친구 참여 | 동작 | `next/app.js` |
| 일정 CRUD, 시간 겹침 확인, 하루 동선 지도 링크 | 동작 | `next/app.js`, `next/index.html` |
| AI 동선 추천·챗봇·번역 (Gemini) | 동작 (Edge Function `tripkku-ai`) | `supabase/functions/tripkku-ai` |
| 예약서 사진·PDF에서 시간 읽기 | 동작 (`trip-booking-ocr`) | `supabase/functions/trip-booking-ocr` |
| 공동/개인 예산, 개인 예약파일 보관 | 동작 (RLS로 분리) | `next/app.js`, `sql/schema.sql` |
| 여행 삭제/나가기 | 코드 수정 완료 · **SQL 1회 실행 필요** | `sql/2026-11-11_trip_delete.sql` |
| 앱인토스(토스 미니앱) 출시 | 준비 중(스캐폴드) | `toss-miniapp/` |
| 앱스토어/플레이스토어 배포 | 준비 중(Capacitor 스캐폴드) | `native-app/` |

## 폴더

```
next/                 지금 쓰는 웹앱 (index.html + app.js + style.css + countries.js)
supabase/functions/   AI·예약서 분석 Edge Function (Deno)
sql/                  데이터베이스 스키마와 정책(RLS), 이번 삭제/나가기 SQL
setup/                처음 연결할 때 쓰는 SQL·안내
docs/                 연결 가이드, 개인정보 체크리스트, 스타터 키트 문서
toss-miniapp/         앱인토스용 스캐폴드
native-app/           Capacitor(안드로이드/iOS) 스캐폴드
assets/               아이콘·지구 캐릭터 이미지
```

## 처음 한 번만 하면 되는 일

1. Supabase 프로젝트 > SQL Editor 에서 `sql/schema.sql` → `sql/ai_quota.sql` 순서로 실행 (새 프로젝트일 때)
2. 같은 곳에서 `sql/2026-11-11_trip_delete.sql` 실행 → 여행 삭제/나가기가 서버에서도 실제로 지워집니다
3. Edge Function Secrets 에 `GEMINI_API_KEY` 등록 (AI 기능)
4. `config.js` 의 `supabaseUrl` / `supabasePublishableKey` 는 공개해도 되는 값만 넣습니다

## 보안 메모

- 공개 저장소입니다. `service_role` 키, Gemini 키, OAuth client secret, 토스 서버 키는 **절대** 커밋하지 않습니다.
- 모든 테이블에 RLS가 켜져 있고, 개인 항공권·예약파일은 본인만 읽습니다.
- 초대 링크는 해시로 저장되고 만료·사용 횟수 제한이 있습니다.

## 로컬에서 보기

정적 파일이라 아무 서버로 열면 됩니다.

```bash
cd next && python3 -m http.server 8080
# http://localhost:8080
```
