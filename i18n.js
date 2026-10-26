/* Interface language is a device preference, not a translation of people's personal notes.
   Static UI and shipped sample travel content are translated. */
const KEY='tripkku-ui-language-v1';
let language='ko';
try{language=localStorage.getItem(KEY)==='en'?'en':'ko';}catch{}
const TEXT=new Map(Object.entries({
  '트립꾸 · 함께 꾸미는 여행':'Tripkku · Plan trips together',
  '트립꾸':'Tripkku', '한국어':'한국어', '로컬 데모':'Local demo', '👥 멤버/로그인':'👥 Members / Login',
  '우리만의 여행을':'Plan your dream trip', '같이 꾸며봐!':'Together!',
  '이자카야부터 몽벨 쇼핑까지, 일정과 예산을 우리 취향대로.':'From izakayas to shopping, make your own itinerary and budget.',
  '친구와 링크로 만나고, 계획은 함께 완성하자.':'Invite friends with a link and plan every detail together.',
  '여행 일정 보기 ↗':'See itineraries ↗', '예산 먼저 정하기':'Set a budget',
  '현재는 웹앱 시제품이에요.':'This is a web-app prototype.',
  'Supabase 연결 전에는 데이터가 내 브라우저에만 저장되고, 초대/공동 편집은 작동하지 않아요.':'Until Supabase is connected, your data stays in this browser. Invites and live collaboration are unavailable.',
  '어디로 떠날까?':'Where to next?', '＋ 새 여행 만들기':'＋ New trip', '🎨 테마 바꾸기':'🎨 Color theme',
  '🌏 내 지구 꾸미기':'🌏 Customize your Earth',
  '☀️ 낮 / 🌙 밤':'☀️ Day / 🌙 Night','☀️ 낮':'☀️ Day','🌙 밤':'🌙 Night','💬 오늘 지구 기분':'💬 Earth’s mood',
  '😄 신남':'😄 Happy','😠 화남':'😠 Angry','😴 졸림':'😴 Sleepy','🥰 설렘':'🥰 In love',
  
  
  '🌏 여행지 지구':'🌏 Destination globe',
  '선택한 여행지의 실제 해안선과 위치 핀, 출발일의 날씨를 한 번에 볼 수 있어.':'Explore your destination on a globe with real coastlines, a map pin, and travel-date weather.',
  '🌍 지구 화면':'🌍 Globe view','📍 실제 지도':'📍 Real map','😊 지구 표정':'😊 Earth face',
  '📍 여행 도시/나라':'📍 City or country','위치 적용':'Set location','📅 여행 날짜 (현지 날씨 확인)':'📅 Travel dates / Local forecast',
  '예: Tokyo, London, 오이타':'e.g. Tokyo, London, Oita','출발 날짜':'Start date','돌아오는 날짜':'End date',
  '날짜 저장':'Save dates', '🌦️ 날짜를 지정하면 날씨를 보여줄게.':'🌦️ Set travel dates to see local weather.',
  '📅 여행 날짜를 설정하면 날씨를 보여줄게.':'📅 Choose your travel dates to see local weather.',
  '📅 예보 발표 전이야. 출발 16일 전부터 확인 가능해.':'📅 Forecast not released yet. Check within 16 days of departure.',
  '📅 지난 여행 날짜라 실시간 예보는 제공되지 않아.':'📅 Past trip date: live forecast unavailable.',
  '☁️ 날씨를 불러오지 못했어. 인터넷 연결 후 다시 확인해 줘.':'☁️ Weather unavailable. Reconnect and retry.',
  '🌤️ 현지 날씨 확인 중…':'🌤️ Loading local forecast…',
  '날씨 제공:':'Weather:', '예보는 변경될 수 있어요.':'Forecasts can change.',
  '지형: NOAA/GSHHS · 여행지 중심 지도':'Coastlines: NOAA/GSHHS · destination-centered globe',
  '실제 해안선을 이용한 여행지 중심 지도야. 📍 위치 핀과 날씨를 확인하고, 원하면 표정 모드로 전환할 수 있어.':'Real shorelines, a location pin and the weather. Switch to face mode any time.',
  '✏️ 여행 정보':'✏️ Trip info',
  '여행지 지도와 현지 날씨부터 일정·예산까지.':'From destination maps and weather to itineraries and budgets.',
  '친구와 함께 여행을 만들어봐!':'Plan your adventure together!',
  '📍 목적지와 여행 날짜를 설정해 봐!':'📍 Choose a destination and travel dates!',
  '내 여행을 꾸며봐!':'Make this trip yours!',
  '현재 이 기기에 저장되는 여행 플래너야. 계정 기능이 연결되면 친구들과 함께 수정할 수 있어.':'This trip is currently saved on this device. Share it with friends once sign-in is connected.',
  '계정 로그인은 서비스 연결 후 사용할 수 있어요.':'Sign-in will be available after the service is connected.',
  '계정 로그인 기능 준비 중이야. 지금은 이 기기에 여행을 저장할 수 있어.':'Account sign-in is being prepared. Your trip is currently saved on this device.',
  '현재는 기기별 여행 저장을 사용할 수 있어요. 회원 초대는 준비 중입니다.':'You can save your trip on this device. Invitations are not yet available.',
  '💬 여행을 말로 수정해 봐! 계정 연결 전에는 기본 명령으로 일정과 비용을 변경할 수 있어.':'💬 Edit your trip using simple text commands. Account-based AI will be available after connection.',
  '좋은 여행은 같이 만드는 거니까.':'Great trips are better together.',
  '© 2026 Tripkku · 날씨와 경로는 출발 전에 다시 확인해 주세요.':'© 2026 Tripkku · Recheck weather and routes before traveling.',
  '📍 여행지 지도 보기':'📍 Destination map mode',
  '😊 지구 표정 보기':'😊 Earth expression mode',
  '여행 이름':'Trip name',
  '목적지 도시 (예: Tokyo, London, 벳푸)':'Destination city (e.g. Tokyo, London, Beppu)',
  '여행지와 이름을 바꿨어!':'Trip name and destination updated!',
  '도시 이름을 입력해 줘.':'Enter a city name.',
  '📍 목적지 지도 변경 완료':'📍 Destination updated',
  '여행 시작일과 종료일을 확인해 줘.':'Check travel start and end dates.',
  '📅 여행 날짜 저장 완료':'📅 Travel dates saved',
  '🔌 계정 연결 상태':'🔌 Check account connection','🔄 연결 상태 확인':'🔄 Check connection',
  '내가 참여한 여행':'Your shared trips',
  '날짜 미정':'Dates not set', '여행 날짜 직접 지정':'Choose travel dates',
  '✏️ 이름·날짜':'✏️ Trip & dates',
  '온천보다 맛집·쇼핑·인생샷':'Food, shopping & photo spots over hot springs',
  '🛏️ 벳푸 일반 호텔 2박':'🛏️ Beppu budget hotel · 2 nights','한 호텔에서 연박 · 짐 이동 0회':'Stay in one hotel · No packing twice',
  '가볍게 다니고 맛집에 더 쓰기':'Spend more on food and fun',
  '✨ 일반 호텔 1박 + 료칸 1박':'✨ Hotel 1 night + ryokan 1 night',
  '벳푸 안에서 1회 이동 · 료칸 객실 40만원 미만 목표':'One hotel change in Beppu · Ryokan under ₩400,000',
  '한 번쯤 특별한 숙소에서':'Treat yourself to one special night',
  '🛏️ 가성비 일반 호텔 연박':'🛏️ Budget hotel · same place', '숙소 이동 최소화 · 관광/식비 우선':'Fewer hotel changes · More for exploring',
  '✨ 일반 호텔 + 특별 숙박':'✨ Hotel + special stay','둘째 날 다른 숙소에서 특별한 하루':'A special stay on night two',
  '우리 항공편':'Our flights','인천 ICN':'Incheon ICN','오이타 OIT':'Oita OIT','귀국':'Return','인천':'Incheon',
  '※ 항공편 시간은 이전 대화 기준, 확정 예약 내역으로 재확인':'※ Times are provisional. Check your confirmed flights.',
  '＋ 일정 추가':'＋ Add activity','도착 & 밤':'Arrival & evening','본격 여행':'Explore','귀국':'Departure',
  '수정':'Edit','삭제':'Delete','아직 등록된 일정이 없어.':'No activities yet.',
  '예산은 우리 마음대로':'Budget your way','공동 예산과 내 예산을 분리해 보여줘. 초과하면 자동으로 빨간색!':'Track shared and personal budgets separately. Over-budget amounts turn red.',
  '단위 KRW · 원':'Currency · KRW','👭 우리 공동 경비':'👭 Shared expenses','멤버 전체 공개':'Visible to members',
  '공동 목표 예산 · 모두 합계':'Total shared budget goal','현재 예상 사용액':'Current estimated spending',
  '목표 예산 이내':'Within budget', '🏨 2인 1실 객실 전체 요금':'🏨 Total room price · 2 guests',
  '첫날 숙소':'Night 1 stay','둘째 날 숙소':'Night 2 stay','🍚 공동 지출 항목':'🍚 Shared spending','＋ 추가':'＋ Add',
  '💌 나만의 예산':'💌 My personal budget','🔒 본인만':'🔒 Only me','내 목표 총예산':'My total budget goal',
  '✈️ 내가 결제한 왕복 항공권':'✈️ My round-trip flight cost','🛍️ 나만의 쇼핑·개인 경비':'🛍️ Shopping & personal expenses',
  '내 예상 합계':'My estimated total','예약 금액 입력':'Enter paid amount','예상 금액 입력':'Enter estimate',
  '※ 공동경비는 멤버수로 균등 분할해 내 예상액에 더해. 개인 목표·항공권·쇼핑비는 다른 멤버에게 공개되지 않아. 실제 정산 기능은 아직 없어.':'Shared costs are split equally among members. Personal budgets, flights, and shopping stay private. Expense settlement is not available yet.',
  '길 찾고, 예약하고, 찜!':'Map, book & save','여행에서 화면을 나가지 않아도 빠르게 목적지를 찾을 수 있게 모았어.':'All your places and booking shortcuts in one trip.',
  '숙소·티켓 예약 링크':'Hotel & ticket links',
  '지도·예약 링크는 외부 서비스로 이동해요. 여행 날짜와 요금을 직접 확인하세요.':'Maps and booking links open external services. Confirm dates and prices yourself.',
  '친구랑 같이 편집하기':'Plan with friends','링크로 초대하고, 일정과 공동경비는 함께 고쳐봐.':'Invite with a link and edit shared plans and expenses.',
  '🔑 계정 & 로그인':'🔑 Account & sign in','연동 전 데모: 데이터는 이 기기에만 저장됩니다.':'Demo mode: data is saved on this device only.',
  'Google 로그인':'Sign in with Google','카카오 로그인':'Sign in with Kakao','로그아웃':'Sign out',
  'GitHub Pages에서 SNS 로그인을 사용하려면 Supabase와 OAuth 공급자 설정이 필요해요.':'Social login on GitHub Pages requires Supabase and OAuth provider settings.',
  '우리 여행 멤버':'Trip members','내 표시 이름':'My display name','저장':'Save','별명':'Nickname',
  '💌 초대장 보내기':'💌 Invite friends','초대받은 친구는 로그인한 뒤 같은 여행에 합류해. 여행 일정과 공동 경비는 실시간으로 동기화돼.':'Invitees can sign in and join this trip. Itineraries and shared costs sync when the backend is connected.',
  '🔗 친구 초대 링크 만들기':'🔗 Create invite link','복사':'Copy',
  '초대 링크는 기본 7일 동안 유효하고, 최대 15명의 신규 멤버가 사용할 수 있어. 링크를 공유한 사람만 초대하도록 주의해줘.':'Invite links last 7 days and allow up to 15 new members. Share only with people you trust.',
  '말로도 일정 편집! 💬':'Edit by chatting! 💬','로그인한 공동 여행에서는 Gemini AI로 수정 제안을 받을 수 있어. 승인하면 친구들과 함께 반영돼.':'When connected, Gemini can propose edits to shared trips. Review changes before applying them.',
  '🧩 로컬 데모에서는 무료 명령 편집 기능만 작동해. Supabase + Gemini API 설정 후 AI가 활성화돼.':'🧩 Demo supports basic commands. Connect Supabase + Gemini API to activate real AI suggestions.',
  '안녕! "B안으로 바꿔줘", "공동 목표 60만원", "항공권 25만원", "2일차 카페 추가"라고 말해봐 😊':'Hi! Try “plan B”, “shared 600000”, “flight 250000”, or “add cafe to day 2”. 😊',
  '예: B안으로 바꾸고 료칸 35만원으로 해줘':'e.g. plan B, ryokan 350000','보내기 →':'Send →',
  '🌏 여행 필수 회화':'🌏 Handy travel phrases','한국어 → 일본어':'Korean → Japanese','한국어 ↔ 일본어':'Korean ↔ Japanese','한국어 ↔ 영어':'Korean ↔ English',
  '좋은 여행은 같이 만드는 거니까.':'Great trips are better together.',
  '정적 데모 및 개발용 소스. 실제 공동편집은 로그인·DB 설정 후 가능. 앱인토스 제출 전 토스 로그인과 출시 정책 검토가 필요합니다.':'Prototype source. Real collaboration requires login and DB setup. Review Toss sign-in and app policies before publishing.',
  '일정':'Plans','예산':'Budget','지도':'Map','친구':'Friends','도우미':'Assistant',
  '숙소':'Hotels','교통':'Transit','사진':'Photos','쇼핑':'Shopping','맛집':'Food','식비':'Food','기타':'Other','관광':'Sights',
  '원':'KRW', '추가':'Add','일정 수정 완료':'Activity updated','일정 수정 완료!':'Activity updated!',
  '일본':'Japan','영국':'United Kingdom','미국':'United States',
  '오이타 2박 3일':'Oita · 2 nights / 3 days','벳푸 · 유후인 · 오이타':'Beppu · Yufuin · Oita',
  '오사카 3박 4일':'Osaka · 3 nights / 4 days','오사카':'Osaka',
  '런던 4박 5일':'London · 4 nights / 5 days','런던':'London',
  '뉴욕 4박 5일':'New York · 4 nights / 5 days','뉴욕':'New York',
  '온천은 선택 · 이자카야, 이치란, 몽벨, 유후인 사진 여행':'Optional hot springs · Izakaya, Ichiran, Montbell & Yufuin photos',
  '도톤보리·우메다·오사카성·쇼핑 샘플':'Dotonbori, Umeda, Osaka Castle & shopping',
  '웨스트민스터·브리티시뮤지엄·노팅힐 샘플':'Westminster, British Museum & Notting Hill',
  '센트럴파크·소호·브루클린 샘플':'Central Park, SoHo & Brooklyn',
  '벳푸역':'Beppu Station','유후인 긴린코':'Lake Kinrin, Yufuin','유노츠보 거리':'Yunotsubo Street',
  '몽벨 아뮤플라자 오이타':'Montbell · AMU Plaza Oita','이치란 오이타 벤텐점':'Ichiran Oita Benten',
  '벳푸 기타하마':'Beppu Kitahama','벳푸 료칸 후보':'Beppu ryokan','미마츠 오에테이':'Mimatsu Oetei','하나벳푸':'Hana Beppu','벳푸 일반 호텔':'Beppu budget hotel','니시테츠 리조트 인':'Nishitetsu Resort Inn',
  '도톤보리':'Dotonbori','오사카성':'Osaka Castle',
  '빅벤':'Big Ben','노팅힐':'Notting Hill','센트럴파크':'Central Park','브루클린 브리지':'Brooklyn Bridge',
  '숙소 근처 교통 중심':'Transport hub near hotels','유후인 감성 포토스팟':'Scenic Yufuin photo spot',
  '쇼핑·간식·산책':'Shopping, snacks & walking','친구가 꼭 가고 싶은 쇼핑':'Shopping must-do for your friend',
  '점심 해장 라멘 · 오이타역에서 버스/택시':'Lunch ramen · Bus or taxi from Oita Station',
  '이자카야·야경 산책':'Izakaya & night stroll','오사카 야경':'Osaka nightlife',
  '산책':'Walk','포토스팟':'Photo spot','감성 산책':'Scenic walk','피크닉':'Picnic','야경':'Night view',
  '함께 먹는 식사·이자카야':'Group meals & izakaya','공항·도시간 대중교통':'Airport & intercity transit','식사 공동비':'Shared meals',
  '벳푸 일반 호텔 · 니시테츠 리조트 인':'Beppu hotel · Nishitetsu Resort Inn','벳푸 료칸 후보 · 미마츠 오에테이':'Beppu ryokan · Mimatsu Oetei',
  '벳푸 료칸 후보 · 하나벳푸':'Beppu ryokan · Hana Beppu','오이타 액티비티 검색':'Oita experiences search','아고다':'Agoda','클룩':'Klook',
  '대중교통 길찾기 ↗':'Transit directions ↗', '🚶 대중교통 길찾기 ↗':'🚶 Transit directions ↗',
  '🏨 2인 1실 목표: 40만원 미만':'🏨 Room target: under ₩400,000',
  '이것 얼마예요?':'How much is this?','두 명이에요.':'There are two of us.','예약했어요.':'I have a reservation.',
  '이곳에 가고 싶어요.':'I want to go here.','현금만 되나요?':'Cash only?','카드 결제 되나요?':'Do you take cards?',
  '계산 부탁드려요.':'Could we have the bill?','🔊 말하기':'🔊 Speak',
  '나':'Me','연동 전 데모':'Unconnected demo',
  '계정':'Account','로그인':'Login',
  '10:00 전후':'Around 10:00','18:00 이후':'After 18:00',
  'Supabase 미연결: SNS 로그인·초대·공동 편집은 사용 전 설정이 필요합니다.':'Supabase is not configured: sign-in, invitations and collaboration are not yet available.',
  '🧩 현재 로컬 데모: 정해진 명령 편집만 가능해. 실제 Gemini AI는 Supabase 로그인·공동 여행 생성·Edge Function 배포 후 활성화돼.':'🧩 Local demo supports fixed commands only. Gemini requires Supabase login, a shared trip and the deployed Edge Function.',
  '외부 아고다·클룩·Google Maps 링크이며, 본 앱은 예약을 대신하거나 가격을 보증하지 않습니다.':'External Agoda, Klook and Google Maps links. This app does not book or guarantee prices.',
  '👑 나':'👑 Me','👤 친구':'👤 Friend',
  '오이타 벤텐점, 위치 확인 후 버스나 택시':'Oita Benten · Bus or taxi after checking the location',
  '날짜 미정':'Dates TBD',
  'A안 적용 완료':'Plan A selected','B안 적용 완료':'Plan B selected',
  '낮·밤 로고를 바꿨어 🌍':'Day/night theme updated 🌍','지구 기분을 바꿨어 💬':'Earth mood updated 💬',
  '테마를 바꿨어 🎨':'Color theme updated 🎨','같은 여행에 합류했어!':'Joined a shared trip!',
  '토스 외부 연결 정책 검토 후 제공':'Available after Toss external link policy review',
  '토스 정책 검토 전에는 외부 예약 링크를 표시하지 않습니다.':'External booking links disabled pending Toss policy review.',
  '친구 여행에 합류했어! 🎉':'Joined your friend’s trip! 🎉',
  '초대 링크는 7일간 유효합니다':'Invite link is valid for 7 days'
}));
// Extra translations for sample itinerary and location descriptions.
const SCHEDULE=[
['인천 → 오이타공항','Incheon → Oita Airport'],['공항버스 → 벳푸 · 일반 호텔 체크인','Airport bus → Beppu · hotel check-in'],
['벳푸 시내 구경 · 사진','Explore & photograph Beppu'],['🍶 벳푸 이자카야','🍶 Beppu izakaya'],['🌿 유후인 산책','🌿 Yufuin walk'],
['🍜 이치란 점심 해장','🍜 Ichiran ramen lunch'],['🎒 몽벨 쇼핑','🎒 Montbell shopping'],['벳푸 복귀 · 같은 호텔 2박차','Return to Beppu · same hotel'],
['벳푸 → 오이타공항','Beppu → Oita Airport'],['벳푸 일반 호텔 1박차','Beppu budget hotel · first night'],
['🌿 유후인 사진 산책','🌿 Yufuin photo walk'],['✨ 벳푸 료칸 체크인 · 석식','✨ Beppu ryokan check-in & dinner'],
['료칸 체크아웃 → 공항버스','Ryokan checkout → airport bus'],['난바 체크인','Namba check-in'],['오사카성 산책','Osaka Castle walk'],
['런던 도착','Arrive in London'],['웨스트민스터 사진 산책','Westminster photo walk'],
['뉴욕 도착','Arrive in New York'],['브루클린 산책','Brooklyn walk'],
['항공권은 사용자가 직접 금액 입력 · 출발/귀국 시각 항공사 재확인','Enter your own airfare · Verify flights with airline'],
['기타하마~벳푸역 주변 2박 연박','Stay near Kitahama / Beppu Station for both nights'],
['벳푸 타워와 바다 야경','Beppu Tower & ocean at night'],['모임 필수! 예약 및 영업시간 확인','A must-do! Check reservation and opening hours'],
['유노츠보·플로럴빌리지·긴린코. 실제 버스/기차 시각 확인','Yunotsubo, Floral Village & Lake Kinrin · Check transit schedules'],
['오이타 벤텐점, 위치 확인 후 버스나 택시','Oita Benten branch · Check location, bus or taxi'],
['JR 오이타역 연결 아뮤플라자','AMU Plaza next to JR Oita Station'],['숙소 이동 없음','No hotel changes'],
['14:00 출국편, 공항버스 최신 시간 확인','14:00 flight · Check the latest airport bus timetable'],
['항공권 가격은 각자 직접 입력','Each member enters their own flight cost'],
['짐 보관 · 저렴하고 역 가까운 호텔','Store luggage · Affordable hotel near the station'],
['첫날 밤은 이자카야!','Izakaya night on day one!'],['유노츠보·긴린코 포인트','Yunotsubo & Lake Kinrin photo spots'],
['점심 이후 몽벨로 이동','Montbell after lunch'],['16시 전후 벳푸 료칸으로 이동해야 석식에 여유','Head to Beppu ryokan around 16:00 for a relaxed dinner'],
['객실 2인 합계 40만원 미만 목표. 예약 전 석식 포함 확인','Room for two: under ₩400,000. Check if dinner is included'],
['귀국편 14:00, 짐과 이동 시간 여유','Return flight 14:00 · Allow time for luggage and transport'],
['쇼핑·맛집 탐방','Shopping & food'],['대중교통 확인','Check public transit'],
['체크인','Check-in'],['호텔','Hotel'],['관광','Sightseeing'],['대중교통 확인','Check transit'],['감성 산책','Scenic walk'],
['낮','Day'],['밤','Night'],['신나는 지구','Happy Earth'],['화난 지구','Angry Earth'],['졸린 지구','Sleepy Earth'],['설레는 지구','Love-struck Earth'],

['시간 미정','Time not set'],['명령어로 추가 · 시간 확인 필요','Added by command · Time not set'],['직접 추가한 일정','Activity added manually'],
['숙소는 2인 1실 객실 전체 비용입니다. B안 료칸 1박은 40만원 미만을 목표로 합니다.','Room costs are total prices for two people. Plan B aims for a ryokan under ₩400,000.']
];
for(const [ko,en] of SCHEDULE)TEXT.set(ko,en);
const ORIGINAL_NODES=new WeakMap();const ORIGINAL_ATTRS=new WeakMap();
export function getUiLanguage(){return language;}
export function isEnglish(){return language==='en';}
export function setUiLanguage(next){language=next==='en'?'en':'ko';try{localStorage.setItem(KEY,language);}catch{}
  document.documentElement.lang=language==='en'?'en':'ko';}
export function translateString(input){
 if(language!=='en')return String(input??'');
 const source=String(input??'');
 const normalized=source.trim();
 const wrap=fn=>source.slice(0,source.indexOf(normalized))+fn(normalized)+source.slice(source.indexOf(normalized)+normalized.length);
 if(TEXT.has(normalized))return wrap(x=>TEXT.get(x));
 let m;
 if((m=normalized.match(/^(교통|맛집|사진|쇼핑|관광) #([\d]+)$/)))return `${TEXT.get(m[1])||m[1]} #${m[2]}`;
 if(normalized.endsWith('↗')&&normalized.includes(' · ')){const parts=normalized.slice(0,-1).trim().split(' · ');return parts.map(x=>TEXT.get(x)||x).join(' · ')+' ↗';}
 if((m=normalized.match(/^🚨 목표 초과 \+(.+)$/)))return `🚨 Over budget: +${m[1]}`;
 if((m=normalized.match(/^✓ 목표 금액 이내 · (.+) 남았어$/)))return `✓ Within budget · ${m[1]} left`;
 if((m=normalized.match(/^🛏️ 같은 호텔에서 편하게 2박.*$/)))return '🛏️ Two nights in the same hotel. Enter actual room cost.';
 if((m=normalized.match(/^✨ 료칸은 2인 1실 객실 합계 40만원 미만 목표 · 현재 (.+)$/)))return `✨ Ryokan target (two guests): under ₩400,000 · Current ${m[1]}`;
 if((m=normalized.match(/^🚨 료칸 1박 객실요금 40만원 기준 초과 (.+)$/)))return `🚨 Ryokan is above the ₩400,000 goal by ${m[1]}`;
 if((m=normalized.match(/^✨ 료칸 2인 1실 목표: 40만원 미만 · 현재 (.+)$/)))return `✨ Ryokan target: under ₩400,000 for two · Current ${m[1]}`;
 if((m=normalized.match(/^🚨 료칸 1박 객실요금 40만원 기준 초과 (.+) · 다른 후보를 찾아봐!$/)))return `🚨 Ryokan exceeds the ₩400,000 target by ${m[1]}`;
 if((m=normalized.match(/^내 지출 예상 = 공동경비 1\/(\d+)인 (.+) \+ 내 항공 (.+) \+ 개인경비 (.+)$/)))return `My total = 1/${m[1]} shared costs ${m[2]} + flights ${m[3]} + personal ${m[4]}`;
 if((m=normalized.match(/^🔒 연결 후 초대 링크 사용 가능$/)))return '🔒 Connect to enable invites';
 if((m=normalized.match(/^🔗 7일 유효 초대 링크 만들기$/)))return '🔗 Create 7-day invite link';
 if((m=normalized.match(/^\d+원$/)))return normalized.replace('원',' KRW');
 if((m=normalized.match(/^(.+)원$/))&&/^\d/.test(normalized))return normalized.replace('원',' KRW');
 if((m=normalized.match(/^(.+?) · (.+?) #([\d]+)$/)))return `${TEXT.get(m[1])||m[1]} · ${TEXT.get(m[2])||m[2]} #${m[3]}`;
 if((m=normalized.match(/^(.+) · (.+)$/))&&TEXT.has(m[1])&&TEXT.has(m[2]))return `${TEXT.get(m[1])} · ${TEXT.get(m[2])}`;
 if((m=normalized.match(/^([\S ]+) · (아고다|클룩)$/)))return `${TEXT.get(m[1])||m[1]} · ${TEXT.get(m[2])||m[2]}`;
 return source;
}
export function translateUi(){
 document.documentElement.lang=language==='en'?'en':'ko';
 document.querySelectorAll('button[data-ui-lang]').forEach(b=>{
  const active=b.dataset.uiLang===language;
  b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));
 });
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 let node;
 while((node=walker.nextNode())){
  if(!node.nodeValue.trim()||node.parentElement?.closest('script,style,textarea,.bubble.me'))continue;
  let o=ORIGINAL_NODES.get(node);
  if(!o||node.nodeValue!==o.ko&&node.nodeValue!==o.en){o={ko:node.nodeValue};o.en=null;ORIGINAL_NODES.set(node,o);}
  if(o.en===null)o.en=translateStringInEnglish(o.ko);
  node.nodeValue=language==='en'?o.en:o.ko;
 }
 document.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(el=>{
  const a=ORIGINAL_ATTRS.get(el)||{};
  for(const attr of ['placeholder','title','aria-label','alt']){
   const value=el.getAttribute(attr);if(value===null)continue;
   if(!a[attr]||(value!==a[attr].ko&&value!==a[attr].en))a[attr]={ko:value,en:translateStringInEnglish(value)};
   el.setAttribute(attr,language==='en'?a[attr].en:a[attr].ko);
  }
  ORIGINAL_ATTRS.set(el,a);
 });
 document.title=language==='en'?'Tripkku · Plan trips together':'트립꾸 · 함께 꾸미는 여행';
}
function translateStringInEnglish(ko){const old=language;language='en';const x=translateString(ko);language=old;return x;}
