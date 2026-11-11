/**
 * TRIPKKU · 내 캐릭터 꾸미기 + 3D 동선 재생 + 여행 영상 저장
 *
 *   1) 캐릭터 설정  얼굴은 동그라미에서 볼 너비·길이·턱선을 조금씩 조절, 머리 6종 × 앞머리(있음/없음/가르마), 눈·눈썹, 키(보통/어린이/아기), 색, 소품,
 *                   여행지 전통의상(여/남 형태와 색만 선택). 전부 무료.
 *                   여행 문서 data.avatars[userId] 에 저장한다(DB 변경 없음).
 *   2) 타임라인     하루 또는 여행 전체 일정을 "이동 → 머무름" 구간으로 만든다. 장소 이름에 맞는 행동·소품을 고른다.
 *   3) 지도         장소 이름 → 좌표(OpenStreetMap Nominatim, data.geo 에 저장). 가까운 곳끼리는 클로즈업을 유지한 채
 *                   걸어서 이동하고, 먼 곳(비행·도시 간)은 화면이 바뀌며 멀리서 본 지도 위를 탈것이 지나간다.
 *   4) 그리기       3D 장면은 journey3d.js(Three.js)가 그리고, 그 위에 이름표·말풍선·제목을 2D로 덧그린다.
 *   5) 영상 저장    합쳐진 캔버스를 녹화해 파일로 내려받는다.
 *   6) 화면 곳곳    여행 소개 카드의 일행, 홈 인사 카드의 내 캐릭터, 여행 카드의 일행 얼굴, 초대 창의 참여자 얼굴.
 *                   홈에서 꾸민 캐릭터는 이 기기에 저장해 두었다가 여행을 열 때 자동으로 적용한다.
 *
 * app.js 와는 window.__tripkku 로만 연결된다.
 */
const W=720,H=1280,PI=Math.PI,SPEEDS=[.5,.75,1,1.25,1.5,1.75,2,2.5];
const FONT="-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif";
const INK='#2a2f3c';
const api=()=>window.__tripkku||{};

export const OPT={
 skin:['#ffe3cf','#f8cfae','#e0a880','#b07850'],
 hair:[['bob','단발'],['long','긴머리'],['perm','파마'],['short','짧은머리'],['permShort','짧은 파마'],['buzz','까까머리']],
 bangs:[['full','앞머리 있음'],['none','앞머리 없음'],['part','가르마']],
 size:[['adult','보통'],['kid','어린이'],['baby','아기']],
 brows:[['soft','둥근 눈썹'],['flat','일자 눈썹'],['up','올라간 눈썹'],['thick','진한 눈썹'],['none','없음']],
 hairColor:['#2b2622','#5a3b28','#8a5a3c','#d9a760','#f2a7b8','#b9bcc4','#6d8fd6'],
 eyes:[['sparkle','반짝'],['dot','콩눈'],['smile','웃는눈'],['sleepy','졸린눈']],
 outfit:['#b9a4e6','#f6b6c8','#f4d58a','#8fd0b8','#8fb7ea','#f2a07a','#5f6f94','#ffffff'],
 acc:[['none','없음'],['glasses','안경'],['ribbon','리본'],['cap','모자']],
 costume:[['on','입기'],['off','안 입기']],
 gender:[['f','여'],['m','남']],
 costumeColor:['#e85a6e','#f2a03a','#f0c75e','#4fae7a','#3f8fd6','#6b5fd0','#c05aa8','#2f3a55']
};
// 여행하는 나라 → 전통의상 종류(journey3d.js 의 costumeSpec). 목록에 없는 나라는 평소 옷을 입는다.
const COSTUME={KR:'hanbok',JP:'kimono',CN:'qipao',TW:'qipao',HK:'qipao',VN:'aodai',DE:'tracht',AT:'tracht',CH:'tracht',CZ:'folk',PL:'folk',HU:'folk',SK:'folk',GB:'kilt',TH:'thai',IN:'sari'};
const COSTUME_NAME={hanbok:'한복',kimono:'기모노',qipao:'치파오·탕좡',aodai:'아오자이',tracht:'던들·레더호젠',folk:'민속의상',kilt:'킬트',thai:'쑤타이',sari:'사리·쿠르타'};
export const costumeKind=code=>COSTUME[String(code||'').toUpperCase()]||'';
const FACE=[['faceW','볼 너비','좁게','넓게'],['faceH','얼굴 길이','짧게','길게'],['jaw','턱선','둥글게','갸름하게']]; // 각 -1 ~ 1
const GROUPS=[['friends','친구'],['family','가족'],['couple','연인']];
const ROLES={friends:['총무','길잡이','사진담당','맛집담당'],family:['엄마','아빠','딸','아들','아기','할머니','할아버지','언니','누나','오빠','형','동생'],couple:['여자친구','남자친구','아내','남편']};
const LOCAL_KEY='tripkku-next-avatar';

/* ---------- 작은 도구 ---------- */
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rr(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function fillRR(ctx,x,y,w,h,r){ctx.beginPath();rr(ctx,x,y,w,h,r);ctx.fill();}
function fit(ctx,text,maxW){text=String(text??'');if(ctx.measureText(text).width<=maxW)return text;while(text.length>1&&ctx.measureText(text+'…').width>maxW)text=text.slice(0,-1);return text+'…';}
const ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function todayISO(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}

/* ---------- 캐릭터 설정 ---------- */
export function defaultAvatar(id){const h=hash(id||'tripkku');const pick=(arr,n)=>arr[(h>>>n)%arr.length],dial=n=>(((h>>>n)%9)-4)/8;
 return {faceW:dial(1),faceH:dial(4),jaw:dial(7),skin:pick(OPT.skin,3),hair:pick(OPT.hair,6)[0],bangs:pick(OPT.bangs,18)[0],size:'adult',hairColor:pick(OPT.hairColor,9),eyes:pick(OPT.eyes,12)[0],brows:'soft',outfit:pick(OPT.outfit,15),acc:'none',costume:'on',gender:pick(OPT.gender,20)[0],costumeColor:pick(OPT.costumeColor,22),role:''};}
// 친구가 저장한 값도 섞여 들어오므로 목록에 있는 값과 범위 안의 숫자만 받아들인다.
export function cleanAvatar(raw,id){const base=defaultAvatar(id);if(!raw||typeof raw!=='object')return base;
 const key=(list,v,d)=>list.some(x=>x[0]===v)?v:d,color=(list,v,d)=>list.includes(v)?v:d,num=(v,d)=>typeof v==='number'&&Number.isFinite(v)?clamp(v,-1,1):d;
 return {faceW:num(raw.faceW,base.faceW),faceH:num(raw.faceH,base.faceH),jaw:num(raw.jaw,base.jaw),skin:color(OPT.skin,raw.skin,base.skin),hair:key(OPT.hair,raw.hair,base.hair),bangs:key(OPT.bangs,raw.bangs,base.bangs),size:key(OPT.size,raw.size,'adult'),hairColor:color(OPT.hairColor,raw.hairColor,base.hairColor),
  eyes:key(OPT.eyes,raw.eyes,base.eyes),brows:key(OPT.brows,raw.brows,base.brows),outfit:color(OPT.outfit,raw.outfit,base.outfit),acc:key(OPT.acc,raw.acc,'none'),
  costume:key(OPT.costume,raw.costume,'on'),gender:key(OPT.gender,raw.gender,base.gender),costumeColor:color(OPT.costumeColor,raw.costumeColor,base.costumeColor),role:String(raw.role||'').slice(0,8)};}
const localKey=()=>LOCAL_KEY+':'+(api().getMyId?.()||'');
function localAvatar(){try{return JSON.parse(localStorage.getItem(localKey())||'null');}catch{return null;}}
// 같은 기기의 다른 계정 캐릭터가 자동 적용돼 내 캐릭터와 똑같이 저장된 경우는 저장 안 한 것으로 본다
const sameLook=(a,b)=>!!a&&!!b&&JSON.stringify({...a,role:''})===JSON.stringify({...b,role:''});
export function party(){const a=api(),doc=a.activeDoc?.()||{},me=a.getMyId?.();
 const list=(a.getMembers?.()||[]).slice(0,8);if(!list.length)list.push({user_id:me||'me',display_name:'나'});
 const mine=doc.avatars?.[me];
 return list.map(m=>{let saved=doc.avatars?.[m.user_id]||(m.user_id===me?localAvatar():null);if(m.user_id!==me&&sameLook(saved,mine))saved=null;
  const av=cleanAvatar(saved,m.user_id);const name=String(m.display_name||'친구').slice(0,8);
  return {id:m.user_id,me:m.user_id===me,av,label:av.role?av.role+' '+name:name};});}

/* ---------- 일정 분석: 제목·장소·메모에서 무엇을 하는지 읽어 소품(journey3d.js 의 PROPS)·행동·말풍선을 고른다 ----------
   규칙은 위에서부터 먼저 맞는 것을 쓴다. 소품·말풍선이 여러 개면 같은 종류가 다시 나올 때마다 차례로 바꾼다
   (크리스마스 마켓 → 트리, 다음엔 산타, 그다음엔 가판대 …). */
const RULES=[
 // 크리스마스·겨울
 [/글뤼바인|뱅쇼|gl[uü]hwein/i,['gluhwein'],'cheer',['따뜻해~','짠!']],
 [/산타|santa/i,['santa'],'cheer',['산타다!','메리 크리스마스!']],
 [/눈사람|눈썰매|snowman/i,['snowman'],'cheer',['눈사람이다!']],
 [/크리스마스|성탄|트리|christmas|weihnacht|xmas/i,['tree','santa','stall','snowman','gluhwein'],'cheer',['우와, 트리다!','산타다!','구경하자!','메리 크리스마스!','따뜻해~']],
 [/스키|스노보드|보드 타|ski/i,['ski'],'cheer',['야호!']],
 // 공항: 이동·체크인은 비행기가 아니다
 [/(공항|airport).*(체크인|수속|출국|보안|면세 ?구역|탑승 ?대기|라운지)|(체크인|수속).*(공항|airport)/i,['suitcase','airport'],'wave',['수속 중!','두근두근']],
 [/(공항|airport).*(이동|가기|가는|리무진|셔틀|버스|택시|철도|전철|express)|(이동|리무진|셔틀|택시|버스).*(공항|airport)|공항철도/i,['train'],'wave',['공항 가자!','늦지 말자!']],
 [/공항|airport/i,['airport'],'wave',['공항 도착!']],
 // 특정된 음식(나라별)
 [/타코야끼|타코야키|takoyaki/i,['takoyaki'],'eat',['뜨거워!','겉바속촉!']],
 [/오니기리|주먹밥|편의점/i,['onigiri'],'eat',['간단하게!']],
 [/떡볶이|분식/i,['tteokbokki'],'eat',['매콤달콤!']],
 [/김밥/i,['kimbap'],'eat',['소풍 기분!']],
 [/북경 ?오리|베이징 ?덕|peking/i,['pekingduck'],'eat',['껍질이 바삭!']],
 [/훠궈|샤브샤브|전골|hot ?pot/i,['hotpot'],'eat',['보글보글!']],
 [/버블티|밀크티|타피오카|bubble ?tea/i,['bubbletea'],'eat',['쫀득쫀득!']],
 [/팟타이|pad ?thai/i,['padthai'],'eat',['맛있다!']],
 [/망고 ?(밥|스티키|찹쌀)|mango ?sticky/i,['mangorice'],'eat',['달콤해!']],
 [/반미|banh ?mi/i,['banhmi'],'eat',['바삭바삭!']],
 [/난 |naan|탄두리/i,['naan'],'eat',['쫄깃해!']],
 [/사테|꼬치|satay/i,['satay'],'eat',['맛있다!']],
 [/나시고렝|볶음밥|fried ?rice/i,['friedrice'],'eat',['고슬고슬!']],
 [/바클라바|로쿰|baklava/i,['baklava'],'eat',['달다달아!']],
 [/차이|홍차|애프터눈 ?티|티룸|tea/i,['tea'],'eat',['향 좋다~']],
 [/에스프레소|espresso/i,['espresso'],'eat',['진하다!']],
 [/마카롱|macaron/i,['macaron'],'eat',['알록달록!']],
 [/추로스|츄러스|churro/i,['churros'],'eat',['초코 찍먹!']],
 [/에그타르트|나타|pastel/i,['nata'],'eat',['바삭 촉촉!']],
 [/퐁듀|fondue|라클렛/i,['fondue'],'eat',['치즈 늘어난다!']],
 [/와플|waffle/i,['waffle'],'eat',['달콤해!']],
 [/치즈|cheese/i,['cheese'],'eat',['고소해!']],
 [/뜨르델닉|굴뚝빵|trdeln/i,['trdelnik'],'eat',['빙글빙글!']],
 [/굴라시|굴라쉬|goulash|gulasch/i,['goulash'],'eat',['든든해!']],
 [/피에로기|pierogi/i,['dumpling'],'eat',['쫄깃해!']],
 [/도넛|도너츠|donut/i,['donut'],'eat',['달콤해!']],
 [/핫도그|hot ?dog/i,['hotdog'],'eat',['한입 가득!']],
 [/푸틴|poutine/i,['poutine'],'eat',['든든해!']],
 [/미트 ?파이|meat ?pie/i,['meatpie'],'eat',['따끈따끈!']],
 [/타파스|핀초스|tapas/i,['tapas'],'eat',['골라 먹자!']],
 [/초콜릿|쇼콜라|chocolate/i,['chocolate'],'eat',['달콤해!']],
 [/일식|일본 ?(음식|요리)|이자카야/i,(c,n)=>['sushi','bowl','takoyaki','grill'][n%4],'eat',['맛있다!']],
 [/중식|중국 ?(음식|요리)|딤섬/i,(c,n)=>['dumpling','pekingduck','hotpot'][n%3],'eat',['맛있다!']],
 [/태국 ?(음식|요리)/i,(c,n)=>['padthai','curry','mangorice'][n%3],'eat',['맛있다!']],
 [/베트남 ?(음식|요리)/i,(c,n)=>['bowl','banhmi'][n%2],'eat',['맛있다!']],
 [/인도 ?(음식|요리)/i,['naan','curry'],'eat',['맛있다!']],
 [/멕시코 ?(음식|요리)/i,['taco'],'eat',['올레!']],
 [/소시지|소세지|부어스트|wurst|핫도그/i,['sausage'],'eat',['맛있다!','이 맛이지!']],
 [/프레첼|브레첼|pretzel/i,['pretzel'],'eat',['쫄깃해!']],
 [/슈니첼|학센|돈까스|돈카츠|커틀릿|schnitzel/i,['schnitzel'],'eat',['바삭바삭!']],
 [/스테이크|steak|립아이|티본/i,['steak'],'eat',['육즙 최고!','맛있다!']],
 [/파스타|스파게티|라자냐|뇨끼|리조또|pasta/i,['pasta'],'eat',['본고장의 맛!','맛있다!']],
 [/피자|pizza/i,['pizza'],'eat',['한 조각 더!']],
 [/버거|burger/i,['burger'],'eat',['한입 가득!']],
 [/스시|초밥|사시미|오마카세|회전초밥|sushi/i,['sushi'],'eat',['입에서 녹아!']],
 [/라멘|라면|우동|소바|국수|쌀국수|짬뽕|짜장|탄탄|pho|ramen/i,['bowl'],'eat',['후루룩!','국물이 끝내줘!']],
 [/카레|커리|curry/i,['curry'],'eat',['맛있다!']],
 [/만두|딤섬|샤오롱|교자|dumpling/i,['dumpling'],'eat',['육즙 팡!']],
 [/타코|부리토|부리또|나초|taco/i,['taco'],'eat',['올레!']],
 [/피시\s?앤\s?칩스|피쉬\s?앤\s?칩스|fish ?(and|&|n) ?chips/i,['fishchips'],'eat',['바삭바삭!']],
 [/파에야|빠에야|paella/i,['paella'],'eat',['맛있다!']],
 [/케밥|되너|kebab|d[oö]ner/i,['kebab'],'eat',['든든해!']],
 [/비빔밥|한식|백반|한정식/i,['bibimbap'],'eat',['역시 한식!']],
 [/치킨|닭갈비|닭꼬치|야키토리|chicken/i,['chicken'],'eat',['바삭바삭!']],
 [/고기|바베큐|바비큐|bbq|삼겹|갈비|야키니쿠|불고기|곱창|구이/i,['grill'],'eat',['지글지글!','고기는 진리!']],
 [/해산물|랍스터|로브스터|대게|킹크랩|새우|굴 |조개|씨푸드|seafood|횟집/i,['seafood'],'eat',['싱싱해!']],
 [/조식|아침 ?식사|아침밥|브런치|breakfast|brunch/i,['breakfast'],'eat',['든든한 아침!']],
 [/아이스크림|젤라또|젤라토|빙수|gelato/i,['icecream'],'eat',['달콤해!']],
 [/케이크|케익|디저트|마카롱|타르트|와플|크레페|초콜릿|cake|dessert/i,['cake'],'eat',['달콤해!']],
 [/빵|베이커리|크루아상|크로와상|bakery/i,['bread'],'eat',['갓 구운 빵!']],
 [/카페|커피|티타임|찻집|cafe|coffee/i,['cup'],'eat',['한 잔의 여유','향 좋다~']],
 [/와인|와이너리|샴페인|wine/i,['wine'],'cheer',['짠!']],
 [/칵테일|루프탑 바|재즈바|cocktail/i,['cocktail'],'cheer',['짠!']],
 [/맥주|비어|펍|이자카야|호프|브루어리|beer|pub/i,['beer'],'cheer',['짠!','캬~']],
 // 무엇을 먹는지 모르는 식사: 아래 foodFor 가 나라에 맞는 음식을 고른다
 [/맛집|식당|저녁|점심|아침|레스토랑|식사|먹|밥|야시장|푸드|restaurant|dinner|lunch/i,null,'eat',['맛있다!','배부르다~','이 집 잘하네!','또 오자!']],
 // 베를린 · 프라하 · 드레스덴
 [/브란덴부르크|brandenburg/i,['brandenburg'],'pose',['찰칵!','베를린이다!']],
 [/장벽|이스트 ?사이드|east ?side|mauer|berlin ?wall|베르나우어/i,['berlinwall'],'pose',['역사가 느껴져…','찰칵!']],
 [/체크포인트|찰리 ?검문소|checkpoint/i,['checkpoint'],'pose',['찰칵!']],
 [/tv ?타워|티비 ?타워|텔레비전 ?탑|fernsehturm|알렉산더 ?광장|alexanderplatz/i,['fernsehturm'],'pose',['높다!','다 보인다!']],
 [/국회 ?의사당|라이히스탁|reichstag|분데스탁/i,['reichstag'],'pose',['돔 위로 가자!']],
 [/프라하 ?성|성 ?비투스|비투스|흐라트차니|hrad|prague ?castle/i,['pragcastle'],'pose',['동화 속 같아!','찰칵!']],
 [/카를 ?교|까를 ?교|카렐 ?교|charles ?bridge|karl[uů]v/i,['charlesbridge'],'pose',['경치 좋다!','찰칵!']],
 [/천문 ?시계|오를로이|orloj|구시청사/i,['orloj'],'pose',['정각이다!','인형 나온다!']],
 [/틴 ?성당|틴 ?교회|t[yý]n/i,['tyn'],'pose',['뾰족뾰족!']],
 [/성모 ?교회|프라우엔|frauenkirche/i,['frauenkirche'],'pose',['웅장하다…','찰칵!']],
 [/츠빙거|쯔빙거|zwinger/i,['zwinger'],'pose',['화려하다!','찰칵!']],
 [/젬퍼|잼퍼|semper|오페라 ?하우스.*드레스덴|드레스덴.*오페라/i,['semperoper'],'cheer',['브라보!','찰칵!']],
 [/베를린 ?돔|베를린 ?대성당|berliner ?dom/i,['berlindom'],'pose',['찰칵!','돔이 크다!']],
 [/전승 ?기념탑|승전 ?기념탑|지게스조일레|siegess/i,['siegessaeule'],'pose',['금빛 천사다!']],
 [/샤를로텐|샬로텐|charlottenburg/i,['charlottenburg'],'pose',['찰칵!','궁전이다!']],
 [/댄싱 ?하우스|춤추는 ?집|dancing ?house|tan[cč][ií]c/i,['dancinghouse'],'pose',['건물이 춤춘다!']],
 [/화약탑|화약 ?문|powder ?tower|pra[sš]n/i,['powdertower'],'pose',['찰칵!']],
 [/군주의 ?행렬|퓌르스텐|f[uü]rstenzug/i,['fuerstenzug'],'pose',['엄청 길다!']],
 [/문화 ?과학 ?궁전|문화궁전|pkin|pa[lł]ac kultury/i,['pkin'],'pose',['높다!']],
 [/바르샤바 ?왕궁|왕궁 ?광장|구시가.*바르샤바|바르샤바.*구시가|zamek kr[oó]lewski|지그문트/i,['warsawcastle'],'pose',['찰칵!']],
 [/슈트리첼|striezel|대관람차|관람차|ferris/i,['xferris'],'cheer',['높다!','반짝반짝!']],
 // 나라별 랜드마크
 [/빅 ?벤|big ?ben|국회의사당.*런던|웨스트민스터/i,['bigben'],'pose',['찰칵!','런던이다!']],
 [/런던 ?아이|london ?eye/i,['ferris'],'cheer',['높다!']],
 [/콜로세움|colosseo|colosseum/i,['colosseum'],'pose',['찰칵!','웅장하다!']],
 [/피사|pisa/i,['pisa'],'pose',['기울었다!']],
 [/개선문|arc de triomphe/i,['arc'],'pose',['찰칵!']],
 [/풍차|잔세스칸스|킨더다이크|windmill/i,['windmill'],'pose',['찰칵!']],
 [/사그라다|가우디|sagrada/i,['sagrada'],'pose',['우와…']],
 [/파르테논|아크로폴리스|parthenon|acropolis/i,['parthenon'],'pose',['찰칵!']],
 [/타지 ?마할|taj/i,['taj'],'pose',['아름답다…']],
 [/모스크|아야 ?소피아|블루 ?모스크|mosque/i,['mosque'],'pose',['찰칵!']],
 [/부르즈|burj/i,['burj'],'pose',['엄청 높다!']],
 [/바실리|붉은 ?광장|크렘린|kremlin/i,['onion'],'pose',['찰칵!']],
 [/자유의 ?여신|liberty/i,['liberty'],'pose',['찰칵!']],
 [/금문교|골든 ?게이트|golden ?gate/i,['goldengate'],'pose',['찰칵!']],
 [/오페라 ?하우스|opera ?house/i,['opera'],'pose',['찰칵!']],
 [/피라미드|기자|pyramid/i,['pyramid'],'pose',['신비롭다…']],
 [/예수상|코르코바도|corcovado/i,['christ'],'pose',['찰칵!']],
 [/마리나 ?베이|marina ?bay/i,['marina'],'pose',['찰칵!']],
 [/페트로나스|petronas|트윈 ?타워/i,['petronas'],'pose',['찰칵!']],
 [/경복궁|창덕궁|덕수궁|창경궁|한옥|고궁/i,['hanok'],'pose',['찰칵!','고즈넉하다']],
 [/오사카성|히메지|나고야성|구마모토성|천수각/i,['japancastle'],'pose',['찰칵!']],
 [/만리장성|great ?wall/i,['greatwall'],'cheer',['길다!']],
 [/타이베이 ?101|taipei ?101/i,['taipei101'],'pose',['찰칵!']],
 [/앙코르|왓 ?아룬|왓 ?포|왓 ?프라깨우|왕궁.*방콕|방콕.*왕궁/i,['stupa'],'pose',['반짝반짝!']],
 [/천문 ?시계|시계탑|clock ?tower|orloj/i,['clocktower'],'pose',['정각이다!']],
 [/체르마트|그린델발트|샬레|chalet/i,['chalet'],'relax',['그림 같아…']],
 // 볼거리
 [/에펠/i,['eiffel'],'pose',['찰칵!','진짜 에펠탑이다!']],
 [/개선문|(^|\s)문(\s|$)|게이트|gate|tor$/i,['gate'],'pose',['찰칵!','웅장하다!']],
 [/신사|도리이|이나리|shrine/i,['torii'],'pose',['찰칵!']],
 [/사원|사찰|(^|\s)절(\s|$)|왓 |파고다|temple/i,(c,n)=>/^(TH|KH|LA|MM|LK|ID|NP)$/.test(c)?'stupa':/^(TR|AE|SA|EG|MA|PK|BD)$/.test(c)?'mosque':c==='IN'?'taj':'pagoda','pose',['찰칵!','고즈넉하다']],
 [/성당|교회|대성당|돔 |cathedral|church|dom$|basilica/i,['church'],'pose',['찰칵!','우와, 높다!']],
 [/성$|성 |성곽|궁전|궁$|캐슬|castle|schloss|palace|ch[aâ]teau/i,['castle'],'pose',['찰칵!','동화 속 같아!']],
 [/다리|브리지|브릿지|bridge|br[uü]cke/i,['bridge'],'pose',['찰칵!','경치 좋다!']],
 [/유람선|크루즈|보트|페리|곤돌라|cruise|boat|ferry/i,['boat'],'wave',['출항!','바람 좋다~']],
 [/등산|하이킹|트레킹|알프스|융프라우|후지산|산맥|전망대 등반|hiking/i,['mountain'],'cheer',['야호!','정상이다!']],
 [/야경|나이트|밤 ?풍경|night ?view/i,['skyline'],'cheer',['반짝반짝!','야경 최고!']],
 [/전망|타워|스카이|루프탑|tower|view/i,['tower'],'pose',['찰칵!','다 보인다!']],
 [/박물관|미술관|갤러리|전시|기념관|museum|gallery/i,['museum'],'relax',['오…','멋지다…']],
 [/분수|fountain/i,['fountain'],'pose',['찰칵!']],
 [/광장|동상|기념비|기념탑|구시가|올드타운|square|platz/i,['statue','fountain'],'pose',['찰칵!','여기가 중심이구나']],
 [/동물원|사파리|zoo/i,['zoo'],'cheer',['기린이다!']],
 [/수족관|아쿠아리움|aquarium/i,['aquarium'],'cheer',['물고기다!']],
 [/공연|콘서트|뮤지컬|오페라|극장|라이브|concert|musical|opera/i,['concert'],'cheer',['브라보!']],
 [/경기|축구|야구|농구|스타디움|직관|stadium/i,['stadium'],'cheer',['골!','가자!']],
 [/불꽃|축제|페스티벌|퍼레이드|일루미|festival/i,['fireworks'],'cheer',['우와아!']],
 [/놀이공원|테마파크|디즈니|유니버설|롯데월드|에버랜드|관람차/i,['ferris'],'cheer',['한 번 더 타자!']],
 [/온천|스파|사우나|찜질|onsen/i,['onsen'],'relax',['아, 좋다…']],
 [/해변|바다|비치|해수욕|섬 |beach/i,['parasol'],'cheer',['바다다!']],
 [/쇼핑|아울렛|백화점|시장|마켓|돈키|면세|기념품|market|shopping/i,['bag','stall'],'cheer',['이건 사야 해!','득템!']],
 [/공원|정원|숲|산책|호수|피크닉|park|garden/i,['park'],'relax',['공기 좋다','여유롭다~']],
 [/숙소|호텔|체크인|체크아웃|료칸|게스트하우스|에어비앤비|호스텔|hotel/i,['hotel'],'sleep',['오늘도 수고했어','푹 쉬자']],
 [/공항|항공|비행|flight/i,['plane'],'wave',['도착!','드디어 왔다!']],
 [/역$|역 |열차|기차|버스|지하철|이동|렌터카|station/i,['train'],'wave',['가자!']],
 [/사진|스냅|포토|투어|구경|관광|시내|자유 ?(시간|일정)|올드 ?타운|구시가/i,(c,n)=>sightFor(c,n),'pose',['찰칵!','여기 좋다!']]
];
// 무엇을 먹는지 안 적힌 식사는 그 나라에서 흔히 먹는 음식으로. 모르는 나라는 평범한 그릇.
const FOOD_BY_COUNTRY={DE:['sausage','schnitzel','pretzel','steak'],AT:['schnitzel','sausage','cake'],CH:['fondue','schnitzel','chocolate','steak'],IT:['pasta','pizza','espresso','steak'],FR:['steak','bread','macaron','pasta'],ES:['paella','tapas','churros','steak'],PT:['seafood','nata','steak'],
 GB:['fishchips','tea','steak','burger'],IE:['fishchips','steak'],US:['burger','steak','hotdog','donut','pizza'],CA:['poutine','burger','steak'],AU:['meatpie','steak','seafood'],NZ:['meatpie','steak','seafood'],CZ:['goulash','sausage','schnitzel','trdelnik'],PL:['dumpling','sausage','schnitzel'],HU:['goulash','sausage'],
 NL:['cheese','fishchips','steak'],BE:['waffle','fishchips','chocolate'],GR:['kebab','seafood'],TR:['kebab','baklava','tea','grill'],MX:['taco','grill'],JP:['bowl','sushi','takoyaki','grill','onigiri','curry'],KR:['bibimbap','grill','tteokbokki','chicken','kimbap'],CN:['dumpling','pekingduck','hotpot','bowl'],TW:['dumpling','bubbletea','bowl'],HK:['dumpling','bowl','tea'],
 TH:['padthai','curry','mangorice','bowl'],VN:['bowl','banhmi','seafood'],IN:['curry','naan'],SG:['seafood','friedrice','satay'],MY:['satay','friedrice','curry'],ID:['friedrice','satay'],PH:['grill','seafood'],
 AE:['kebab','grill'],SA:['kebab','grill'],EG:['kebab','bread'],MA:['kebab','tea'],RU:['dumpling','bread'],SE:['bread','seafood'],NO:['seafood'],DK:['bread','hotdog'],FI:['seafood','bread'],IS:['seafood','hotdog'],HR:['seafood','pasta'],RO:['goulash','sausage'],UA:['dumpling','bread'],
 BR:['grill','steak'],AR:['steak','grill'],PE:['seafood'],CL:['seafood','steak'],ZA:['grill','steak'],KE:['grill'],TZ:['grill'],KH:['bowl','curry'],LA:['bowl'],MM:['curry','bowl'],NP:['dumpling','curry'],LK:['curry'],BD:['curry'],PK:['curry','kebab'],IL:['kebab','bread']};
// 관광 일정이 어디인지 특정되지 않으면 그 나라를 대표하는 건물로
const SIGHT_BY_COUNTRY={JP:['torii','japancastle','pagoda'],KR:['hanok','tower'],CN:['greatwall','pagoda'],TW:['taipei101','pagoda'],HK:['skyline','boat'],TH:['stupa'],KH:['stupa'],LA:['stupa'],MM:['stupa'],VN:['pagoda','boat'],SG:['marina','skyline'],MY:['petronas','mosque'],ID:['stupa','parasol'],PH:['church','parasol'],
 US:['liberty','skyline','goldengate'],CA:['mountain','skyline'],GB:['bigben','castle'],IE:['castle','church'],FR:['eiffel','arc','museum'],IT:['colosseum','pisa','church'],ES:['sagrada','church'],PT:['church','bridge'],DE:['brandenburg','fernsehturm','frauenkirche','castle'],AT:['castle','church'],CH:['chalet','mountain'],NL:['windmill','bridge'],BE:['church','museum'],
 GR:['parthenon','church'],CZ:['pragcastle','charlesbridge','orloj','tyn'],PL:['church','castle'],HU:['castle','bridge'],HR:['castle','boat'],TR:['mosque','tower'],AE:['burj','mosque'],SA:['mosque'],EG:['pyramid'],MA:['mosque'],IN:['taj','mosque'],RU:['onion'],AU:['opera','parasol'],NZ:['mountain'],MX:['pyramid','church'],BR:['christ','parasol'],PE:['mountain'],NP:['mountain','stupa'],LK:['stupa']};
// 도시 이름이 보이면 그 도시의 대표 건물을 차례로 보여 준다
const CITY_SIGHTS=[[/베를린|berlin/i,['brandenburg','fernsehturm','berlinwall','berlindom','reichstag','siegessaeule']],[/프라하|praha|prague/i,['pragcastle','charlesbridge','orloj','tyn','powdertower','dancinghouse']],[/드레스덴|dresden/i,['frauenkirche','zwinger','semperoper','fuerstenzug']],[/바르샤바|warszawa|warsaw/i,['warsawcastle','pkin']]];
// 크리스마스 마켓은 도시마다 다르게: 드레스덴은 대관람차·피라미드부터
const CITY_XMAS=[[/드레스덴|dresden/i,['xferris','xpyramid','stall','gluhwein','tree']],[/베를린|berlin/i,['tree','xpyramid','gluhwein','xferris','santa']],[/프라하|praha|prague/i,['tree','stall','santa','gluhwein']],[/바르샤바|warszawa|warsaw/i,['tree','xferris','stall']]];
function sightFor(country,n){const list=SIGHT_BY_COUNTRY[country]||['camera'];return list[n%list.length];}
const WESTERN=['steak','pasta','pizza','burger'],WEST=/^(SE|NO|DK|FI|IS|LU|SK|SI|HR|RO|BG|RS|EE|LV|LT|MT|CY|BR|AR|CL|ZA)$/;
function foodFor(country,n){const list=FOOD_BY_COUNTRY[country]||(WEST.test(country)?WESTERN:['dish']);return list[n%list.length];}
/** seen: 같은 규칙이 지금까지 몇 번 나왔는지(여행 하나를 재생하는 동안 유지) */
export function reactionFor(e,country='',seen=new Map()){const text=[e.title,e.place,e.note].filter(Boolean).join(' ');
 let i=RULES.findIndex(r=>r[0].test(text));
 if(i<0&&e.kind==='food')i=RULES.findIndex(r=>r[1]===null);
 if(i<0&&e.kind==='hotel')return {key:'hotel',act:'sleep',say:'오늘도 수고했어'};
 if(i<0&&e.kind==='move')return {key:'train',act:'wave',say:'가자!'};
 const city=CITY_SIGHTS.find(c=>c[0].test(text+' '+(e.city||'')));
 if(i<0&&city){const k='city:'+city[1][0],m=seen.get(k)||0;seen.set(k,m+1);return {key:city[1][m%city[1].length],act:'pose',say:['찰칵!','여기 좋다!'][m%2],generic:true};}
 if(i<0){const k='sight:'+country,m=seen.get(k)||0;seen.set(k,m+1);const key=SIGHT_BY_COUNTRY[country]?sightFor(country,m):'pin';return {key,act:'pose',say:['찰칵!','여기 좋다!'][m%2],generic:true};}
 if(Array.isArray(RULES[i][1])&&RULES[i][1].includes('tree')&&RULES[i][1].includes('stall')){const cx=CITY_XMAS.find(c=>c[0].test(text+' '+(e.city||'')));
  if(cx){const k='xmas:'+cx[1][0],m=seen.get(k)||0;seen.set(k,m+1);return {key:cx[1][m%cx[1].length],act:'cheer',say:['반짝반짝!','메리 크리스마스!','구경하자!','따뜻해~'][m%4]};}}
 const [,keys,act,says]=RULES[i],n=seen.get(i)||0;seen.set(i,n+1);
 if(typeof keys==='function')return {key:keys(country,n),act,say:says[n%says.length]};
 if(keys)return {key:keys[n%keys.length],act,say:says[n%says.length]};
 const fk='food:'+country,m=seen.get(fk)||0;seen.set(fk,m+1); // 나라별로 차례를 따로 센다
 return {key:foodFor(country,m),act,say:says[n%says.length]};}
// ---------- 이동 일정 글자 분석 ----------
// "인천출발바르샤바도착", "인천 → 바르샤바", "인천에서 바르샤바로", "ICN-WAW LO098", "바르샤바행 비행기" 등을 출발지·도착지로 나눈다.
const GROUND=/기차|열차|ICE|\bEC\b|\bIC\b|레일|철도|버스|플릭스|flix|트램|지하철|메트로|택시|우버|볼트|도보|걸어|렌트|렌터카|자차|운전|차로|페리|배로|train|bus|tram|metro|taxi|walk|drive/i;
const AIRWORD=/항공|비행|✈|🛫|🛬|flight|탑승|기내|에어|air(?:line|port)?|lot\b|대한항공|아시아나|루프트한자/i;
const FLIGHT_NO=/(?:^|[^A-Za-z])([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?\d{2,4}(?![\d:])/; // KE905, LO 098, 7C1301
const NOT_PLACE=/호텔|숙소|에어비앤비|airbnb|집|역$|중앙역|hbf|버스 ?터미널|정류장/i;
const AIRPORT_CODE={ICN:'인천',GMP:'김포',PUS:'부산',CJU:'제주',WAW:'바르샤바',BER:'베를린',PRG:'프라하',DRS:'드레스덴',FRA:'프랑크푸르트',MUC:'뮌헨',VIE:'빈',BUD:'부다페스트',CDG:'파리',LHR:'런던',FCO:'로마',AMS:'암스테르담',NRT:'도쿄',HND:'도쿄',KIX:'오사카',HKG:'홍콩',TPE:'타이베이',BKK:'방콕',SIN:'싱가포르',DXB:'두바이',IST:'이스탄불',HEL:'헬싱키',ZRH:'취리히',BCN:'바르셀로나',MAD:'마드리드',LIS:'리스본',JFK:'뉴욕',LAX:'로스앤젤레스'};
const cleanCity=v=>String(v||'')
 .replace(/\d{1,2}[:시]\d{0,2}\s*(?:분)?/g,' ')                         // 시각
 .replace(FLIGHT_NO,' ')
 .replace(/[()\[\]{}<>「」『』"'“”]/g,' ')
 .replace(/(?:국제)?공항|제?\s?[12]\s?(?:여객)?터미널|T[12]\b|airport|int'?l/gi,' ')
 .replace(/항공편|비행편|비행기|항공|직항|경유|탑승|출국|입국|편$|행$|에서$|으로$|로$|에$|까지$|부터$/g,' ')
 .replace(/귀국|출국|입국|여행|이동|첫날|마지막 ?날|돌아가기|돌아오기|기차|열차|버스|플릭스버스|대한항공|아시아나|LOT|루프트한자|에어|항공사/gi,' ')
 .replace(/[✈🛫🛬·,]/g,' ').replace(/\s+/g,' ').trim();
// "바르샤바 쇼팽공항" → "바르샤바": 공항 이름이 붙어 있으면 앞의 도시만 쓴다
const sideCity=v=>{const c=cleanCity(v);return /공항|airport/i.test(v)&&c.includes(' ')?c.split(' ')[0]:c;};
const codeCity=v=>{const m=/^\s*([A-Z]{3})\s*$/.exec(v);return m&&AIRPORT_CODE[m[1]]?AIRPORT_CODE[m[1]]:v;};
export function parseRoute(title){const raw=String(title||''),t=raw.replace(/\d{1,2}:\d{2}\s*[~\-–]\s*\d{1,2}:\d{2}/g,' ').replace(new RegExp(FLIGHT_NO.source,'g'),' ').replace(/대한항공|아시아나|LOT 폴란드항공|루프트한자|[✈🛫🛬]/g,' ').replace(/\s+/g,' ').trim();let m,A='',B='';
 if((m=/^(.*?)\s*(?:에서)?\s*출발\s*[,·\-→>]*\s*(.+?)\s*(?:에|으로|로)?\s*도착/.exec(t)))[A,B]=[m[1],m[2]];       // 인천출발바르샤바도착
 else if((m=/^(.*?)\s*(?:→|->|➜|➡|⇒|〜|~|>)\s*(.+)$/.exec(t))){A=m[1];B=m[2].split(/→|->|➜|➡|⇒|〜|~|>/).at(-1);} // 인천 → 바르샤바
 else if((m=/\b([A-Z]{3})\s*[-–—\/]\s*([A-Z]{3})\b/.exec(t)))[A,B]=[m[1],m[2]];                               // ICN-WAW
 else if((m=/^(.*?)에서\s*(.+?)(?:으로|로|까지)(?:\s|$)/.exec(t)))[A,B]=[m[1],m[2]];                            // 인천에서 바르샤바로
 else if((m=/^([가-힣A-Za-z]{2,}(?:\s?공항)?)\s*[-–—]\s*([가-힣A-Za-z]{2,}(?:\s?공항)?)(?:\s|$)/.exec(t)))[A,B]=[m[1],m[2]]; // 인천-바르샤바
 else if((m=/([가-힣A-Za-z]{2,}?)\s?행(?:\s|$|비행|항공)/.exec(t)))B=m[1];                                      // 바르샤바행
 else if((m=/^(.*?)\s*도착/.exec(t))&&AIRWORD.test(t))B=m[1];                                                    // 바르샤바 도착(항공)
 const air=AIRWORD.test(raw)||FLIGHT_NO.test(raw);
 if(!A&&!B&&air)B=t; // "대한항공 KE905 프랑크푸르트": 남은 글자가 도착지
 A=codeCity(sideCity(A));B=codeCity(sideCity(B));
 return {from:A,to:B,ground:GROUND.test(raw),air,notPlace:NOT_PLACE.test(A)||NOT_PLACE.test(B)};}
// 비행 판단: 'plane'(확실) · 'maybe'(출발·도착 도시만 있음 → 좌표를 찾은 뒤 거리로 결정) · ''(아님)
// '공항 이동', '공항 체크인'처럼 한 곳만 있는 일정은 비행이 아니다.
function flightKind(e){if(e.kind==='flight')return 'plane';const t=String(e.title||''),r=parseRoute(t);
 if(r.ground||r.notPlace)return '';
 if(!r.to||(r.from&&r.from===r.to))return '';
 if(!r.from)return r.air&&!/이동|가기|가는|체크인|수속|심사|리무진|셔틀|마중|픽업/.test(t)?'plane':'';
 return r.air?'plane':'maybe';}
const isFlight=e=>flightKind(e)==='plane';
function flightEnds(e,doc){const b=e.bookingId&&(doc.bookings||[]).find(x=>x.id===e.bookingId);
 if(b?.origin&&b?.destination)return [codeCity(cleanCity(b.origin)),codeCity(cleanCity(b.destination))];
 const r=parseRoute(e.title);return [r.from,r.to||cleanCity(e.place||'')];}
function retime(tl){const fast=tl.mode==='trip';let acc=0;
 for(const s of tl.segs){s.dur=s.type==='end'?4:s.type==='dwell'?(fast?1.1:2.2)+(s.flag?1.1:0):s.plane?(fast?3.2:4.2):s.jump?(fast?2:2.8):(fast?.6:1.4)*(1+Math.min(1.6,(s.px||0)/900));s.start=acc;acc+=s.dur;}tl.total=acc;return tl;}
export function buildTimeline(mode){const a=api(),doc=a.activeDoc?.()||{},trip=a.getTrip?.()||{};
 const dates=(doc.days||[]).map(d=>d.date).filter(Boolean).sort();
 const want=mode==='trip'?dates:[a.getActiveDate?.()||dates[0]];
 const stops=[],seen=new Map();
 if(mode==='trip')stops.push({title:'출발!',time:'',date:want[0],dayIdx:0,firstOfDay:false,via:'walk',home:true,react:{key:'house',act:'wave',say:'다녀오겠습니다!'}});
 want.forEach(date=>{const day=(doc.days||[]).find(d=>d.date===date);if(!day)return;
  const events=[...(a.activeDayEvents?.(day)||day.events||[])].sort((p,q)=>String(p.start).localeCompare(String(q.start)));
  const country=a.dayCountry?.(day)||day.countryCode||trip.country_code||doc.meta?.countryCode||'';
  events.forEach((e,k)=>{const fk=flightKind(e),fly=!!fk,ends=fly?flightEnds(e,doc):null;
   stops.push({country:String(country||'').toUpperCase(),costume:costumeKind(country),title:String(e.title||e.place||'일정'),time:String(e.start||''),date,dayIdx:dates.indexOf(date),firstOfDay:k===0,via:fk==='plane'?'plane':fk==='maybe'?'maybe':'walk',
    q:fly?(ends[1]||String(e.place||'')):String(e.place||parseRoute(e.title).to||e.title||''),fromQ:fly?ends[0]:'',placeQ:String(e.place||''),ground:/버스|플릭스|flix|bus|셔틀|리무진|코치|coach/i.test(String(e.title||''))?'bus':'train',local:!fly,react:fly?{key:'airport',act:'wave',say:'도착!'}:reactionFor({...e,city:[day.title,day.city].filter(Boolean).join(' ')},String(country||'').toUpperCase(),seen)});});});
 const places=stops.length-(mode==='trip'?1:0);
 if(mode==='trip'&&places>0)stops.push({title:'집 도착',time:'',date:want.at(-1),dayIdx:dates.indexOf(want.at(-1)),firstOfDay:false,via:'walk',home:true,react:{key:'house',act:'cheer',say:'다녀왔습니다!'}});
 const hr=v=>{const m=/^(\d{1,2}):(\d{2})/.exec(v||'');return m?Number(m[1])+Number(m[2])/60:null;};
 stops.forEach(s=>{s.hour=hr(s.time);});
 for(let i=0;i<stops.length;i++)if(stops[i].hour==null){const prev=stops.slice(0,i).reverse().find(x=>x.hour!=null&&x.date===stops[i].date),next=stops.slice(i+1).find(x=>x.hour!=null&&x.date===stops[i].date);
  stops[i].hour=stops[i].home&&i===0?(next?Math.max(6,next.hour-1.5):9):prev?Math.min(23.5,prev.hour+1.5):next?Math.max(6,next.hour-1):12;}
 const segs=[];
 stops.forEach((s,i)=>{if(i>0)segs.push({type:'move',from:i-1,to:i,plane:s.via==='plane',jump:s.via==='plane'});segs.push({type:'dwell',i});});
 if(mode==='trip'&&places>0)segs.push({type:'end',i:stops.length-1});
 return retime({mode,map:false,stops,segs,total:0,places,days:want.length,title:String(trip.title||trip.destination||'우리 여행'),group:doc.meta?.groupType||'friends'});}

/** 관리자용: 여행 문서들에서 전용 3D가 없어 '도시·나라 대표 건물'로 대신 나오는 장소 이름을 모은다. */
export function unknownPlaces(docs){const out=new Map();
 for(const doc of docs||[])for(const day of doc?.days||[])for(const e of day.events||[]){if(!e||flightKind(e)||['food','hotel','move','flight'].includes(e.kind))continue;
  const r=reactionFor({...e,city:day.title||''},String(day.countryCode||doc.meta?.countryCode||'').toUpperCase(),new Map());if(!r.generic)continue;
  const name=String(e.place||e.title||'').trim().slice(0,40);if(name.length<2)continue;out.set(name,(out.get(name)||0)+1);}
 return [...out].sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}));}
if(typeof window!=='undefined')window.__tripkkuPlaces=unknownPlaces;

/* ---------- 장소 좌표 찾기 ---------- */
const GEO_URL='https://nominatim.openstreetmap.org/search';
const geoKey=q=>String(q).trim().toLowerCase().slice(0,80);
async function geocode(q,box){const params={format:'jsonv2',limit:'1','accept-language':'ko',q};if(box){params.viewbox=box.join(',');params.bounded='0';}
 const r=await fetch(GEO_URL+'?'+new URLSearchParams(params),{referrerPolicy:'origin',headers:{Accept:'application/json'}});if(!r.ok)throw new Error('geocode '+r.status);
 const hit=(await r.json())[0];if(!hit)return null;return {lat:Number(hit.lat),lon:Number(hit.lon),box:(hit.boundingbox||[]).map(Number)};}
const merc=(lat,lon)=>({mx:(lon+180)/360,my:(1-Math.asinh(Math.tan(lat*PI/180))/PI)/2});
const kmApart=(a,b)=>{const R=6371,dLat=(b[0]-a[0])*PI/180,dLon=(b[1]-a[1])*PI/180,h=Math.sin(dLat/2)**2+Math.cos(a[0]*PI/180)*Math.cos(b[0]*PI/180)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
const apart=(A,B)=>Math.hypot(A.mx-B.mx,A.my-B.my);
const Z_NEAR=14,Z_CLOSE=16.6; // 머무는 장면의 확대 범위(동네 ~ 골목)
export async function locate(tl,onProgress){const a=api(),doc=a.activeDoc?.()||{},trip=a.getTrip?.()||{};
 const known={...(doc.geo||{})},fresh={};const dest=String(trip.destination||'').split(/[·,/]/)[0].trim();
 const need=[];const add=(q,local)=>{if(q&&!(geoKey(q) in known)&&!need.some(n=>geoKey(n.q)===geoKey(q)))need.push({q,local});};
 for(const s of tl.stops){add(s.fromQ,false);add(s.q,s.local);}
 let last=0;const wait=async()=>{const d=1100-(Date.now()-last);if(d>0)await new Promise(r=>setTimeout(r,d));last=Date.now();}; // 초당 1회 제한
 let box=null,center=null;
 if(need.some(n=>n.local)&&dest){try{await wait();const d=await geocode(dest);if(d){center=[d.lat,d.lon];if(d.box.length===4){const [s,n,w,e]=d.box,py=Math.max(.3,n-s),px=Math.max(.3,e-w);box=[w-px,n+py,e+px,s-py];}}}catch{}}
 let done=0;
 for(const n of need){onProgress?.(++done,need.length);
  try{await wait();let hit=await geocode(n.q,n.local?box:null);
   const far=h=>h&&n.local&&center&&kmApart(center,[h.lat,h.lon])>400; // 같은 이름의 엉뚱한 나라 결과는 버린다
   if((!hit||far(hit))&&n.local&&dest){await wait();hit=await geocode(n.q+' '+dest);if(far(hit))hit=null;}
   fresh[geoKey(n.q)]=hit?[Number(hit.lat.toFixed(5)),Number(hit.lon.toFixed(5))]:0;
  }catch{break;}}
 Object.assign(known,fresh);
 if(Object.keys(fresh).length&&a.saveTrip)a.saveTrip(d=>{d.geo={...(d.geo||{}),...fresh};},'장소 위치를 지도에 표시했어요.').catch(()=>{});
 const ll=q=>{const v=q?known[geoKey(q)]:null;return Array.isArray(v)?v:null;};
 const S=tl.stops;for(const s of S){s.ll=ll(s.q);s.fromLL=ll(s.fromQ);}
 // 출발·도착 도시만 적힌 이동: 600km 넘게 떨어져 있으면 비행, 아니면 지상 이동
 S.forEach((s,i)=>{if(s.via!=='maybe')return;const far=s.ll&&s.fromLL&&kmApart(s.fromLL,s.ll)>600;s.via=far?'plane':'walk';if(!far){s.fromLL=null;s.react={key:'train',act:'wave',say:'도착!'};}
  const g=tl.segs.find(x=>x.type==='move'&&x.to===i);if(g){g.plane=far;g.jump=far;}});
 const home=S.find(s=>s.via==='plane'&&s.fromLL)?.fromLL||null;for(const s of S)if(s.home&&home)s.ll=home;
 for(const s of S)s.tzCountry=s.home?'':s.country||'';
 for(const s of S)if(home&&s.ll&&kmApart(home,s.ll)<80){s.costume='';s.country='';}
 // 나라가 바뀌어 처음 도착한 곳에서는 국기를 한 번 띄운다
 let prevCountry='';for(const s of S){s.flag=s.country&&s.country!==prevCountry?s.country:'';if(s.flag)flagImage(s.flag);prevCountry=s.country||'';}
 for(const g of tl.segs)if(g.type==='dwell')g.flag=!!S[g.i].flag; // 집 근처(출발 공항 포함)에서는 평소 옷
 tl.map=S.some(s=>s.ll);
 if(tl.map){for(let i=1;i<S.length;i++)if(!S[i].ll)S[i].ll=S[i-1].ll;for(let i=S.length-2;i>=0;i--)if(!S[i].ll)S[i].ll=S[i+1].ll;for(const s of S)Object.assign(s,merc(s.ll[0],s.ll[1]));}
 // 장소·날짜마다 해 뜨고 지는 시각
 for(const s of S)if(s.ll&&s.date)s.sun=sunTimes(s.ll[0],s.ll[1],s.date,tzOffset(s.tzCountry,s.date,s.ll[1]));
 else{const step=300/(256*2**14);S.forEach((s,i)=>{s.mx=.5+Math.sin(i*1.15+.5)*step*.6;s.my=.5-i*step;});} // 좌표를 하나도 못 찾으면 지도 없이 줄지어 세운다
 // 가까운 이웃이 화면에 들어오는 선에서 최대한 클로즈업
 S.forEach((s,i)=>{let z=Z_CLOSE;for(const j of [i-1,i+1]){const o=S[j];if(!o)continue;const d=apart(s,o);if(d<1e-9)continue;const f=Math.log2(380/(d*256));if(f>=Z_NEAR)z=Math.min(z,f);}s.z=s.home?Z_NEAR:clamp(z,Z_NEAR,Z_CLOSE);});
 // 같은 곳(150km 안)으로 가는 '비행'은 비행이 아니다: 도착 후의 '인천 도착', '입국' 같은 일정 때문에 비행기를 두 번 타지 않게
 for(const g of tl.segs)if(g.type==='move'&&g.plane){const A=S[g.from],B=S[g.to];if(A.ll&&B.ll&&kmApart(A.ll,B.ll)<150){g.plane=false;g.jump=false;B.via='walk';}}
 // 걸어서 보여 주기엔 먼 구간은 "화면 전환 + 멀리서 본 지도"로 처리
 for(const g of tl.segs)if(g.type==='move'){const A=S[g.from],B=S[g.to],d=apart(A,B),zMin=Math.min(A.z,B.z);g.px=d*256*2**zMin;g.jump=g.plane||g.px>3400;g.zMid=d<1e-9?zMin:clamp(Math.log2(520/(d*256)),1.8,zMin);}
 return retime(tl);}

/* ---------- 그날 날씨: 날짜·도시별로 Open-Meteo 에서 받아 온다(좌표는 여행 장소, 내 위치가 아님) ---------- */
const WX=c=>c==null?'':c<=1?'clear':c<=3?'cloud':c===45||c===48?'fog':c>=95?'storm':(c>=71&&c<=77)||c===85||c===86?'snow':c>=51?'rain':'cloud';
export async function fetchWeather(tl){tl.weather={};if(!tl.map)return;const today=new Date(),iso=d=>d.toISOString().slice(0,10),day=n=>iso(new Date(today.getTime()+n*86400000));
 const groups=new Map();for(const s of tl.stops){if(s.home||!s.ll||!s.date)continue;const k=s.ll[0].toFixed(0)+','+s.ll[1].toFixed(0);let g=groups.get(k);if(!g)groups.set(k,g={ll:s.ll,dates:new Set()});
  if(![...groups.values()].some(o=>o!==g&&o.dates.has(s.date)))g.dates.add(s.date);}
 const jobs=[];for(const g of groups.values()){const dates=[...g.dates].sort(),old=dates.filter(d=>d<day(-60)),near=dates.filter(d=>d>=day(-60)&&d<=day(15));
  const ask=(host,ds)=>{if(!ds.length)return;const q=new URLSearchParams({latitude:g.ll[0],longitude:g.ll[1],daily:'weather_code',timezone:'auto',start_date:ds[0],end_date:ds.at(-1)});
   jobs.push(fetch(host+'?'+q).then(r=>r.ok?r.json():null).then(j=>{(j?.daily?.time||[]).forEach((d,i)=>{if(g.dates.has(d))tl.weather[d]=WX(j.daily.weather_code[i]);});}).catch(()=>{}));};
  ask('https://archive-api.open-meteo.com/v1/archive',old);ask('https://api.open-meteo.com/v1/forecast',near);}
 await Promise.race([Promise.all(jobs),new Promise(r=>setTimeout(r,6000))]);}
// 시각 → 밤(0~1)·노을(0~1)
// 해 뜨고 지는 시각(그 장소의 현지 시각, 대략): NOAA 근사식 + 나라 표준시
const TZ={KR:'Asia/Seoul',JP:'Asia/Tokyo',CN:'Asia/Shanghai',TW:'Asia/Taipei',HK:'Asia/Hong_Kong',TH:'Asia/Bangkok',VN:'Asia/Ho_Chi_Minh',SG:'Asia/Singapore',MY:'Asia/Kuala_Lumpur',ID:'Asia/Jakarta',PH:'Asia/Manila',IN:'Asia/Kolkata',AE:'Asia/Dubai',TR:'Europe/Istanbul',
 GB:'Europe/London',IE:'Europe/Dublin',PT:'Europe/Lisbon',FR:'Europe/Paris',DE:'Europe/Berlin',CZ:'Europe/Prague',PL:'Europe/Warsaw',AT:'Europe/Vienna',CH:'Europe/Zurich',IT:'Europe/Rome',ES:'Europe/Madrid',NL:'Europe/Amsterdam',BE:'Europe/Brussels',HU:'Europe/Budapest',HR:'Europe/Zagreb',GR:'Europe/Athens',FI:'Europe/Helsinki',SE:'Europe/Stockholm',NO:'Europe/Oslo',DK:'Europe/Copenhagen',
 US:'America/New_York',CA:'America/Toronto',MX:'America/Mexico_City',AU:'Australia/Sydney',NZ:'Pacific/Auckland',EG:'Africa/Cairo'};
function tzOffset(country,date,lon){const z=country?TZ[country]:Intl.DateTimeFormat().resolvedOptions().timeZone;
 if(z)try{const d=new Date(date+'T12:00:00Z'),p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:z,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(d).map(x=>[x.type,x.value]));
  return (Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute)-d.getTime())/36e5;}catch{}
 return Math.round(lon/15);} // 모르는 나라(미국 서부 등)는 경도로 대충
export function sunTimes(lat,lon,date,offset){const d=new Date(date+'T12:00:00Z');if(isNaN(d))return null;
 const N=Math.floor((d-Date.UTC(d.getUTCFullYear(),0,1))/864e5)+1,g=2*PI/365*(N-1),R=PI/180;
 const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
 const dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
 const c=Math.cos(90.833*R)/(Math.cos(lat*R)*Math.cos(dec))-Math.tan(lat*R)*Math.tan(dec);
 if(c>1)return {rise:12,set:12};if(c<-1)return {rise:-2,set:26}; // 극야 · 백야
 const ha=Math.acos(c)/R,loc=m=>((m/60+offset)%24+24)%24;return {rise:loc(720-4*(lon+ha)-eq),set:loc(720-4*(lon-ha)-eq)};}
// 머무는 동안의 카메라 연출: 볼거리는 건물 쪽으로 다가가 옆으로 돌며 훑고 → 물러나 기념사진, 식사는 식탁으로 천천히 다가가기, 신나는 곳은 살짝 흔들며 돌기
const XMAS_KEYS=new Set(['tree','santa','stall','snowman','gluhwein','xferris','xpyramid']);
const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
function camMoveAt(act,p){const io=smooth(Math.min(p/.14,(1-p)/.12)); // 들어오고 나갈 때는 기본 구도로
 if(act==='pose'){const a=smooth((p-.08)/.2),b=smooth((p-.34)/.06),c=smooth((p-.74)/.1),k=a*(1-b)+c; // 훑어보기 → 기념사진(물러남) → 반대쪽에서 한 번 더 가까이
  return {yaw:io*((-.5+smooth((p-.1)/.24))*(1-b)+c*(.5-(p-.74)*1.2)),zoom:1-.3*k*io-.08*b*(1-c)*io,low:1-.3*k*io,lx:0,ly:60*k*io,lz:-95*k*io};}
 if(act==='eat')return {yaw:io*Math.sin(p*PI*2)*.18,zoom:1-.3*io,low:1-.12*io,lx:0,ly:-20*io,lz:-50*io};
 if(act==='cheer')return {yaw:io*Math.sin(p*PI*2)*.42,zoom:1-.16*io,low:1-.2*io,lx:0,ly:50*io,lz:-80*io};
 if(act==='relax')return {yaw:io*(-.3+p*.6),zoom:1-.12*io,low:1,lx:0,ly:20*io,lz:-60*io};
 return null;}
function skyAt(h,sun){h=((h%24)+24)%24;const r=sun?.rise??6.5,st=sun?.set??18;
 const night=h<r-.75||h>st+.75?1:h<r+.5?(r+.5-h)/1.25:h>st-.5?(h-(st-.5))/1.25:0,
  dusk=Math.max(0,1-Math.abs(h-st)/1.2)*.9+Math.max(0,1-Math.abs(h-r)/1)*.5;return {night:clamp(night,0,1),dusk:Math.min(1,dusk)};}

/* ---------- 지도 타일과 카메라 ---------- */
const TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILES=new Map();
function tile(z,x,y){const k=z+'/'+x+'/'+y;let e=TILES.get(k);
 if(!e){const img=new Image();img.crossOrigin='anonymous';img.referrerPolicy='origin';e={img,ok:false,done:false};img.onload=()=>{e.ok=true;e.done=true;};img.onerror=()=>{e.done=true;};
  img.src=TILE_URL.replace('{z}',z).replace('{x}',x).replace('{y}',y);TILES.set(k,e);}
 return e;}
// 기울어진 카메라에 보이는 바닥 범위(좌우 XR, 뒤쪽 FAR, 앞쪽 NEAR)를 덮는 타일들
const XR=720,FAR=1500,NEAR=520; // 카메라가 장소 주변을 돌 때도 지도가 비지 않게 넉넉히
function groundTiles(cam,fn){const zi=clamp(Math.floor(cam.z),0,19),k=Math.pow(2,cam.z-zi),n=2**zi,px=cam.cx*256*n,py=cam.cy*256*n;
 for(let ty=Math.floor((py-FAR/k)/256);ty<=Math.floor((py+NEAR/k)/256);ty++){if(ty<0||ty>=n)continue;
  for(let tx=Math.floor((px-XR/k)/256);tx<=Math.floor((px+XR/k)/256);tx++)fn(zi,((tx%n)+n)%n,ty,(tx*256-px)*k,(ty*256-py)*k,256*k,zi+'/'+tx+'/'+ty);}}
/** 시간 t 의 지도 중심·확대. 가까운 이동은 클로즈업을 유지한 채 따라가고, 먼 이동은 A → (전환) → 멀리서 본 지도 → (전환) → B. */
export function cameraAt(tl,t){const tt=clamp(t,0,tl.total-1e-4),seg=tl.segs.find(s=>tt>=s.start&&tt<s.start+s.dur)||tl.segs.at(-1),S=tl.stops;
 if(seg.type!=='move'){const s=S[seg.i];return {seg,p:(tt-seg.start)/seg.dur,cx:s.mx,cy:s.my,z:s.z,fade:0,phase:''};}
 const A=S[seg.from],B=S[seg.to],p=(tt-seg.start)/seg.dur;
 if(!seg.jump){const e=ease(p),zl=A.z+(B.z-A.z)*e; // 걷는 동안 두 장소가 함께 보일 만큼만 살짝 멀어졌다가 다시 가까워진다
  return {seg,p,cx:A.mx+(B.mx-A.mx)*e,cy:A.my+(B.my-A.my)*e,z:zl+(Math.min(seg.zMid??zl,zl)-zl)*Math.sin(PI*p),fade:0,phase:''};}
 if(seg.plane){const T=.26; // 앞뒤 26%: 제자리에서 지도 축소·확대, 가운데: 항로를 따라 이동
  if(p<T){const e=ease(p/T);return {seg,p,cx:A.mx,cy:A.my,z:A.z+(seg.zMid-A.z)*e,fade:0,phase:p<.04?'a':'mid',lift:e,fly:0};}
  if(p>1-T){const e=ease((1-p)/T);return {seg,p,cx:B.mx,cy:B.my,z:B.z+(seg.zMid-B.z)*e,fade:0,phase:p>.96?'b':'mid',lift:e,fly:1};}
  const q=ease((p-T)/(1-2*T));return {seg,p,cx:A.mx+(B.mx-A.mx)*q,cy:A.my+(B.my-A.my)*q,z:seg.zMid,fade:0,phase:'mid',lift:1,fly:q};}
 if(p<.1)return {seg,p,cx:A.mx,cy:A.my,z:A.z,fade:p/.1,phase:'a'};
 if(p>.9)return {seg,p,cx:B.mx,cy:B.my,z:B.z,fade:1-(p-.9)/.1,phase:'b'};
 const q=ease((p-.1)/.8);return {seg,p,cx:A.mx+(B.mx-A.mx)*q,cy:A.my+(B.my-A.my)*q,z:seg.zMid,fade:p<.2?1-(p-.1)/.1:p>.8?(p-.8)/.1:0,phase:'mid'};}
/** 재생에 필요한 타일을 미리 받아 둔다(녹화 중 빈 지도가 찍히지 않게). */
export async function preloadTiles(tl,maxMs=12000){if(!tl.map)return;const asked=new Set();
 for(let t=0;t<=tl.total;t+=.06)groundTiles(cameraAt(tl,t),(z,x,y)=>asked.add(tile(z,x,y)));
 const until=Date.now()+maxMs;while(Date.now()<until&&[...asked].some(e=>!e.done))await new Promise(r=>setTimeout(r,120));}

/** 3D 장면(journey3d.js)에 넘길 한 장면의 상태 */
export function frameAt(tl,t){const cam=cameraAt(tl,t),{seg,p}=cam,S=tl.stops,sc=256*Math.pow(2,cam.z),moving=seg.type==='move',mid=cam.phase==='mid';
 const L=i=>({x:(S[i].mx-cam.cx)*sc,z:(S[i].my-cam.cy)*sc});
 const cur=!moving?seg.i:seg.jump?(cam.phase==='a'?seg.from:seg.to):(p<.5?seg.from:seg.to),stop=S[cur];
 const here=!moving||cam.phase==='a'||cam.phase==='b'; // 일행이 어떤 장소 위에 서 있는가
 let heading=0;if(moving){const A=L(seg.from),B=L(seg.to);heading=Math.atan2(B.x-A.x,B.z-A.z);}
 const tiles=[],used=new Set();if(tl.map)groundTiles(cam,(z,x,y,lx,lz,size,key)=>{const e=tile(z,x,y);if(e.ok){tiles.push({key,img:e.img,x:lx,z:lz,size});return;}
  for(let up=1;up<=6&&z-up>=0;up++){const f=2**up,px=x>>up,py=y>>up,pe=TILES.get((z-up)+'/'+px+'/'+py);if(!pe?.ok)continue; // 아직 못 받은 칸은 받아 둔 넓은 타일로 채운다
   const pk='p'+(z-up)+'/'+px+'/'+py+'@'+z;if(!used.has(pk)){used.add(pk);tiles.push({key:pk,img:pe.img,x:lx-(x-px*f)*size,z:lz-(y-py*f)*size,size:size*f,y:-up});}return;}});
 const edge=seg.type==='dwell'?Math.min(1,p*5,(1-p)*5):seg.type==='end'?Math.min(1,p*5):0;
 // 표정: 좋아하는 곳에서는 먼저 놀란 얼굴(wow)이었다가 활짝 웃고, 먹을 땐 오물오물, 사진 찍을 땐 윙크 …
 const act=seg.type==='dwell'?stop.react.act:seg.type==='end'?'cheer':cam.phase==='a'?'wave':'';
 const mood=seg.type==='end'?'happy':seg.type==='dwell'?({cheer:p<.32?'wow':'happy',pose:p<.4?'smile':'wink',eat:'yum',relax:'relaxed',sleep:'sleepy',wave:'smile'})[act]||'normal':act==='wave'?'smile':'normal';
 return {t,cam,seg,p,cur,stop,moving,here,tiles,dolly:mid&&seg.plane?1+.22*(cam.lift??1):1-.17*edge,fade:cam.fade,
  stops:S.map((s,i)=>{const q=L(i),state=i===cur&&here?2:i<=cur?1:0;return {...q,state,showProp:!mid&&state===2};}),
  legs:S.slice(1).map((s,i)=>{const a=L(i),b=L(i+1),flying=moving&&seg.plane&&seg.to===i+1;return {ax:a.x,az:a.z,bx:b.x,bz:b.z,fly:s.via==='plane',seen:flying?false:i+1<=cur,progress:flying?cam.fly:null};}),
  party:{visible:!mid,scale:seg.type==='end'?1:.62,front:seg.type==='end'?0:moving&&!seg.jump?Math.max(0,1-p*4,(p-.75)*4):1,costume:stop.costume||'',walking:moving&&!seg.jump,heading,act,mood,lay:seg.type==='dwell'?{kind:stop.react.act,w:clamp(Math.min(p/.16,(1-p)/.1),0,1),selfie:stop.react.act==='pose'&&p>.37&&p<.72}:null},
  camMove:seg.type==='dwell'?camMoveAt(stop.react.act,p):null,xmas:seg.type==='dwell'&&XMAS_KEYS.has(stop.react.key)?Math.max(.001,p):0,
  vehicle:mid?{kind:seg.plane?'plane':S[seg.to].ground||'train',heading:heading-PI/2,lift:cam.lift??1,climb:seg.plane?(p<.26?.22*(1-cam.lift):p>.74?-.22*(1-cam.lift):0):0}:null,
  sky:(()=>{let h=stop.hour??12;if(moving){const A=S[seg.from],B=S[seg.to];let hb=B.hour??h,ha=A.hour??h;h=B.date!==A.date?(p<.35?ha+p/.35*2:hb-(1-p)/.65*1.5):ha+(hb-ha)*p;}return {...skyAt(h,(moving&&p<.5?S[seg.from]:S[seg.to]||stop).sun||stop.sun),weather:tl.weather?.[stop.date]||''};})(),
  night:typeof document!=='undefined'&&document.body.classList.contains('night')};}

/* ---------- 국기: 나라가 바뀌어 도착하면 한 번 크게 띄운다 ---------- */
const FLAGS=new Map();
function flagImage(code){let e=FLAGS.get(code);if(!e&&typeof Image!=='undefined'){const img=new Image();img.crossOrigin='anonymous';e={img,ok:false};img.onload=()=>{e.ok=true;};img.src='https://purecatamphetamine.github.io/country-flag-icons/3x2/'+code+'.svg';FLAGS.set(code,e);}return e;}
function countryName(code){try{return new Intl.DisplayNames(['ko'],{type:'region'}).of(code)||code;}catch{return code;}}
function drawFlag(ctx,code,p,dur){const sec=p*dur,show=1.5;if(sec>show)return;const k=Math.min(1,sec/.22),out=Math.min(1,(show-sec)/.25),s=(.6+.4*ease(k))*(.9+.1*out),e=flagImage(code);
 ctx.save();ctx.globalAlpha=Math.min(k,out);ctx.translate(W/2,330);ctx.scale(s,s);
 ctx.fillStyle='rgba(255,255,255,.97)';ctx.shadowColor='rgba(20,34,28,.28)';ctx.shadowBlur=30;fillRR(ctx,-170,-150,340,300,34);ctx.shadowBlur=0;
 if(e?.ok){ctx.save();ctx.beginPath();rr(ctx,-120,-116,240,160,16);ctx.clip();ctx.drawImage(e.img,-120,-116,240,160);ctx.restore();ctx.strokeStyle='rgba(36,61,52,.18)';ctx.lineWidth=2;ctx.beginPath();rr(ctx,-120,-116,240,160,16);ctx.stroke();}
 else{ctx.fillStyle='#eaf2eb';fillRR(ctx,-120,-116,240,160,16);ctx.fillStyle='#285c4b';ctx.font='900 64px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(code,0,-36);}
 ctx.fillStyle='#243d34';ctx.font='900 40px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(fit(ctx,countryName(code)+' 도착!',300),0,96);ctx.restore();}

/* ---------- 장소 아이콘 핀: 지도 위 각 장소에 종류별 색·아이콘 핀을 꽂는다(지도 앱의 장소 핀처럼) ---------- */
const EMOJI=",'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji'";
const C={food:'#f28b30',cafe:'#b9772f',drink:'#c0478f',sight:'#12a39a',nature:'#3f9e5a',shop:'#3f7fe0',fun:'#8a5fd6',stay:'#e0568a',move:'#4a6fb5',xmas:'#d63c4a'};
const ICON={tree:['🎄',C.xmas],santa:['🎅',C.xmas],stall:['🎪',C.xmas],snowman:['⛄',C.xmas],gluhwein:['🍷',C.xmas],bowl:['🍜',C.food],dish:['🍽️',C.food],steak:['🥩',C.food],pasta:['🍝',C.food],pizza:['🍕',C.food],burger:['🍔',C.food],
 sushi:['🍣',C.food],curry:['🍛',C.food],sausage:['🌭',C.food],pretzel:['🥨',C.food],schnitzel:['🍖',C.food],dumpling:['🥟',C.food],taco:['🌮',C.food],fishchips:['🍟',C.food],paella:['🥘',C.food],kebab:['🥙',C.food],bibimbap:['🍲',C.food],
 grill:['🥓',C.food],chicken:['🍗',C.food],seafood:['🦞',C.food],breakfast:['🍳',C.food],cake:['🍰',C.cafe],bread:['🥐',C.cafe],icecream:['🍦',C.cafe],cup:['☕',C.cafe],beer:['🍺',C.drink],wine:['🍷',C.drink],cocktail:['🍸',C.drink],
 castle:['🏰',C.sight],xferris:['🎡',C.sight],xpyramid:['🎄',C.sight],berlindom:['⛪',C.sight],siegessaeule:['🗽',C.sight],charlottenburg:['🏰',C.sight],dancinghouse:['🏢',C.sight],powdertower:['🏰',C.sight],fuerstenzug:['🖼️',C.sight],pkin:['🏙️',C.sight],warsawcastle:['🏰',C.sight],brandenburg:['🏛️',C.sight],berlinwall:['🧱',C.sight],checkpoint:['🛂',C.sight],fernsehturm:['📡',C.sight],reichstag:['🏛️',C.sight],pragcastle:['🏰',C.sight],charlesbridge:['🌉',C.sight],orloj:['🕰️',C.sight],tyn:['⛪',C.sight],frauenkirche:['⛪',C.sight],zwinger:['👑',C.sight],semperoper:['🎭',C.sight],church:['⛪',C.sight],gate:['🏛️',C.sight],eiffel:['🗼',C.sight],pagoda:['🛕',C.sight],torii:['⛩️',C.sight],bridge:['🌉',C.sight],tower:['🗼',C.sight],skyline:['🌃',C.sight],museum:['🖼️',C.sight],fountain:['⛲',C.sight],statue:['🗽',C.sight],camera:['📷',C.sight],
 boat:['⛴️',C.move],mountain:['⛰️',C.nature],park:['🌳',C.nature],parasol:['🏖️',C.nature],onsen:['♨️',C.nature],ski:['🎿',C.nature],bag:['🛍️',C.shop],ferris:['🎡',C.fun],zoo:['🦒',C.fun],aquarium:['🐠',C.fun],concert:['🎵',C.fun],stadium:['⚽',C.fun],fireworks:['🎆',C.fun],
 airport:['🛫',C.move],suitcase:['🧳',C.move],takoyaki:['🐙',C.food],onigiri:['🍙',C.food],tteokbokki:['🌶️',C.food],kimbap:['🍙',C.food],pekingduck:['🦆',C.food],hotpot:['🍲',C.food],bubbletea:['🧋',C.cafe],padthai:['🍜',C.food],mangorice:['🥭',C.cafe],banhmi:['🥖',C.food],naan:['🫓',C.food],satay:['🍢',C.food],friedrice:['🍚',C.food],
 baklava:['🍯',C.cafe],tea:['🫖',C.cafe],espresso:['☕',C.cafe],macaron:['🧁',C.cafe],churros:['🥖',C.cafe],nata:['🥧',C.cafe],fondue:['🫕',C.food],waffle:['🧇',C.cafe],cheese:['🧀',C.food],trdelnik:['🥐',C.cafe],goulash:['🥘',C.food],donut:['🍩',C.cafe],hotdog:['🌭',C.food],poutine:['🍟',C.food],meatpie:['🥧',C.food],tapas:['🍢',C.food],chocolate:['🍫',C.cafe],
 bigben:['🕰️',C.sight],colosseum:['🏟️',C.sight],pisa:['🏛️',C.sight],arc:['🏛️',C.sight],windmill:['🌬️',C.sight],sagrada:['⛪',C.sight],parthenon:['🏛️',C.sight],taj:['🕌',C.sight],mosque:['🕌',C.sight],burj:['🏙️',C.sight],onion:['⛪',C.sight],liberty:['🗽',C.sight],goldengate:['🌉',C.sight],opera:['🎭',C.sight],pyramid:['🔺',C.sight],christ:['🗿',C.sight],
 marina:['🏙️',C.sight],petronas:['🏙️',C.sight],hanok:['🏯',C.sight],japancastle:['🏯',C.sight],greatwall:['🧱',C.sight],taipei101:['🏙️',C.sight],stupa:['🛕',C.sight],chalet:['🏡',C.nature],clocktower:['🕰️',C.sight],
 hotel:['🏨',C.stay],house:['🏠',C.stay],pin:['📍',C.sight],plane:['✈️',C.move],train:['🚆',C.move]};
function drawPin(ctx,x,y,key,seen,r){const [glyph,color]=ICON[key]||ICON.pin,cy=y-r*2;ctx.save();ctx.globalAlpha=seen?1:.62;
 ctx.fillStyle=color;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-r*.72,cy+r*.7);ctx.arc(x,cy,r,PI*.76,PI*.24);ctx.closePath();ctx.stroke();ctx.fill();
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,cy,r*.76,0,PI*2);ctx.fill();ctx.font=Math.round(r*1.05)+'px '+FONT+EMOJI;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#243d34';ctx.fillText(glyph,x,cy+1);ctx.restore();}

/* ---------- 3D 장면 위에 덧그리는 2D: 이름표·장소 이름·말풍선·제목·진행 막대 ---------- */
function pill(ctx,text,cx,cy,o={}){ctx.font=(o.font||'800 22px ')+FONT+(o.emoji?EMOJI:'');const tw=ctx.measureText(text).width+(o.pad||30),h=o.h||42,x=clamp(cx-tw/2,12,W-12-tw);
 ctx.fillStyle=o.bg||'rgba(255,255,255,.96)';if(o.line){ctx.strokeStyle=o.line;ctx.lineWidth=2;}ctx.beginPath();rr(ctx,x,cy-h/2,tw,h,h/2);ctx.fill();if(o.line)ctx.stroke();
 ctx.fillStyle=o.fg||INK;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x+tw/2,cy+1);return {x,w:tw};}
const nameTags=(ctx,stage,members)=>stage.heads().forEach((h,k)=>{if(h)pill(ctx,members[k].label,h.x,h.y,{font:'800 19px ',h:30,pad:24,bg:members[k].me?'#f6c945':'rgba(34,40,54,.86)',fg:members[k].me?INK:'#fff'});});
// 이름표가 잘리지 않게: 괄호·부연 설명을 빼고 짧게, 그래도 길면 장소 이름이나 글자 크기를 줄인다
function shortTitle(s){if(s.via==='plane'&&s.fromQ&&s.q)return s.fromQ+' → '+s.q;
 let t=String(s.title||'').replace(/\([^)]*\)|\[[^\]]*\]/g,' ').replace(/\s+/g,' ').trim();
 if(t.length>14)t=t.split(/\s[-–|·:]\s|,|\//)[0].trim();t=t.replace(/\s*(방문|구경|관광|투어|일정|둘러보기|가기|하기|즐기기)$/,'').trim();
 const place=String(s.q||'').trim();if(t.length>14&&place&&place.length<t.length)t=place;
 if(t.length>16){let out='';for(const w of t.split(' ')){if((out+' '+w).trim().length>13)break;out=(out+' '+w).trim();}t=out||t.slice(0,13)+'…';} // 앞의 몇 단어만
 return t||place||'일정';}
function placeLabel(ctx,s,cx,cy,night){const name=shortTitle(s),icon=(ICON[s.react.key]?.[0]||'📍')+' ',time=s.time||'';let size=26;
 const width=()=>{ctx.font='800 '+size+'px '+FONT+EMOJI;const a=ctx.measureText(icon+name).width;ctx.font='800 '+(size-6)+'px '+FONT;return a+(time?ctx.measureText(time).width+22:0);};
 while(size>18&&width()>W-90)size-=2;ctx.font='800 '+size+'px '+FONT+EMOJI;const nm=fit(ctx,icon+name,W-90-(time?90:0));
 ctx.font='800 '+size+'px '+FONT+EMOJI;const nw=ctx.measureText(nm).width;ctx.font='800 '+(size-6)+'px '+FONT;const tw=time?ctx.measureText(time).width+22:0,h=size+22,bw=nw+tw+38,x=clamp(cx-bw/2,12,W-12-bw);
 ctx.fillStyle=night?'rgba(36,46,41,.95)':'rgba(255,255,255,.96)';ctx.strokeStyle=night?'#52685d':'#dfe5d6';ctx.lineWidth=2;ctx.beginPath();rr(ctx,x,cy-h/2,bw,h,h/2);ctx.fill();ctx.stroke();
 ctx.textBaseline='middle';ctx.textAlign='left';if(time){ctx.fillStyle='#285c4b';ctx.fillText(time,x+19,cy+1);}
 ctx.font='800 '+size+'px '+FONT+EMOJI;ctx.fillStyle=night?'#eef5ef':'#243d34';ctx.fillText(nm,x+19+tw,cy+1);return {x,w:bw};}
const WX_TEXT={clear:'☀️ 맑음',cloud:'☁️ 흐림',fog:'🌫️ 안개',rain:'🌧️ 비',snow:'❄️ 눈',storm:'⛈️ 뇌우'};
function drawSky(ctx,f,t){const {night:nt,dusk:dk,weather:wx}=f.sky||{};
 if(dk>0){const g=ctx.createLinearGradient(0,0,0,H*.4);g.addColorStop(0,'rgba(255,140,90,'+(dk*.38).toFixed(2)+')');g.addColorStop(1,'rgba(255,170,120,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H*.4);}
 if(nt>0){const g=ctx.createLinearGradient(0,0,0,H*.42);g.addColorStop(0,'rgba(10,18,44,'+(nt*.9).toFixed(2)+')');g.addColorStop(1,'rgba(10,18,44,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H*.42);
  if(wx!=='rain'&&wx!=='storm'&&wx!=='cloud'&&wx!=='fog'){for(let i=0;i<60;i++){const h=hash('s'+i),x=h%W,y=140+(h>>>9)%Math.round(H*.24),tw=.5+.5*Math.sin(t*2.2+i);ctx.globalAlpha=nt*(1-y/(H*.42))*tw;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,1+(h>>>20)%3*.7,0,PI*2);ctx.fill();}
   ctx.globalAlpha=nt;ctx.fillStyle='#fff6d6';ctx.shadowColor='#fff3c0';ctx.shadowBlur=24;ctx.beginPath();ctx.arc(W-110,200,26,0,PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='rgba(10,18,44,.9)';ctx.beginPath();ctx.arc(W-98,192,22,0,PI*2);ctx.fill();ctx.globalAlpha=1;}}
 if(wx==='cloud'||wx==='rain'||wx==='storm'||wx==='fog'){ctx.fillStyle=wx==='fog'?'rgba(235,240,244,.28)':'rgba(120,132,146,.16)';ctx.fillRect(0,0,W,H);
  for(let i=0;i<5;i++){const x=((i*173+t*14)%(W+260))-130,y=150+(i%3)*46;ctx.fillStyle=wx==='fog'?'rgba(255,255,255,.45)':'rgba(230,234,238,.75)';for(const [dx,dy,r] of [[0,0,34],[30,-12,28],[58,2,30],[28,10,26]]){ctx.beginPath();ctx.arc(x+dx,y+dy,r,0,PI*2);ctx.fill();}}}
 if(wx==='rain'||wx==='storm'){ctx.strokeStyle='rgba(200,215,235,.6)';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<90;i++){const h=hash('r'+i),x=(h%W+t*60)%W,y=((h>>>8)%H+t*900)%H;ctx.moveTo(x,y);ctx.lineTo(x-8,y+26);}ctx.stroke();
  if(wx==='storm'&&(t%4.1)<.12){ctx.fillStyle='rgba(255,255,255,.55)';ctx.fillRect(0,0,W,H);}}
 if(wx==='snow'){ctx.fillStyle='rgba(255,255,255,.9)';for(let i=0;i<80;i++){const h=hash('w'+i),x=(h%W+Math.sin(t+i)*24+W)%W,y=((h>>>8)%H+t*(60+h%50))%H;ctx.beginPath();ctx.arc(x,y,2+(h>>>16)%3,0,PI*2);ctx.fill();}}}
export function drawOverlay(ctx,tl,f,stage,members){const {seg,p,stop,t}=f,night=f.night,n=members.length,dwell=seg.type==='dwell';
 drawSky(ctx,f,t);
 if(seg.type!=='end')f.stops.forEach((sp,i)=>{if((i===f.cur&&f.here)||Math.abs(sp.x)>1500||Math.abs(sp.z)>2400)return;const q=stage.project(sp.x,0,sp.z);if(q.x<-30||q.x>W+30||q.y<150||q.y>H-70)return;drawPin(ctx,q.x,q.y,tl.stops[i].react.key,i<=f.cur,f.vehicle?18:27);});
 if(f.party.visible&&seg.type!=='end'){nameTags(ctx,stage,members);
  if(f.here&&!(dwell&&stop.flag&&p*seg.dur<1.5)){const sp=f.stops[f.cur],top=stage.project(sp.x,236,sp.z-120),ly=clamp(top.y,186,H-200);
   const box=placeLabel(ctx,stop,top.x,ly,night);
   if(stop.firstOfDay)pill(ctx,(stop.dayIdx+1)+'일 차',box.x+34,ly-40,{font:'800 19px ',h:28,pad:22,bg:'#285c4b',fg:'#fff'});
   if(dwell&&stop.react.say&&p>.12&&p<.92){const who=stage.heads()[f.cur%n]||stage.heads().find(Boolean);if(who)pill(ctx,stop.react.say,who.x+(who.x>W/2?-96:96),who.y-44,{h:44,pad:32,line:'#d9dee6'});}
   if(dwell&&tl.group==='couple'&&n>=2){const a=stage.heads()[0],b=stage.heads()[1];if(a&&b){const u=(t*.6)%1;ctx.globalAlpha=1-u;ctx.fillStyle='#ff5a7a';ctx.font='40px '+FONT;ctx.textAlign='center';ctx.fillText('♥',(a.x+b.x)/2,Math.min(a.y,b.y)-84-u*44);ctx.globalAlpha=1;}}
   if(dwell&&stop.react.act==='pose'&&p>.42&&p<.5){ctx.fillStyle='rgba(255,255,255,'+(1-Math.abs(p-.46)/.04).toFixed(2)+')';ctx.fillRect(0,0,W,H);}}}
 if(dwell&&stop.flag)drawFlag(ctx,stop.flag,p,seg.dur);
 if(f.fade>0){ctx.fillStyle='rgba(244,248,251,'+clamp(f.fade,0,1).toFixed(2)+')';ctx.fillRect(0,0,W,H);} // 먼 이동의 화면 전환
 // 제목·날짜
 ctx.fillStyle=night?'rgba(36,46,41,.94)':'rgba(255,255,255,.94)';fillRR(ctx,24,24,W-48,104,26);
 ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=night?'#eef5ef':'#243d34';ctx.font='900 30px '+FONT;ctx.fillText(fit(ctx,tl.title,W-110),50,60);
 ctx.fillStyle=night?'#acc0b1':'#697c70';ctx.font='700 22px '+FONT;ctx.font='700 22px '+FONT+EMOJI;ctx.fillText(stop.dayIdx>=0?(stop.dayIdx+1)+'일 차 · '+(api().fmtDate?.(stop.date)||stop.date||'')+(f.sky?.weather?'  ·  '+WX_TEXT[f.sky.weather]:''):'',50,100);
 ctx.fillStyle='rgba(255,255,255,.8)';fillRR(ctx,24,H-42,W-48,12,6);ctx.fillStyle='#285c4b';fillRR(ctx,24,H-42,Math.max(12,(W-48)*Math.min(1,t/tl.total)),12,6);
 ctx.lineWidth=4;ctx.strokeStyle='rgba(255,255,255,.85)';ctx.font='900 20px '+FONT;ctx.textAlign='right';ctx.strokeText('TRIPKKU',W-28,H-64);ctx.fillStyle='rgba(36,61,52,.75)';ctx.fillText('TRIPKKU',W-28,H-64);
 if(tl.map){ctx.font='600 15px '+FONT;ctx.textAlign='left';ctx.strokeText('© OpenStreetMap',28,H-64);ctx.fillStyle='rgba(36,61,52,.8)';ctx.fillText('© OpenStreetMap',28,H-64);}
 // 마지막 장면: 위쪽만 어둡게 하고 캐릭터들은 3D 그대로 환호한다
 if(seg.type==='end'){const fade=Math.min(1,p*4),g=ctx.createLinearGradient(0,0,0,H*.62);g.addColorStop(0,'rgba(20,34,28,'+(.86*fade).toFixed(2)+')');g.addColorStop(1,'rgba(20,34,28,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H*.62);ctx.globalAlpha=fade;
  for(let i=0;i<46;i++){const h=hash('c'+i),cx=h%W,cy=((h>>>8)%H+t*(140+h%120))%H;ctx.fillStyle=['#f6c945','#f6b6c8','#8fd0b8','#8fb7ea','#ffffff'][i%5];ctx.save();ctx.translate(cx,cy);ctx.rotate(t*3+i);ctx.fillRect(-6,-3,12,6);ctx.restore();}
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.font='900 64px '+FONT;ctx.fillText('여행 끝!',W/2,H*.2);
  ctx.font='800 30px '+FONT;ctx.fillText(fit(ctx,tl.title,W-80),W/2,H*.2+76);
  ctx.font='700 26px '+FONT;ctx.fillStyle='#e6f2ea';ctx.fillText(tl.days+'일 · '+tl.places+'곳 · 함께한 '+n+'명',W/2,H*.2+122);ctx.globalAlpha=1;nameTags(ctx,stage,members);}
}

/* ---------- 화면 연결 (브라우저 전용) ---------- */
const CSS=`.jr-seg{display:flex;gap:6px}.jr-seg button{flex:1;min-height:40px;border:1px solid var(--border);background:var(--card);color:var(--ink);border-radius:10px;font-weight:800;font-size:13px}.jr-seg button.active{background:var(--soft);color:var(--forest);border-color:#8ea995}
#journeyDialog .jr-speed{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800}.jr-speed select{width:auto;min-height:39px;padding:6px 8px}.jr-done{display:flex;justify-content:center}
#jrCanvas{display:block;margin:auto;max-width:100%;max-height:58dvh;width:auto;height:auto;border-radius:14px;border:1px solid var(--border)}.jr-controls{display:flex;gap:7px;flex-wrap:wrap;justify-content:center}
.av-top{display:grid;grid-template-columns:150px minmax(0,1fr);gap:12px;align-items:center}#avCanvas{width:150px;height:174px;border-radius:14px;background:var(--soft)}
.av-group{display:grid;gap:5px}.av-group>span{font-weight:740;font-size:12px}.av-chips{display:flex;gap:6px;flex-wrap:wrap}.av-chips button{min-height:36px;min-width:36px;padding:6px 11px;border-radius:18px;border:2px solid var(--border);background:var(--card);color:var(--ink);font-size:12px;font-weight:750}
.av-chips button.swatch{padding:0;width:36px;border-radius:50%}.av-chips button.active{border-color:#285c4b;box-shadow:0 0 0 2px #285c4b33}body.night .av-chips button.active{border-color:#92c6ac}
.av-slider{display:grid;grid-template-columns:52px minmax(0,1fr) 64px;gap:8px;align-items:center;font-size:11px;font-weight:600;color:var(--muted)}.av-slider input{min-height:28px;padding:0;border:0;background:none;accent-color:#285c4b}
.hero-me{display:grid;justify-items:center;gap:3px;border:0;background:none;color:inherit;font-size:11px;font-weight:800;flex:none;padding:0}.hero-me .tk-face{width:96px;height:96px;background:#ffffff99;box-shadow:0 0 0 3px #f6c945}
.tk-face{border-radius:50%;background:var(--soft);object-fit:cover;object-position:50% 20%;flex:none}.trip-faces{display:flex;margin-top:7px;padding-left:2px}.trip-faces .tk-face{width:34px;height:34px;box-shadow:0 0 0 2px var(--card);margin-right:-7px}
.invite-member-row>.tk-face{width:44px;height:44px}.invite-member-row>.tk-face+div{flex:1;min-width:0}@media(max-width:600px){.hero-me .tk-face{width:66px;height:66px}}
.trip-intro:has(.trip-party) .trip-earth{display:none}
.trip-party{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.trip-party-item{display:grid;justify-items:center;gap:3px;min-width:64px;max-width:84px}.trip-party-face{display:grid;justify-items:center;gap:2px;border:0;background:none;color:var(--ink);font-size:11px;font-weight:750;padding:2px;width:100%}.trip-party-face span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.trip-party-item img{width:60px;height:60px;border-radius:50%;background:var(--soft);object-fit:cover;object-position:50% 20%}.trip-party-kick{border:0;background:none;color:var(--danger);font-size:10px;font-weight:800;padding:2px 4px;min-height:24px}.trip-party-leave{align-self:center;border:1px solid var(--border);background:var(--card);color:var(--muted);border-radius:16px;font-size:11px;font-weight:800;padding:6px 12px;min-height:34px;margin-left:auto}
.trip-party-item.me img{box-shadow:0 0 0 2px #f6c945}
#avatarDialog .modal-content{max-height:92dvh;overflow:auto}@media(max-width:480px){.av-top{grid-template-columns:110px minmax(0,1fr)}#avCanvas{width:110px;height:128px}}`;
function el(tag,props={},kids=[]){const n=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else n.setAttribute(k,v);}for(const c of kids)n.append(c);return n;}
let stage3d=null;const load3d=()=>stage3d||(stage3d=import('./journey3d.js?v=20261112_ui1'));
const tripKind=()=>{const a=api(),doc=a.activeDoc?.()||{};return costumeKind(doc.meta?.countries?.[0]||a.getTrip?.()?.country_code||doc.meta?.countryCode);};

/* ---------- 여행 계획 화면: 여행 소개 카드에 함께 가는 사람들의 캐릭터를 보여 준다 ---------- */
const BLANK='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
let portraits=null;const portraitCache=new Map();
// 한 번 그린 얼굴은 기기에 저장해 둔다 → 다음에 열 때는 3D 엔진(약 700KB)을 받지 않고도 바로 보인다.
const PORTRAIT_STORE='tripkku-portraits-v1',PORTRAIT_KEEP=16;
const portraitHash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=(h*33^s.charCodeAt(i))>>>0;return h.toString(36);};
let portraitDisk=null;const diskPortraits=()=>{if(!portraitDisk){try{portraitDisk=JSON.parse(localStorage.getItem(PORTRAIT_STORE)||'{}')||{};}catch{portraitDisk={};}}return portraitDisk;};
const savePortrait=(h,url)=>{const d=diskPortraits();delete d[h];d[h]=url;const keys=Object.keys(d);for(const k of keys.slice(0,Math.max(0,keys.length-PORTRAIT_KEEP)))delete d[k];
 try{localStorage.setItem(PORTRAIT_STORE,JSON.stringify(d));}catch{try{localStorage.removeItem(PORTRAIT_STORE);}catch{}portraitDisk={};}};
const idle=()=>new Promise(r=>(window.requestIdleCallback||(f=>setTimeout(f,250)))(()=>r(),{timeout:1500}));
async function portraitOf(av,kind){const key=JSON.stringify([av,kind]);if(portraitCache.has(key))return portraitCache.get(key);
 const h=portraitHash(key),saved=diskPortraits()[h];if(saved){portraitCache.set(key,saved);return saved;}
 await idle(); // 첫 화면을 먼저 그린 뒤에 3D 엔진을 받는다
 if(!portraits)portraits=(await load3d()).createPortraits();const url=portraits.render(av,kind);if(portraitCache.size>60)portraitCache.clear();portraitCache.set(key,url);savePortrait(h,url);return url;}
function face(av,kind,size){const img=el('img',{src:BLANK,alt:'',width:String(size),height:String(size),class:'tk-face'});
 portraitOf(av,av.costume==='on'?kind:'').then(url=>{img.src=url;}).catch(()=>{});return img;}
/* 일정표: 오늘이면 지금 시간대 일정 카드 위에 일행 캐릭터를 체스 말처럼 세운다(1분마다 다음 칸으로 이동). */
const toMin=v=>{const m=/^(\d{1,2}):(\d{2})/.exec(v||'');return m?Number(m[1])*60+Number(m[2]):null;};
function placePieces(){const box=document.getElementById('timeline');if(!box)return;const a=api(),date=a.getActiveDate?.(),doc=a.activeDoc?.()||{};
 const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 const old=box.querySelector('.tk-pieces');
 const cards=[...box.querySelectorAll(':scope > .event-card')],day=(doc.days||[]).find(d=>d.date===date);
 if(date!==today||!day||!cards.length){old?.remove();return;}
 const evs=[...(a.activeDayEvents?.(day)||day.events||[])].sort((p,q)=>String(p.start).localeCompare(String(q.start)));
 const cur=now.getHours()*60+now.getMinutes();let idx=-1,tag='지금';
 evs.forEach((e,i)=>{const st=toMin(e.start),en=toMin(e.end)??(st!=null?st+60:null);if(st!=null&&st<=cur&&cur<(en>st?en:st+60))idx=i;});
 if(idx<0){idx=evs.findIndex(e=>(toMin(e.start)??-1)>cur);tag='다음';}
 if(idx<0){idx=evs.length-1;tag='마지막';}
 const card=cards[idx];if(!card){old?.remove();return;}
 const ms=party(),kind=tripKind(),sig=JSON.stringify([idx,tag,ms.map(m=>[m.id,m.av])]);
 if(old&&old.dataset.sig===sig&&old.parentElement===card)return;old?.remove();
 const pieces=el('div',{class:'tk-pieces','aria-label':tag+' 여기: '+ms.map(m=>m.label).join(', ')},[el('span',{class:'tk-pieces-tag',text:tag}),...ms.slice(0,6).map((m,i)=>{const f=face(m.av,m.av.costume==='on'?kind:'',34);f.title=m.label;f.style.setProperty('--i',i);return f;})]);
 pieces.dataset.sig=sig;card.classList.add('tk-has-pieces');card.append(pieces);}
/* 홈 화면: 인사 카드에 내 캐릭터. 누르면 꾸미기(여행 밖에서는 이 기기에 저장해 두고, 여행을 열 때 자동으로 적용) */
function renderHomeHero(openAvatar){const earth=document.querySelector('.home-hero .hero-earth'),me=api().getMyId?.();if(!earth||!me)return;
 let b=document.getElementById('heroMe');if(!b){b=el('button',{id:'heroMe',type:'button',class:'hero-me','aria-label':'내 캐릭터 꾸미기'});earth.before(b);b.addEventListener('click',()=>void openAvatar());}
 const saved=localAvatar()||(api().getTrips?.()||[]).map(t=>t.data?.avatars?.[me]).find(Boolean),av=cleanAvatar(saved,me),sig=JSON.stringify([av,!!saved]);if(b.dataset.sig===sig)return;b.dataset.sig=sig;
 b.replaceChildren(face(av,'',96),el('span',{text:saved?'내 캐릭터':'내 캐릭터 만들기'}));}
/* 홈 화면: 여행 카드마다 그 여행에 저장된 일행 캐릭터 */
function decorateTripCards(){const trips=api().getTrips?.()||[];
 document.querySelectorAll('.trip-card[data-trip-id]').forEach(card=>{if(card.querySelector('.trip-faces'))return;const t=trips.find(x=>x.id===card.dataset.tripId),me=api().getMyId?.(),av0=t?.data?.avatars||{},list=Object.entries(av0).filter(([id,raw])=>id===me||!sameLook(raw,av0[me])).slice(0,6);if(!list.length)return;
  const kind=costumeKind(t.data?.meta?.countries?.[0]||t.country_code);card.querySelector('.trip-card-info')?.append(el('div',{class:'trip-faces','aria-hidden':'true'},list.map(([id,raw])=>face(cleanAvatar(raw,id),kind,34))));});}
/* 초대 창: 참여자 이름 앞에 캐릭터 */
function decorateInvite(){const ms=party(),kind=tripKind();
 document.querySelectorAll('#inviteMemberList .invite-member-row').forEach((row,i)=>{if(!ms[i]||row.querySelector('.tk-face'))return;row.prepend(face(ms[i].av,kind,44));});}
/* 이 기기에 저장해 둔 내 캐릭터를, 아직 캐릭터가 없는 여행에 한 번 자동으로 적용한다(역할은 여행마다 다르므로 비운다). */
const applied=new Set();
function autoApply(){const a=api(),t=a.getTrip?.(),me=a.getMyId?.(),saved=localAvatar();if(!t||!me||!saved||applied.has(t.id))return;applied.add(t.id);if(a.activeDoc?.().avatars?.[me])return;
 const av={...cleanAvatar(saved,me),role:''};a.saveTrip?.(d=>{d.avatars??={};d.avatars[me]??=av;},'내 캐릭터를 이 여행에 적용했어요.').catch(()=>{});}
function renderPartyStrip(openAvatar){const anchor=document.querySelector('.trip-intro .chip-row');if(!anchor||!api().getTrip?.())return;
 let strip=document.getElementById('tripParty');if(!strip){strip=el('div',{id:'tripParty',class:'trip-party',role:'group','aria-label':'함께 가는 사람들'});anchor.after(strip);}
 const A=api(),owner=!!A.isOwner?.(),admin=!!A.isAdmin?.(),manage=!!(A.canManage?.()??owner),ownerId=A.ownerId?.(),members=party(),kind=tripKind(),sig=JSON.stringify([kind,owner,admin,manage,members.map(m=>[m.id,m.label,m.av])]);if(strip.dataset.sig===sig)return;strip.dataset.sig=sig;
 const items=members.map(m=>{const img=el('img',{src:BLANK,alt:'',width:'60',height:'60'}),name=el('span',{text:m.label});
  const face=m.me||admin?el('button',{type:'button',class:'trip-party-face','aria-label':m.label+' · 캐릭터 꾸미기',title:m.me?'내 캐릭터 꾸미기':'관리자: 이 사람 캐릭터 바꾸기'},[img,name]):el('div',{class:'trip-party-face'},[img,name]);
  if(m.me||admin)face.addEventListener('click',()=>void openAvatar(m.id));
  const item=el('div',{class:'trip-party-item'+(m.me?' me':'')},[face]);
  // 여행 만든 사람과 트립꾸 관리자는 다른 사람을 내보낼 수 있다(만든 사람은 제외)
  if(manage&&!m.me&&m.id!==ownerId){const kick=el('button',{type:'button',class:'trip-party-kick','aria-label':m.label+' 내보내기'},[document.createTextNode('내보내기')]);kick.addEventListener('click',()=>void A.removeMember?.(m.id));item.append(kick);}
  portraitOf(m.av,m.av.costume==='on'?kind:'').then(url=>{img.src=url;}).catch(()=>{});return item;});
 // 초대받은 사람은 스스로 나갈 수 있다(만든 사람은 홈에서 여행을 삭제)
 if(!owner&&A.getTrip?.()&&!A.isDemo?.()){const leave=el('button',{type:'button',class:'trip-party-leave'},[document.createTextNode('🚪 이 여행 나가기')]);leave.addEventListener('click',()=>void A.leaveTrip?.(leave));items.push(leave);}
 strip.replaceChildren(...items);}

function mountJourney(){
 const dlg=el('dialog',{id:'journeyDialog','aria-labelledby':'jrTitle'});
 dlg.innerHTML=`<div class="modal-content"><header class="modal-header"><h3 id="jrTitle">🎬 우리 여행 동선</h3><button type="button" class="btn icononly" data-jr="close" aria-label="닫기">×</button></header>
 <div class="jr-seg" role="group" aria-label="재생 범위"><button type="button" data-jr-mode="day">선택한 하루</button><button type="button" data-jr-mode="trip">여행 전체</button></div>
 <canvas id="jrCanvas" width="${W}" height="${H}" role="img" aria-label="캐릭터들이 지도 위에서 일정 순서대로 이동하는 애니메이션"></canvas>
 <div class="jr-controls"><button type="button" class="btn primary" data-jr="play">⏸ 멈춤</button><button type="button" class="btn" data-jr="restart">↺ 처음부터</button><label class="jr-speed">속도 <select data-jr="speed" aria-label="재생 속도">${SPEEDS.map(v=>`<option value="${v}"${v===1?' selected':''}>×${v}</option>`).join('')}</select></label><button type="button" class="btn" data-jr="rec">⬇ 영상 저장</button></div>
 <div class="jr-done" hidden><button type="button" class="btn primary" data-jr="savefile">📥 영상 받기</button></div>
 <p class="tiny" id="jrHint">여행 전체는 출발부터 집에 돌아올 때까지 빠르게 보여 줘요. 영상 저장은 지금 고른 속도로, 재생을 기다리지 않고 빠르게 만들어요.</p></div>`;
 document.body.append(dlg);
 const canvas=dlg.querySelector('#jrCanvas'),ctx=canvas.getContext('2d'),gl=el('canvas',{width:W,height:H}),btn=k=>dlg.querySelector(`[data-jr="${k}"]`);
 const s={tl:null,members:[],t:0,playing:false,speed:1,raf:0,last:0,rec:null,chunks:[],job:0,busy:'',stage:null,exporting:false,file:null};
 const hint=dlg.querySelector('#jrHint'),HINT=hint.textContent;
 const paintButtons=()=>{const busy=!!s.rec||s.exporting;btn('play').textContent=s.playing?'⏸ 멈춤':'▶ 재생';btn('speed').value=String(s.speed);btn('rec').textContent=s.exporting?'● 만드는 중…':s.rec?'● 녹화 중…':'⬇ 영상 저장';
  for(const b of dlg.querySelectorAll('[data-jr-mode]')){b.classList.toggle('active',b.dataset.jrMode===s.tl?.mode);b.disabled=busy;}
  for(const k of ['play','restart','speed','rec'])btn(k).disabled=busy||!s.tl;dlg.querySelector('.jr-done').hidden=!s.file;hint.textContent=s.busy||HINT;};
 const finishRec=(save)=>{const r=s.rec;if(!r)return;s.rec=null;r.onstop=()=>{if(save&&s.chunks.length){const type=r.mimeType||'video/webm';s.file=new File(s.chunks,'tripkku-'+(s.tl?.title||'trip').replace(/[\\/:*?"<>|\s]+/g,'_').slice(0,40)+(type.includes('mp4')?'.mp4':'.webm'),{type});api().toast?.('영상이 준비됐어요. ‘영상 받기’를 눌러 저장하세요.');paintButtons();}s.chunks=[];};
  try{r.stop();}catch{}paintButtons();};
 const tick=now=>{const dt=Math.min(.05,(now-s.last)/1000);s.last=now;s.raf=requestAnimationFrame(tick);
  if(s.exporting)return; // 영상을 만드는 동안은 화면 재생을 멈춘다
  if(!s.tl){ctx.fillStyle='#eef4e4';ctx.fillRect(0,0,W,H);ctx.fillStyle='#285c4b';ctx.font='800 30px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s.busy||'준비 중…',W/2,H/2);return;}
  if(s.playing)s.t+=dt*s.speed;
  const f=frameAt(s.tl,s.t);s.stage.render(f);ctx.drawImage(gl,0,0);drawOverlay(ctx,s.tl,f,s.stage,s.members);
  if(s.playing&&s.t>=s.tl.total){s.t=s.tl.total;s.playing=false;paintButtons();if(s.rec)setTimeout(()=>finishRec(true),350);}};
 // 일정 → 3D 준비 → 장소 좌표 찾기 → 지도 타일 받기 → 재생
 const load=async mode=>{const tl=buildTimeline(mode);
  if(!tl.places){api().toast?.(mode==='trip'?'아직 일정이 없어요. 일정을 추가한 뒤 재생해 주세요.':'이 날은 일정이 없어요. 다른 날을 고르거나 여행 전체를 재생해 보세요.');return false;}
  const job=++s.job;s.tl=null;s.playing=false;s.busy='3D 화면을 준비하는 중…';paintButtons();
  try{if(!s.stage)s.stage=(await load3d()).createStage(gl);}catch(e){console.error(e);api().toast?.('이 기기에서는 3D 화면을 열 수 없어요.');s.busy='';paintButtons();return false;}
  s.busy='장소 위치를 찾는 중…';hint.textContent=s.busy;
  try{await locate(tl,(i,n)=>{if(job===s.job){s.busy='장소 위치를 찾는 중… '+i+'/'+n;hint.textContent=s.busy;}});}catch(e){console.error(e);}
  if(job!==s.job)return true;
  if(tl.map){s.busy='지도·날씨를 불러오는 중…';hint.textContent=s.busy;await Promise.all([preloadTiles(tl),fetchWeather(tl)]);if(job!==s.job)return true;}
  else api().toast?.('장소 위치를 찾지 못해 지도 없이 보여 드려요.');
  s.members=party();s.stage.setScene(tl,s.members);s.busy='';s.tl=tl;s.t=0;s.playing=true;paintButtons();return true;};
 const open=async mode=>{if(!dlg.open)dlg.showModal();cancelAnimationFrame(s.raf);s.last=performance.now();s.raf=requestAnimationFrame(tick);
  if(!(await load(mode))&&!(await load(mode==='trip'?'day':'trip')))dlg.close();};
 dlg.addEventListener('close',()=>{cancelAnimationFrame(s.raf);finishRec(false);s.playing=false;s.job++;});
 btn('close').addEventListener('click',()=>dlg.close());
 btn('play').addEventListener('click',()=>{if(s.t>=s.tl.total)s.t=0;s.playing=!s.playing;paintButtons();});
 btn('restart').addEventListener('click',()=>{s.t=0;s.playing=true;paintButtons();});
 btn('speed').addEventListener('change',()=>{s.speed=Number(btn('speed').value)||1;paintButtons();});
 dlg.querySelectorAll('[data-jr-mode]').forEach(b=>b.addEventListener('click',()=>void load(b.dataset.jrMode)));
 const fileName=ext=>'tripkku-'+(s.tl?.title||'trip').replace(/[\\/:*?"<>|\s]+/g,'_').slice(0,40)+ext;
 // 받은 영상: 휴대폰은 공유 창(사진에 저장), 그 밖에는 내려받기. 사용자가 누른 순간에만 열 수 있어 버튼으로 한 번 더 받는다.
 btn('savefile').addEventListener('click',async()=>{const f=s.file;if(!f)return;
  try{if(navigator.canShare?.({files:[f]})){await navigator.share({files:[f],title:s.tl?.title||'트립꾸 여행'});return;}}catch(e){if(e?.name==='AbortError')return;}
  const a=el('a',{href:URL.createObjectURL(f),download:f.name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),8000);});
 /* 빠른 영상 만들기: 재생을 기다리지 않고 장면을 한 장씩 그려 MP4 로 묶는다(WebCodecs). 지원하지 않는 브라우저는 재생하며 녹화한다. */
 async function exportFast(){const VE=window.VideoEncoder;if(!VE||!window.VideoFrame)return false;
  const fps=30,cfgs=[{codec:'avc1.640028',width:W,height:H,bitrate:5e6,framerate:fps},{codec:'avc1.4d0028',width:W,height:H,bitrate:5e6,framerate:fps},{codec:'avc1.42001f',width:W,height:H,bitrate:4e6,framerate:fps}];
  let cfg=null;for(const c of cfgs){try{if((await VE.isConfigSupported(c)).supported){cfg=c;break;}}catch{}}if(!cfg)return false;
  let mux;try{mux=await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/+esm');}catch{return false;}
  const target=new mux.ArrayBufferTarget(),muxer=new mux.Muxer({target,video:{codec:'avc',width:W,height:H},fastStart:'in-memory'});
  let failed=null;const enc=new VE({output:(chunk,meta)=>muxer.addVideoChunk(chunk,meta),error:e=>{failed=e;}});enc.configure(cfg);
  s.exporting=true;s.playing=false;s.file=null;paintButtons();
  const total=Math.ceil(s.tl.total/s.speed*fps)+fps; // 끝에 1초 여유
  try{for(let i=0;i<total&&!failed;i++){if(!dlg.open)throw new Error('closed');
    const t=Math.min(s.tl.total,i/fps*s.speed),f=frameAt(s.tl,t);s.stage.render(f);ctx.drawImage(gl,0,0);drawOverlay(ctx,s.tl,f,s.stage,s.members);
    const frame=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});enc.encode(frame,{keyFrame:i%(fps*2)===0});frame.close();
    if(i%6===0){s.busy='영상 만드는 중… '+Math.round(i/total*100)+'%';hint.textContent=s.busy;await new Promise(r=>setTimeout(r,0));}
    while(enc.encodeQueueSize>8)await new Promise(r=>setTimeout(r,4));}
   if(failed)throw failed;await enc.flush();muxer.finalize();
   s.file=new File([target.buffer],fileName('.mp4'),{type:'video/mp4'});s.busy='';api().toast?.('영상이 준비됐어요. ‘영상 받기’를 눌러 저장하세요.');}
  catch(e){if(e?.message!=='closed')api().toast?.('영상 만들기 실패: '+(e?.message||e));s.busy='';}
  finally{try{enc.close();}catch{}s.exporting=false;s.t=0;paintButtons();}
  return true;}
 btn('rec').addEventListener('click',async()=>{s.file=null;
  if(await exportFast())return;
  const mime=window.MediaRecorder&&canvas.captureStream?['video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m)):null;
  if(!mime)return api().toast?.('이 브라우저는 영상 저장을 지원하지 않아요. 기기의 화면 녹화를 이용해 주세요.');
  try{s.chunks=[];s.rec=new MediaRecorder(canvas.captureStream(30),{mimeType:mime,videoBitsPerSecond:5e6});s.rec.ondataavailable=e=>{if(e.data.size)s.chunks.push(e.data);};s.rec.start(500);}
  catch(e){s.rec=null;return api().toast?.('영상 저장을 시작하지 못했어요: '+e.message);}
  s.t=0;s.playing=true;paintButtons();}); // 고른 배속 그대로 녹화한다
 return open;}

function mountAvatar(){
 const dlg=el('dialog',{id:'avatarDialog','aria-labelledby':'avTitle'});
 dlg.innerHTML=`<div class="modal-content"><header class="modal-header"><h3 id="avTitle">🧑‍🎨 내 캐릭터 꾸미기</h3><button type="button" class="btn icononly" data-av="close" aria-label="닫기">×</button></header>
 <div class="av-top"><canvas id="avCanvas" width="300" height="348" role="img" aria-label="내 캐릭터 미리보기"></canvas><div id="avRel" style="display:grid;gap:10px"></div></div>
 <div id="avParts" style="display:grid;gap:10px"></div>
 <footer class="modal-actions"><button type="button" class="btn" data-av="random">🎲 랜덤</button><button type="button" class="btn" data-av="cancel">취소</button><button type="button" class="btn primary" data-av="save">저장</button></footer></div>`;
 document.body.append(dlg);
 const $title=dlg.querySelector('#avTitle'),canvas=dlg.querySelector('#avCanvas'),rel=dlg.querySelector('#avRel'),parts=dlg.querySelector('#avParts');
 const s={av:null,group:'friends',raf:0,preview:null,target:''}; // target: 꾸미는 사람(관리자는 일행 누구든 고를 수 있다)
 const group=(title,chips)=>el('div',{class:'av-group'},[el('span',{text:title}),el('div',{class:'av-chips'},chips)]);
 const chip=(label,active,onClick,color)=>{const b=el('button',{type:'button',class:(color?'swatch ':'')+(active?'active':''),'aria-pressed':String(active)});
  if(color){b.style.background=color;b.setAttribute('aria-label',label);}else b.textContent=label;b.addEventListener('click',onClick);return b;};
 const refresh=()=>s.preview?.set(s.av,s.av.costume==='on'?tripKind():'');
 const paint=()=>{
  const set=(k,v)=>()=>{s.av[k]=v;paint();};
  const custom=el('input',{maxlength:'8',placeholder:'역할 직접 입력 (예: 막내)','aria-label':'역할 직접 입력'});custom.value=ROLES[s.group].includes(s.av.role)?'':s.av.role;
  custom.addEventListener('input',()=>{s.av.role=custom.value.trim().slice(0,8);rel.querySelectorAll('[data-role]').forEach(b=>b.classList.remove('active'));});
  const roleChips=[chip('없음',!s.av.role,set('role','')),...ROLES[s.group].map(r=>{const b=chip(r,s.av.role===r,set('role',r));b.dataset.role=r;return b;})];
  const a0=api(),me0=a0.getMyId?.(),others=a0.getTrip?.()&&a0.isAdmin?.()?(a0.getMembers?.()||[]):[];
  const who=others.length>1?group('관리자 · 누구 캐릭터를 바꿀까요?',others.map(m=>chip((m.user_id===me0?'나':String(m.display_name||'친구').slice(0,8)),s.target===m.user_id,()=>{if(s.target!==m.user_id)load(m.user_id);}))):null;
  const roleTitle=s.target&&s.target!==me0?'역할':'내 역할';
  $title.textContent=s.target&&s.target!==me0?'🛠 '+String(others.find(m=>m.user_id===s.target)?.display_name||'친구')+' 캐릭터 바꾸기':'🧑‍🎨 내 캐릭터 꾸미기';
  if(!api().getTrip?.())rel.replaceChildren(el('p',{class:'muted',text:'우리 사이와 내 역할은 여행을 연 뒤에 정할 수 있어요. 여기서 꾸민 캐릭터는 여행을 열면 자동으로 적용돼요.'}));
  else rel.replaceChildren(...(who?[who]:[]),group('우리 사이 (이 여행 전체에 적용)',GROUPS.map(([k,l])=>chip(l,s.group===k,()=>{s.group=k;if(!ROLES[k].includes(s.av.role))s.av.role='';paint();}))),group(roleTitle,roleChips),custom);
  const names={skin:'피부색',hairColor:'머리색',outfit:'평소 옷 색',costumeColor:'전통의상 색'};
  const keyed=(title,k)=>group(title,OPT[k].map(([v,l])=>chip(l,s.av[k]===v,set(k,v))));
  const colored=k=>group(names[k],OPT[k].map((c,i)=>chip(names[k]+' '+(i+1),s.av[k]===c,set(k,c),c)));
  // 얼굴형은 고르는 게 아니라 동그라미에서 조금씩 조절한다.
  const face=el('div',{class:'av-group'},[el('span',{text:'얼굴형 (조금씩 조절)'}),...FACE.map(([k,label,lo,hi])=>{const input=el('input',{type:'range',min:'-1',max:'1',step:'0.1','aria-label':label+' ('+lo+' ~ '+hi+')'});input.value=String(s.av[k]);
   input.addEventListener('input',()=>{s.av[k]=Number(input.value);refresh();});return el('label',{class:'av-slider'},[el('span',{text:lo}),input,el('span',{text:hi})]);})]);
  const kind=tripKind(),note=el('p',{class:'tiny',text:!api().getTrip?.()?'여행지에 도착하면 그 나라 전통의상으로 갈아입어요. 여/남 형태와 색만 골라 두세요.':kind?'이 여행지에서는 '+COSTUME_NAME[kind]+'을(를) 입어요. 여/남 형태와 색만 고르면 됩니다.':'이 여행지는 아직 준비된 전통의상이 없어 평소 옷을 입어요. 다른 여행을 위해 미리 골라 둘 수 있어요.'});note.style.margin='0';
  parts.replaceChildren(face,colored('skin'),keyed('머리 모양','hair'),keyed('앞머리','bangs'),colored('hairColor'),keyed('눈','eyes'),keyed('눈썹','brows'),keyed('키','size'),colored('outfit'),keyed('소품','acc'),
   keyed('여행지 전통의상','costume'),note,keyed('전통의상 형태','gender'),colored('costumeColor'));refresh();};
 const tick=now=>{s.preview?.render(now/1000);s.raf=requestAnimationFrame(tick);};
 const close=()=>dlg.close();
 dlg.addEventListener('close',()=>cancelAnimationFrame(s.raf));
 dlg.querySelector('[data-av="close"]').addEventListener('click',close);dlg.querySelector('[data-av="cancel"]').addEventListener('click',close);
 dlg.querySelector('[data-av="random"]').addEventListener('click',()=>{const role=s.av.role;const keep={size:s.av.size,gender:s.av.gender,costume:s.av.costume};s.av=defaultAvatar(String(Math.random()));Object.assign(s.av,keep);s.av.brows=OPT.brows[Math.floor(Math.random()*4)][0];s.av.acc=OPT.acc[Math.floor(Math.random()*OPT.acc.length)][0];s.av.role=role;paint();});
 dlg.querySelector('[data-av="save"]').addEventListener('click',async()=>{const a=api(),me=a.getMyId?.();if(!me)return a.toast?.('로그인한 뒤에 저장할 수 있어요.');
  const target=s.target||me,mine=target===me;if(!mine&&!a.isAdmin?.())return a.toast?.('다른 사람의 캐릭터는 관리자만 바꿀 수 있어요.');
  const av=cleanAvatar(s.av,target),g=s.group;if(mine){try{localStorage.setItem(localKey(),JSON.stringify(av));}catch{}document.dispatchEvent(new Event('tripkku-avatar-saved'));}
  if(!a.getTrip?.()){a.toast?.('내 캐릭터를 저장했어요. 여행을 열면 자동으로 적용돼요.');return close();}
  try{await a.saveTrip(d=>{d.avatars??={};d.avatars[target]=av;d.meta??={};d.meta.groupType=g;},mine?'내 캐릭터를 저장했어요.':'캐릭터를 바꿨어요.');close();}catch(e){a.toast?.('캐릭터 저장 실패: '+e.message);}});
 const load=id=>{const a=api(),me=a.getMyId?.(),doc=a.activeDoc?.()||{};s.target=id&&(id===me||a.isAdmin?.())?id:me;
  s.av=cleanAvatar(doc.avatars?.[s.target]||(s.target===me?localAvatar():null),s.target);s.group=GROUPS.some(g=>g[0]===doc.meta?.groupType)?doc.meta.groupType:'friends';paint();};
 return async(id)=>{load(typeof id==='string'?id:'');dlg.showModal();
  try{if(!s.preview)s.preview=(await load3d()).createPreview(canvas);refresh();}catch(e){console.error(e);api().toast?.('이 기기에서는 3D 미리보기를 열 수 없어요.');}
  cancelAnimationFrame(s.raf);s.raf=requestAnimationFrame(tick);};}

function init(){
 const play=document.getElementById('journeyPlay'),edit=document.getElementById('avatarEdit');if(!play||!edit)return;
 document.head.append(el('style',{text:CSS}));
 const openJourney=mountJourney(),openAvatar=mountAvatar();
 const ended=()=>{const end=api().getTrip?.()?.end_date;return !!end&&todayISO()>=end;};
 play.addEventListener('click',()=>void openJourney(ended()?'trip':'day'));
 edit.addEventListener('click',()=>void openAvatar());
 // 여행 마지막 날부터는 버튼이 '여행 영상 만들기'로 바뀐다.
 const label=()=>{play.textContent=ended()?'🎬 여행 영상 만들기':'🎬 동선 재생';play.classList.toggle('primary',ended());renderPartyStrip(openAvatar);autoApply();};
 const title=document.getElementById('activeTripTitle');if(title)new MutationObserver(label).observe(title,{childList:true,characterData:true,subtree:true});
 label();
 // 홈 화면·여행 카드·초대 창에도 캐릭터를 넣는다. 화면이 다시 그려질 때마다 빠진 곳만 채운다.
 const watch=(id,fn,opt={childList:true})=>{const n=document.getElementById(id);if(n)new MutationObserver(fn).observe(n,opt);};
 const home=()=>{renderHomeHero(openAvatar);decorateTripCards();};
 watch('timeline',()=>{const b=document.getElementById('timeline');if(!b)return;if(!b.querySelector('.tk-pieces'))placePieces();});setInterval(placePieces,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)placePieces();});
 watch('tripList',decorateTripCards);watch('hiddenTripList',decorateTripCards);watch('inviteMemberList',decorateInvite);watch('homeScreen',home,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('tripkku-avatar-saved',()=>renderHomeHero(openAvatar));home();}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();}
