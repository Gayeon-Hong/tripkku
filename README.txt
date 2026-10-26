Tripkku 사이드바 접기/펼치기 + 개별 여행 삭제 패치

적용 기준: Tripkku_Travel_Details_Integration 패치가 이미 적용된 웹사이트.
1. GitHub 프로젝트 최상위에서 app.js, index.html, style.css 3개를 백업 후 교체합니다.
2. 다른 JS 파일(trip-bookings.js, trip-extras.js 등)은 그대로 유지합니다.
3. GitHub Pages 배포 완료 후 Ctrl+Shift+R로 새로고침합니다.
4. 내 여행 사이드바의 ◀ 접기/▶ 펼치기 버튼을 확인합니다.
5. 본인이 소유한 저장 여행에만 휴지통 버튼이 나옵니다. 누르면 여행 이름을 다시 입력해야 삭제됩니다.
6. 로그인하지 않았거나 DB에서 여행 목록을 불러오지 못하면 삭제 버튼도 나타나지 않습니다.

주의: DB의 trips 삭제가 외래키 제약이나 RLS 정책으로 차단되는 경우, 테이블 DELETE 정책 및 연결 레코드 처리 방식을 추가 검토해야 합니다. RLS 비활성화나 권한 전체 허용을 하지 마세요. 실제 DB 영구 삭제는 배포 전 테스트 여행으로 먼저 검증해야 합니다.
