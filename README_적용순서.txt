Tripkku 삭제 문제 수정 v2

현재 화면에서 이름 입력 prompt가 뜨고 repo.deleteTrip is not a function 이 보인다면
현재 웹사이트가 구버전 app.js 또는 collab.js 를 실행하고 있다는 뜻입니다.

1. GitHub 저장소 최상위 루트에 app.js, collab.js, index.html, sw.js 네 파일을 업로드(덮어쓰기)하세요.
   toss-miniapp 폴더가 아니라 실제 GitHub Pages에 배포되는 루트입니다.
2. Supabase SQL Editor에서 trips_delete_policy.sql 을 실행하세요.
3. GitHub Actions/Pages 배포 완료를 확인하세요.
4. 사이트에서 Ctrl+Shift+R을 누르세요. 계속 예전 코드면 Chrome F12 > Application > Service workers > Unregister
   그리고 Application > Storage > Clear site data (주의: 사이트 로컬 데이터가 지워질 수 있음) 대신
   Application > Cache storage 에서 tripkku-static 관련 캐시만 삭제한 후 새로고침하세요.
5. Network 탭에서 app.js?v=delete-fix-20261027-2 요청이 있는지 확인하세요.
6. 소유한 테스트 여행의 휴지통 클릭 > 브라우저 confirm 한 번으로 삭제합니다.

참고: DB에서 다른 테이블이 trips를 참조하며 ON DELETE CASCADE가 없으면 삭제는 여전히 제한될 수 있습니다.
삭제에 실패하면 표시되는 새로운 에러 메시지를 확인하세요.
이 패치는 기존 로그인/Gemini/예약 관련 기능 구현을 대체하지 않도록 삭제 관련 앱 파일만 포함합니다.
