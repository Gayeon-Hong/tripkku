export const PRESETS = {
  oita: {
    key:'oita', flag:'🇯🇵', country:'일본', city:'벳푸 · 유후인 · 오이타', title:'오이타 2박 3일', dates:'여행 날짜 직접 지정', language:'ja-JP', shared_target:550000, plan:'A', people:2,
    nights_a:[90000,90000], nights_b:[85000,320000],
    budgetNote:'숙소는 2인 1실 객실 전체 비용입니다. B안 료칸 1박은 40만원 미만을 목표로 합니다.',
    description:'온천은 선택 · 이자카야, 이치란, 몽벨, 유후인 사진 여행',
    expenses:[{category:'식비',title:'함께 먹는 식사·이자카야',amount:110000},{category:'교통',title:'공항·도시간 대중교통',amount:55000}],
    maps:[
      {name:'벳푸역',note:'숙소 근처 교통 중심',query:'Beppu Station Oita Japan',type:'교통'},
      {name:'유후인 긴린코',note:'유후인 감성 포토스팟',query:'Lake Kinrin Yufuin Oita',type:'사진'},
      {name:'유노츠보 거리',note:'쇼핑·간식·산책',query:'Yunotsubo Kaido Yufuin',type:'사진'},
      {name:'몽벨 아뮤플라자 오이타',note:'친구가 꼭 가고 싶은 쇼핑',query:'mont-bell Amu Plaza Oita',type:'쇼핑'},
      {name:'이치란 오이타 벤텐점',note:'점심 해장 라멘 · 오이타역에서 버스/택시',query:'Ichiran Oita Benten',type:'맛집'},
      {name:'벳푸 기타하마',note:'이자카야·야경 산책',query:'Kitahama Beppu Oita Japan',type:'맛집'}
    ],
    schedule: {
      A:[
        {day:1,time:'11:05–13:00',title:'인천 → 오이타공항',note:'항공권은 사용자가 직접 금액 입력 · 출발/귀국 시각 항공사 재확인'},
        {day:1,time:'14:00–16:00',title:'공항버스 → 벳푸 · 일반 호텔 체크인',note:'기타하마~벳푸역 주변 2박 연박'},
        {day:1,time:'17:00–18:30',title:'벳푸 시내 구경 · 사진',note:'벳푸 타워와 바다 야경'},
        {day:1,time:'19:00–21:30',title:'🍶 벳푸 이자카야',note:'모임 필수! 예약 및 영업시간 확인'},
        {day:2,time:'08:30–12:30',title:'🌿 유후인 산책',note:'유노츠보·플로럴빌리지·긴린코. 실제 버스/기차 시각 확인'},
        {day:2,time:'13:30–15:00',title:'🍜 이치란 점심 해장',note:'오이타 벤텐점, 위치 확인 후 버스나 택시'},
        {day:2,time:'15:00–17:00',title:'🎒 몽벨 쇼핑',note:'JR 오이타역 연결 아뮤플라자'},
        {day:2,time:'18:00 이후',title:'벳푸 복귀 · 같은 호텔 2박차',note:'숙소 이동 없음'},
        {day:3,time:'10:00 전후',title:'벳푸 → 오이타공항',note:'14:00 출국편, 공항버스 최신 시간 확인'},
      ],
      B:[
        {day:1,time:'11:05–13:00',title:'인천 → 오이타공항',note:'항공권 가격은 각자 직접 입력'},
        {day:1,time:'14:00–16:00',title:'벳푸 일반 호텔 1박차',note:'짐 보관 · 저렴하고 역 가까운 호텔'},
        {day:1,time:'19:00–21:30',title:'🍶 벳푸 이자카야',note:'첫날 밤은 이자카야!'},
        {day:2,time:'08:30–11:30',title:'🌿 유후인 사진 산책',note:'유노츠보·긴린코 포인트'},
        {day:2,time:'12:30–14:00',title:'🍜 이치란 점심 해장',note:'점심 이후 몽벨로 이동'},
        {day:2,time:'14:00–15:30',title:'🎒 몽벨 쇼핑',note:'16시 전후 벳푸 료칸으로 이동해야 석식에 여유'},
        {day:2,time:'16:30–20:00',title:'✨ 벳푸 료칸 체크인 · 석식',note:'객실 2인 합계 40만원 미만 목표. 예약 전 석식 포함 확인'},
        {day:3,time:'10:00 전후',title:'료칸 체크아웃 → 공항버스',note:'귀국편 14:00, 짐과 이동 시간 여유'},
      ]
    },
    booking:[
      {name:'벳푸 일반 호텔 · 니시테츠 리조트 인',url:'https://www.agoda.com/ko-kr/nishitetsu-resort-inn-beppu/hotel/beppu-jp.html',site:'아고다'},
      {name:'벳푸 료칸 후보 · 미마츠 오에테이',url:'https://www.agoda.com/seaside-hotel-mimatsu-oetei/hotel/beppu-jp.html',site:'아고다'},
      {name:'벳푸 료칸 후보 · 하나벳푸',url:'https://www.agoda.com/hana-beppu_3/hotel/beppu-jp.html',site:'아고다'},
      {name:'오이타 액티비티 검색',url:'https://www.klook.com/ko/search/result/?query=Oita',site:'클룩'}
    ]
  },
  osaka:{key:'osaka',flag:'🇯🇵',country:'일본',city:'오사카',title:'오사카 3박 4일',dates:'날짜 미정',language:'ja-JP',shared_target:850000,plan:'A',people:2,nights_a:[150000,150000],nights_b:[150000,290000],description:'도톤보리·우메다·오사카성·쇼핑 샘플',expenses:[{category:'식비',title:'식사 공동비',amount:210000}],maps:[{name:'도톤보리',note:'오사카 야경',query:'Dotonbori Osaka Japan',type:'사진'},{name:'오사카성',note:'산책',query:'Osaka Castle',type:'관광'}],schedule:{A:[{day:1,time:'오후',title:'난바 체크인',note:'쇼핑·맛집 탐방'},{day:2,time:'오전',title:'오사카성 산책',note:'교통편 직접 확인'}],B:[{day:1,time:'오후',title:'난바 체크인',note:'호텔'},{day:2,time:'오전',title:'오사카성 산책',note:'관광'}]},booking:[]},
  london:{key:'london',flag:'🇬🇧',country:'영국',city:'런던',title:'런던 4박 5일',dates:'날짜 미정',language:'en-GB',shared_target:1200000,plan:'A',people:2,nights_a:[200000,200000],nights_b:[200000,350000],description:'웨스트민스터·브리티시뮤지엄·노팅힐 샘플',expenses:[{category:'식비',title:'식사 공동비',amount:250000}],maps:[{name:'빅벤',note:'포토스팟',query:'Big Ben London',type:'사진'},{name:'노팅힐',note:'감성 산책',query:'Notting Hill London',type:'사진'}],schedule:{A:[{day:1,time:'오후',title:'런던 도착',note:'체크인'},{day:2,time:'오전',title:'웨스트민스터 사진 산책',note:'대중교통 확인'}],B:[{day:1,time:'오후',title:'런던 도착',note:'체크인'}]},booking:[]},
  newyork:{key:'newyork',flag:'🇺🇸',country:'미국',city:'뉴욕',title:'뉴욕 4박 5일',dates:'날짜 미정',language:'en-US',shared_target:1800000,plan:'A',people:2,nights_a:[230000,230000],nights_b:[230000,390000],description:'센트럴파크·소호·브루클린 샘플',expenses:[{category:'식비',title:'식사 공동비',amount:290000}],maps:[{name:'센트럴파크',note:'피크닉',query:'Central Park New York',type:'사진'},{name:'브루클린 브리지',note:'야경',query:'Brooklyn Bridge New York',type:'사진'}],schedule:{A:[{day:1,time:'오후',title:'뉴욕 도착',note:'체크인'},{day:2,time:'오후',title:'브루클린 산책',note:'포토스팟'}],B:[{day:1,time:'오후',title:'뉴욕 도착',note:'체크인'}]},booking:[]}
};
export function clonePreset(key='oita') { const p=PRESETS[key]||PRESETS.oita;return JSON.parse(JSON.stringify(p)); }
export function money(n) { return new Intl.NumberFormat('ko-KR').format(Math.round(Number(n)||0))+'원'; }
export function safeNum(n){return Math.max(0,Math.round(Number(n)||0));}
export function googleDirections(query){return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(query)+'&travelmode=transit';}
