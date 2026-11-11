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
const W=720,H=1280,PI=Math.PI;
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
function localAvatar(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'null');}catch{return null;}}
export function party(){const a=api(),doc=a.activeDoc?.()||{},me=a.getMyId?.();
 const list=(a.getMembers?.()||[]).slice(0,8);if(!list.length)list.push({user_id:me||'me',display_name:'나'});
 return list.map(m=>{const saved=doc.avatars?.[m.user_id]||(m.user_id===me?localAvatar():null);
  const av=cleanAvatar(saved,m.user_id);const name=String(m.display_name||'친구').slice(0,8);
  return {id:m.user_id,me:m.user_id===me,av,label:av.role?av.role+' '+name:name};});}

/* ---------- 장소에 맞는 소품·행동: [키워드, 소품(journey3d.js 의 PROPS 키), 행동, 말풍선] ---------- */
const REACTIONS=[
 [/크리스마스|성탄|트리|christmas|weihnacht/i,'tree','cheer','우와, 트리다!'],
 [/놀이공원|테마파크|디즈니|유니버설|롯데월드|에버랜드|관람차/i,'ferris','cheer','한 번 더 타자!'],
 [/온천|스파|사우나|찜질|onsen/i,'onsen','relax','아, 좋다…'],
 [/숙소|호텔|체크인|료칸|게스트하우스|에어비앤비|hotel/i,'hotel','sleep','오늘도 수고했어'],
 [/공항|항공|비행|flight/i,'plane','wave','출발!'],
 [/카페|커피|디저트|베이커리|빵집|케이크|cafe/i,'cup','eat','한 잔의 여유'],
 [/맥주|와인|이자카야|펍|칵테일/i,'beer','cheer','짠!'],
 [/맛집|식당|저녁|점심|아침|조식|라멘|스시|초밥|레스토랑|브런치|식사|고기|먹|restaurant/i,'bowl','eat','맛있다!'],
 [/쇼핑|아울렛|백화점|시장|마켓|돈키|면세|market/i,'bag','cheer','이건 사야 해!'],
 [/박물관|미술관|갤러리|전시|museum/i,'museum','relax','오…'],
 [/전망|타워|야경|스카이|tower/i,'tower','pose','찰칵!'],
 [/성당|교회|사원|신사|궁|성$|성 |성곽|castle|cathedral|schloss/i,'castle','pose','찰칵!'],
 [/해변|바다|비치|섬|beach/i,'parasol','cheer','바다다!'],
 [/공원|정원|숲|산책|등산|트레킹|호수/i,'park','relax','공기 좋다'],
 [/역|열차|기차|버스|지하철|이동|렌터카|station/i,'train','wave','가자!']
];
export function reactionFor(e){const text=[e.title,e.place,e.note].filter(Boolean).join(' ');
 for(const [re,key,act,say] of REACTIONS)if(re.test(text))return {key,act,say};
 if(e.kind==='food')return {key:'bowl',act:'eat',say:'맛있다!'};
 if(e.kind==='hotel')return {key:'hotel',act:'sleep',say:'오늘도 수고했어'};
 if(e.kind==='move')return {key:'train',act:'wave',say:'가자!'};
 return {key:'pin',act:'pose',say:'찰칵!'};}
const isFlight=e=>e.kind==='flight'||/항공|비행|✈|flight/i.test([e.title,e.note].join(' '));

/* ---------- 타임라인 ---------- */
const cleanCity=s=>String(s||'').replace(/항공편|비행편|항공|비행기/g,' ').replace(/[()\[\]]/g,' ').replace(/\s+/g,' ').trim();
// 항공 일정의 출발지·도착지: 예약 정보가 있으면 그것을, 없으면 "인천 → 베를린" 같은 제목에서 읽는다.
function flightEnds(e,doc){const b=e.bookingId&&(doc.bookings||[]).find(x=>x.id===e.bookingId);
 if(b?.origin&&b?.destination)return [String(b.origin),String(b.destination)];
 const parts=String(e.title||'').split(/→|->|➜|➡|⇒|~/);if(parts.length>=2)return [cleanCity(parts[0]),cleanCity(parts.at(-1))];
 return ['',cleanCity(e.place||'')];}
function retime(tl){const fast=tl.mode==='trip';let acc=0;
 for(const s of tl.segs){s.dur=s.type==='end'?4:s.type==='dwell'?(fast?1.1:2.2):s.jump?(fast?2:2.8):(fast?.6:1.4);s.start=acc;acc+=s.dur;}tl.total=acc;return tl;}
export function buildTimeline(mode){const a=api(),doc=a.activeDoc?.()||{},trip=a.getTrip?.()||{};
 const dates=(doc.days||[]).map(d=>d.date).filter(Boolean).sort();
 const want=mode==='trip'?dates:[a.getActiveDate?.()||dates[0]];
 const stops=[];
 if(mode==='trip')stops.push({title:'출발!',time:'',date:want[0],dayIdx:0,firstOfDay:false,via:'walk',home:true,react:{key:'house',act:'wave',say:'다녀오겠습니다!'}});
 want.forEach(date=>{const day=(doc.days||[]).find(d=>d.date===date);if(!day)return;
  const events=[...(a.activeDayEvents?.(day)||day.events||[])].sort((p,q)=>String(p.start).localeCompare(String(q.start)));
  const country=a.dayCountry?.(day)||day.countryCode||trip.country_code||doc.meta?.countryCode||'';
  events.forEach((e,k)=>{const fly=isFlight(e),ends=fly?flightEnds(e,doc):null;
   stops.push({costume:costumeKind(country),title:String(e.title||e.place||'일정'),time:String(e.start||''),date,dayIdx:dates.indexOf(date),firstOfDay:k===0,via:fly?'plane':'walk',
    q:fly?(ends[1]||String(e.place||'')):String(e.place||e.title||''),fromQ:fly?ends[0]:'',local:!fly,react:reactionFor(e)});});});
 const places=stops.length-(mode==='trip'?1:0);
 if(mode==='trip'&&places>0)stops.push({title:'집 도착',time:'',date:want.at(-1),dayIdx:dates.indexOf(want.at(-1)),firstOfDay:false,via:'walk',home:true,react:{key:'house',act:'cheer',say:'다녀왔습니다!'}});
 const segs=[];
 stops.forEach((s,i)=>{if(i>0)segs.push({type:'move',from:i-1,to:i,plane:s.via==='plane',jump:s.via==='plane'});segs.push({type:'dwell',i});});
 if(mode==='trip'&&places>0)segs.push({type:'end',i:stops.length-1});
 return retime({mode,map:false,stops,segs,total:0,places,days:want.length,title:String(trip.title||trip.destination||'우리 여행'),group:doc.meta?.groupType||'friends'});}

/* ---------- 장소 좌표 찾기 ---------- */
const GEO_URL='https://nominatim.openstreetmap.org/search';
const geoKey=q=>String(q).trim().toLowerCase().slice(0,80);
async function geocode(q,box){const params={format:'jsonv2',limit:'1','accept-language':'ko',q};if(box){params.viewbox=box.join(',');params.bounded='0';}
 const r=await fetch(GEO_URL+'?'+new URLSearchParams(params),{referrerPolicy:'origin',headers:{Accept:'application/json'}});if(!r.ok)throw new Error('geocode '+r.status);
 const hit=(await r.json())[0];if(!hit)return null;return {lat:Number(hit.lat),lon:Number(hit.lon),box:(hit.boundingbox||[]).map(Number)};}
const merc=(lat,lon)=>({mx:(lon+180)/360,my:(1-Math.asinh(Math.tan(lat*PI/180))/PI)/2});
const kmApart=(a,b)=>{const R=6371,dLat=(b[0]-a[0])*PI/180,dLon=(b[1]-a[1])*PI/180,h=Math.sin(dLat/2)**2+Math.cos(a[0]*PI/180)*Math.cos(b[0]*PI/180)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
const apart=(A,B)=>Math.hypot(A.mx-B.mx,A.my-B.my);
const Z_NEAR=12.5,Z_CLOSE=15.5; // 머무는 장면의 확대 범위(동네 ~ 골목)
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
 const home=S.find(s=>s.fromLL)?.fromLL||null;for(const s of S)if(s.home&&home)s.ll=home;
 for(const s of S)if(home&&s.ll&&kmApart(home,s.ll)<80)s.costume=''; // 집 근처(출발 공항 포함)에서는 평소 옷
 tl.map=S.some(s=>s.ll);
 if(tl.map){for(let i=1;i<S.length;i++)if(!S[i].ll)S[i].ll=S[i-1].ll;for(let i=S.length-2;i>=0;i--)if(!S[i].ll)S[i].ll=S[i+1].ll;for(const s of S)Object.assign(s,merc(s.ll[0],s.ll[1]));}
 else{const step=300/(256*2**14);S.forEach((s,i)=>{s.mx=.5+Math.sin(i*1.15+.5)*step*.6;s.my=.5-i*step;});} // 좌표를 하나도 못 찾으면 지도 없이 줄지어 세운다
 // 가까운 이웃이 화면에 들어오는 선에서 최대한 클로즈업
 S.forEach((s,i)=>{let z=Z_CLOSE;for(const j of [i-1,i+1]){const o=S[j];if(!o)continue;const d=apart(s,o);if(d<1e-9)continue;const f=Math.log2(380/(d*256));if(f>=Z_NEAR)z=Math.min(z,f);}s.z=s.home?Z_NEAR:clamp(z,Z_NEAR,Z_CLOSE);});
 // 걸어서 보여 주기엔 먼 구간은 "화면 전환 + 멀리서 본 지도"로 처리
 for(const g of tl.segs)if(g.type==='move'){const A=S[g.from],B=S[g.to],d=apart(A,B),zMin=Math.min(A.z,B.z);g.jump=g.plane||d*256*2**zMin>1500;g.zMid=d<1e-9?zMin:clamp(Math.log2(520/(d*256)),1.8,zMin);}
 return retime(tl);}

/* ---------- 지도 타일과 카메라 ---------- */
const TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILES=new Map();
function tile(z,x,y){const k=z+'/'+x+'/'+y;let e=TILES.get(k);
 if(!e){const img=new Image();img.crossOrigin='anonymous';img.referrerPolicy='origin';e={img,ok:false,done:false};img.onload=()=>{e.ok=true;e.done=true;};img.onerror=()=>{e.done=true;};
  img.src=TILE_URL.replace('{z}',z).replace('{x}',x).replace('{y}',y);TILES.set(k,e);}
 return e;}
// 기울어진 카메라에 보이는 바닥 범위(좌우 XR, 뒤쪽 FAR, 앞쪽 NEAR)를 덮는 타일들
const XR=480,FAR=1380,NEAR=440;
function groundTiles(cam,fn){const zi=clamp(Math.floor(cam.z),0,19),k=Math.pow(2,cam.z-zi),n=2**zi,px=cam.cx*256*n,py=cam.cy*256*n;
 for(let ty=Math.floor((py-FAR/k)/256);ty<=Math.floor((py+NEAR/k)/256);ty++){if(ty<0||ty>=n)continue;
  for(let tx=Math.floor((px-XR/k)/256);tx<=Math.floor((px+XR/k)/256);tx++)fn(zi,((tx%n)+n)%n,ty,(tx*256-px)*k,(ty*256-py)*k,256*k,zi+'/'+tx+'/'+ty);}}
/** 시간 t 의 지도 중심·확대. 가까운 이동은 클로즈업을 유지한 채 따라가고, 먼 이동은 A → (전환) → 멀리서 본 지도 → (전환) → B. */
export function cameraAt(tl,t){const tt=clamp(t,0,tl.total-1e-4),seg=tl.segs.find(s=>tt>=s.start&&tt<s.start+s.dur)||tl.segs.at(-1),S=tl.stops;
 if(seg.type!=='move'){const s=S[seg.i];return {seg,p:(tt-seg.start)/seg.dur,cx:s.mx,cy:s.my,z:s.z,fade:0,phase:''};}
 const A=S[seg.from],B=S[seg.to],p=(tt-seg.start)/seg.dur;
 if(!seg.jump){const e=ease(p);return {seg,p,cx:A.mx+(B.mx-A.mx)*e,cy:A.my+(B.my-A.my)*e,z:A.z+(B.z-A.z)*e,fade:0,phase:''};}
 if(p<.1)return {seg,p,cx:A.mx,cy:A.my,z:A.z,fade:p/.1,phase:'a'};
 if(p>.9)return {seg,p,cx:B.mx,cy:B.my,z:B.z,fade:1-(p-.9)/.1,phase:'b'};
 const q=ease((p-.1)/.8);return {seg,p,cx:A.mx+(B.mx-A.mx)*q,cy:A.my+(B.my-A.my)*q,z:seg.zMid,fade:p<.2?1-(p-.1)/.1:p>.8?(p-.8)/.1:0,phase:'mid'};}
/** 재생에 필요한 타일을 미리 받아 둔다(녹화 중 빈 지도가 찍히지 않게). */
export async function preloadTiles(tl,maxMs=8000){if(!tl.map)return;const asked=new Set();
 for(let t=0;t<=tl.total;t+=.15)groundTiles(cameraAt(tl,t),(z,x,y)=>asked.add(tile(z,x,y)));
 const until=Date.now()+maxMs;while(Date.now()<until&&[...asked].some(e=>!e.done))await new Promise(r=>setTimeout(r,120));}

/** 3D 장면(journey3d.js)에 넘길 한 장면의 상태 */
export function frameAt(tl,t){const cam=cameraAt(tl,t),{seg,p}=cam,S=tl.stops,sc=256*Math.pow(2,cam.z),moving=seg.type==='move',mid=cam.phase==='mid';
 const L=i=>({x:(S[i].mx-cam.cx)*sc,z:(S[i].my-cam.cy)*sc});
 const cur=!moving?seg.i:seg.jump?(cam.phase==='a'?seg.from:seg.to):(p<.5?seg.from:seg.to),stop=S[cur];
 const here=!moving||cam.phase==='a'||cam.phase==='b'; // 일행이 어떤 장소 위에 서 있는가
 let heading=0;if(moving){const A=L(seg.from),B=L(seg.to);heading=Math.atan2(B.x-A.x,B.z-A.z);}
 const tiles=[];if(tl.map)groundTiles(cam,(z,x,y,lx,lz,size,key)=>{const e=tile(z,x,y);if(e.ok)tiles.push({key,img:e.img,x:lx,z:lz,size});});
 const edge=seg.type==='dwell'?Math.min(1,p*5,(1-p)*5):seg.type==='end'?Math.min(1,p*5):0;
 // 표정: 좋아하는 곳에서는 먼저 놀란 얼굴(wow)이었다가 활짝 웃고, 먹을 땐 오물오물, 사진 찍을 땐 윙크 …
 const act=seg.type==='dwell'?stop.react.act:seg.type==='end'?'cheer':cam.phase==='a'?'wave':'';
 const mood=seg.type==='end'?'happy':seg.type==='dwell'?({cheer:p<.32?'wow':'happy',pose:p<.4?'smile':'wink',eat:'yum',relax:'relaxed',sleep:'sleepy',wave:'smile'})[act]||'normal':act==='wave'?'smile':'normal';
 return {t,cam,seg,p,cur,stop,moving,here,tiles,dolly:1-.17*edge,fade:cam.fade,
  stops:S.map((s,i)=>{const q=L(i),state=i===cur&&here?2:i<=cur?1:0;return {...q,state,showProp:!mid&&state>0&&Math.hypot(q.x,q.z)<1500};}),
  legs:S.slice(1).map((s,i)=>{const a=L(i),b=L(i+1);return {ax:a.x,az:a.z,bx:b.x,bz:b.z,fly:s.via==='plane',seen:i+1<=cur};}),
  party:{visible:!mid,costume:stop.costume||'',walking:moving&&!seg.jump,heading,act,mood},
  vehicle:mid?{kind:seg.plane?'plane':'train',heading:heading-PI/2}:null,
  night:typeof document!=='undefined'&&document.body.classList.contains('night')};}

/* ---------- 3D 장면 위에 덧그리는 2D: 이름표·장소 이름·말풍선·제목·진행 막대 ---------- */
function pill(ctx,text,cx,cy,o={}){ctx.font=(o.font||'800 22px ')+FONT;const tw=ctx.measureText(text).width+(o.pad||30),h=o.h||42,x=clamp(cx-tw/2,12,W-12-tw);
 ctx.fillStyle=o.bg||'rgba(255,255,255,.96)';if(o.line){ctx.strokeStyle=o.line;ctx.lineWidth=2;}ctx.beginPath();rr(ctx,x,cy-h/2,tw,h,h/2);ctx.fill();if(o.line)ctx.stroke();
 ctx.fillStyle=o.fg||INK;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x+tw/2,cy+1);return {x,w:tw};}
const nameTags=(ctx,stage,members)=>stage.heads().forEach((h,k)=>{if(h)pill(ctx,members[k].label,h.x,h.y,{font:'800 19px ',h:30,pad:24,bg:members[k].me?'#f6c945':'rgba(34,40,54,.86)',fg:members[k].me?INK:'#fff'});});
export function drawOverlay(ctx,tl,f,stage,members){const {seg,p,stop,t}=f,night=f.night,n=members.length,dwell=seg.type==='dwell';
 if(f.party.visible&&seg.type!=='end'){nameTags(ctx,stage,members);
  if(f.here){const sp=f.stops[f.cur],top=stage.project(sp.x,290,sp.z-195),ly=clamp(top.y,186,H-200);
   ctx.font='800 24px '+FONT;const label=fit(ctx,(stop.time?stop.time+'  ':'')+stop.title,360),box=pill(ctx,label,top.x,ly,{font:'800 24px ',h:46,pad:36,bg:night?'rgba(36,46,41,.95)':'rgba(255,255,255,.96)',fg:night?'#eef5ef':'#243d34',line:night?'#52685d':'#dfe5d6'});
   if(stop.firstOfDay)pill(ctx,(stop.dayIdx+1)+'일 차',box.x+34,ly-40,{font:'800 19px ',h:28,pad:22,bg:'#285c4b',fg:'#fff'});
   if(dwell&&stop.react.say&&p>.12&&p<.92){const who=stage.heads()[f.cur%n]||stage.heads().find(Boolean);if(who)pill(ctx,stop.react.say,who.x+(who.x>W/2?-96:96),who.y-44,{h:44,pad:32,line:'#d9dee6'});}
   if(dwell&&tl.group==='couple'&&n>=2){const a=stage.heads()[0],b=stage.heads()[1];if(a&&b){const u=(t*.6)%1;ctx.globalAlpha=1-u;ctx.fillStyle='#ff5a7a';ctx.font='40px '+FONT;ctx.textAlign='center';ctx.fillText('♥',(a.x+b.x)/2,Math.min(a.y,b.y)-84-u*44);ctx.globalAlpha=1;}}
   if(dwell&&stop.react.act==='pose'&&p>.42&&p<.5){ctx.fillStyle='rgba(255,255,255,'+(1-Math.abs(p-.46)/.04).toFixed(2)+')';ctx.fillRect(0,0,W,H);}}}
 if(f.fade>0){ctx.fillStyle='rgba(244,248,251,'+clamp(f.fade,0,1).toFixed(2)+')';ctx.fillRect(0,0,W,H);} // 먼 이동의 화면 전환
 // 제목·날짜
 ctx.fillStyle=night?'rgba(36,46,41,.94)':'rgba(255,255,255,.94)';fillRR(ctx,24,24,W-48,104,26);
 ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=night?'#eef5ef':'#243d34';ctx.font='900 30px '+FONT;ctx.fillText(fit(ctx,tl.title,W-110),50,60);
 ctx.fillStyle=night?'#acc0b1':'#697c70';ctx.font='700 22px '+FONT;ctx.fillText(stop.dayIdx>=0?(stop.dayIdx+1)+'일 차 · '+(api().fmtDate?.(stop.date)||stop.date||''):'',50,100);
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
#jrCanvas{display:block;margin:auto;max-width:100%;max-height:58dvh;width:auto;height:auto;border-radius:14px;border:1px solid var(--border)}.jr-controls{display:flex;gap:7px;flex-wrap:wrap;justify-content:center}
.av-top{display:grid;grid-template-columns:150px minmax(0,1fr);gap:12px;align-items:center}#avCanvas{width:150px;height:174px;border-radius:14px;background:var(--soft)}
.av-group{display:grid;gap:5px}.av-group>span{font-weight:740;font-size:12px}.av-chips{display:flex;gap:6px;flex-wrap:wrap}.av-chips button{min-height:36px;min-width:36px;padding:6px 11px;border-radius:18px;border:2px solid var(--border);background:var(--card);color:var(--ink);font-size:12px;font-weight:750}
.av-chips button.swatch{padding:0;width:36px;border-radius:50%}.av-chips button.active{border-color:#285c4b;box-shadow:0 0 0 2px #285c4b33}body.night .av-chips button.active{border-color:#92c6ac}
.av-slider{display:grid;grid-template-columns:52px minmax(0,1fr) 64px;gap:8px;align-items:center;font-size:11px;font-weight:600;color:var(--muted)}.av-slider input{min-height:28px;padding:0;border:0;background:none;accent-color:#285c4b}
.hero-me{display:grid;justify-items:center;gap:3px;border:0;background:none;color:inherit;font-size:11px;font-weight:800;flex:none;padding:0}.hero-me .tk-face{width:96px;height:96px;background:#ffffff99;box-shadow:0 0 0 3px #f6c945}
.tk-face{border-radius:50%;background:var(--soft);object-fit:cover;object-position:50% 20%;flex:none}.trip-faces{display:flex;margin-top:7px;padding-left:2px}.trip-faces .tk-face{width:34px;height:34px;box-shadow:0 0 0 2px var(--card);margin-right:-7px}
.invite-member-row>.tk-face{width:44px;height:44px}.invite-member-row>.tk-face+div{flex:1;min-width:0}@media(max-width:600px){.hero-me .tk-face{width:66px;height:66px}}
.trip-party{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.trip-party-item{display:grid;justify-items:center;gap:2px;border:0;background:none;color:var(--ink);font-size:11px;font-weight:750;padding:2px;min-width:64px;max-width:84px}.trip-party-item span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.trip-party-item img{width:60px;height:60px;border-radius:50%;background:var(--soft);object-fit:cover;object-position:50% 20%}.trip-party-item.me img{box-shadow:0 0 0 2px #f6c945}
#avatarDialog .modal-content{max-height:92dvh;overflow:auto}@media(max-width:480px){.av-top{grid-template-columns:110px minmax(0,1fr)}#avCanvas{width:110px;height:128px}}`;
function el(tag,props={},kids=[]){const n=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else n.setAttribute(k,v);}for(const c of kids)n.append(c);return n;}
let stage3d=null;const load3d=()=>stage3d||(stage3d=import('./journey3d.js'));
const tripKind=()=>{const a=api(),doc=a.activeDoc?.()||{};return costumeKind(a.getTrip?.()?.country_code||doc.meta?.countryCode||doc.meta?.countries?.[0]);};

/* ---------- 여행 계획 화면: 여행 소개 카드에 함께 가는 사람들의 캐릭터를 보여 준다 ---------- */
const BLANK='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
let portraits=null;const portraitCache=new Map();
async function portraitOf(av,kind){const key=JSON.stringify([av,kind]);if(portraitCache.has(key))return portraitCache.get(key);
 if(!portraits)portraits=(await load3d()).createPortraits();const url=portraits.render(av,kind);if(portraitCache.size>60)portraitCache.clear();portraitCache.set(key,url);return url;}
function face(av,kind,size){const img=el('img',{src:BLANK,alt:'',width:String(size),height:String(size),class:'tk-face'});
 setTimeout(()=>portraitOf(av,av.costume==='on'?kind:'').then(url=>{img.src=url;}).catch(()=>{}),300);return img;}
/* 홈 화면: 인사 카드에 내 캐릭터. 누르면 꾸미기(여행 밖에서는 이 기기에 저장해 두고, 여행을 열 때 자동으로 적용) */
function renderHomeHero(openAvatar){const earth=document.querySelector('.home-hero .hero-earth'),me=api().getMyId?.();if(!earth||!me)return;
 let b=document.getElementById('heroMe');if(!b){b=el('button',{id:'heroMe',type:'button',class:'hero-me','aria-label':'내 캐릭터 꾸미기'});earth.before(b);b.addEventListener('click',()=>void openAvatar());}
 const saved=localAvatar(),av=cleanAvatar(saved,me),sig=JSON.stringify([av,!!saved]);if(b.dataset.sig===sig)return;b.dataset.sig=sig;
 b.replaceChildren(face(av,'',96),el('span',{text:saved?'내 캐릭터':'내 캐릭터 만들기'}));}
/* 홈 화면: 여행 카드마다 그 여행에 저장된 일행 캐릭터 */
function decorateTripCards(){const trips=api().getTrips?.()||[];
 document.querySelectorAll('.trip-card[data-trip-id]').forEach(card=>{if(card.querySelector('.trip-faces'))return;const t=trips.find(x=>x.id===card.dataset.tripId),list=Object.entries(t?.data?.avatars||{}).slice(0,6);if(!list.length)return;
  const kind=costumeKind(t.country_code);card.querySelector('.trip-card-info')?.append(el('div',{class:'trip-faces','aria-hidden':'true'},list.map(([id,raw])=>face(cleanAvatar(raw,id),kind,34))));});}
/* 초대 창: 참여자 이름 앞에 캐릭터 */
function decorateInvite(){const ms=party(),kind=tripKind();
 document.querySelectorAll('#inviteMemberList .invite-member-row').forEach((row,i)=>{if(!ms[i]||row.querySelector('.tk-face'))return;row.prepend(face(ms[i].av,kind,44));});}
/* 이 기기에 저장해 둔 내 캐릭터를, 아직 캐릭터가 없는 여행에 한 번 자동으로 적용한다(역할은 여행마다 다르므로 비운다). */
const applied=new Set();
function autoApply(){const a=api(),t=a.getTrip?.(),me=a.getMyId?.(),saved=localAvatar();if(!t||!me||!saved||applied.has(t.id))return;applied.add(t.id);if(a.activeDoc?.().avatars?.[me])return;
 const av={...cleanAvatar(saved,me),role:''};a.saveTrip?.(d=>{d.avatars??={};d.avatars[me]??=av;},'내 캐릭터를 이 여행에 적용했어요.').catch(()=>{});}
function renderPartyStrip(openAvatar){const anchor=document.querySelector('.trip-intro .chip-row');if(!anchor||!api().getTrip?.())return;
 let strip=document.getElementById('tripParty');if(!strip){strip=el('div',{id:'tripParty',class:'trip-party',role:'group','aria-label':'함께 가는 사람들'});anchor.after(strip);}
 const members=party(),kind=tripKind(),sig=JSON.stringify([kind,members.map(m=>[m.id,m.label,m.av])]);if(strip.dataset.sig===sig)return;strip.dataset.sig=sig;
 strip.replaceChildren(...members.map(m=>{const img=el('img',{src:BLANK,alt:'',width:'60',height:'60'}),name=el('span',{text:m.label});
  const item=m.me?el('button',{type:'button',class:'trip-party-item me','aria-label':m.label+' · 내 캐릭터 꾸미기',title:'내 캐릭터 꾸미기'},[img,name]):el('div',{class:'trip-party-item'},[img,name]);
  if(m.me)item.addEventListener('click',()=>void openAvatar());
  // 3D 는 화면이 한가할 때 불러와 그림만 채운다. 실패하면 동그란 빈칸으로 남는다.
  setTimeout(()=>portraitOf(m.av,m.av.costume==='on'?kind:'').then(url=>{img.src=url;}).catch(()=>{}),400);return item;}));}

function mountJourney(){
 const dlg=el('dialog',{id:'journeyDialog','aria-labelledby':'jrTitle'});
 dlg.innerHTML=`<div class="modal-content"><header class="modal-header"><h3 id="jrTitle">🎬 우리 여행 동선</h3><button type="button" class="btn icononly" data-jr="close" aria-label="닫기">×</button></header>
 <div class="jr-seg" role="group" aria-label="재생 범위"><button type="button" data-jr-mode="day">선택한 하루</button><button type="button" data-jr-mode="trip">여행 전체</button></div>
 <canvas id="jrCanvas" width="${W}" height="${H}" role="img" aria-label="캐릭터들이 지도 위에서 일정 순서대로 이동하는 애니메이션"></canvas>
 <div class="jr-controls"><button type="button" class="btn primary" data-jr="play">⏸ 멈춤</button><button type="button" class="btn" data-jr="restart">↺ 처음부터</button><button type="button" class="btn" data-jr="speed">속도 ×1</button><button type="button" class="btn" data-jr="rec">⬇ 영상 저장</button></div>
 <p class="tiny" id="jrHint">여행 전체는 출발부터 집에 돌아올 때까지 빠르게 보여 줘요. 영상 저장은 처음부터 끝까지 한 번 재생하며 녹화합니다.</p></div>`;
 document.body.append(dlg);
 const canvas=dlg.querySelector('#jrCanvas'),ctx=canvas.getContext('2d'),gl=el('canvas',{width:W,height:H}),btn=k=>dlg.querySelector(`[data-jr="${k}"]`);
 const s={tl:null,members:[],t:0,playing:false,speed:1,raf:0,last:0,rec:null,chunks:[],job:0,busy:'',stage:null};
 const hint=dlg.querySelector('#jrHint'),HINT=hint.textContent;
 const paintButtons=()=>{btn('play').textContent=s.playing?'⏸ 멈춤':'▶ 재생';btn('speed').textContent='속도 ×'+s.speed;btn('rec').textContent=s.rec?'● 녹화 중…':'⬇ 영상 저장';
  for(const b of dlg.querySelectorAll('[data-jr-mode]')){b.classList.toggle('active',b.dataset.jrMode===s.tl?.mode);b.disabled=!!s.rec;}
  for(const k of ['play','restart','speed','rec'])btn(k).disabled=!!s.rec||!s.tl;hint.textContent=s.busy||HINT;};
 const finishRec=(save)=>{const r=s.rec;if(!r)return;s.rec=null;r.onstop=()=>{if(save&&s.chunks.length){const type=r.mimeType||'video/webm',blob=new Blob(s.chunks,{type}),a=el('a',{href:URL.createObjectURL(blob),download:'tripkku-'+(s.tl?.title||'trip').replace(/[\\/:*?"<>|\s]+/g,'_').slice(0,40)+(type.includes('mp4')?'.mp4':'.webm')});
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),8000);api().toast?.('여행 영상을 저장했어요.');}s.chunks=[];};
  try{r.stop();}catch{}paintButtons();};
 const tick=now=>{const dt=Math.min(.05,(now-s.last)/1000);s.last=now;s.raf=requestAnimationFrame(tick);
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
  if(tl.map){s.busy='지도를 불러오는 중…';hint.textContent=s.busy;await preloadTiles(tl);if(job!==s.job)return true;}
  else api().toast?.('장소 위치를 찾지 못해 지도 없이 보여 드려요.');
  s.members=party();s.stage.setScene(tl,s.members);s.busy='';s.tl=tl;s.t=0;s.playing=true;paintButtons();return true;};
 const open=async mode=>{if(!dlg.open)dlg.showModal();cancelAnimationFrame(s.raf);s.last=performance.now();s.raf=requestAnimationFrame(tick);
  if(!(await load(mode))&&!(await load(mode==='trip'?'day':'trip')))dlg.close();};
 dlg.addEventListener('close',()=>{cancelAnimationFrame(s.raf);finishRec(false);s.playing=false;s.job++;});
 btn('close').addEventListener('click',()=>dlg.close());
 btn('play').addEventListener('click',()=>{if(s.t>=s.tl.total)s.t=0;s.playing=!s.playing;paintButtons();});
 btn('restart').addEventListener('click',()=>{s.t=0;s.playing=true;paintButtons();});
 btn('speed').addEventListener('click',()=>{s.speed=s.speed===1?2:s.speed===2?.5:1;paintButtons();});
 dlg.querySelectorAll('[data-jr-mode]').forEach(b=>b.addEventListener('click',()=>void load(b.dataset.jrMode)));
 btn('rec').addEventListener('click',()=>{
  const mime=window.MediaRecorder&&canvas.captureStream?['video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m)):null;
  if(!mime)return api().toast?.('이 브라우저는 영상 저장을 지원하지 않아요. 기기의 화면 녹화를 이용해 주세요.');
  try{s.chunks=[];s.rec=new MediaRecorder(canvas.captureStream(30),{mimeType:mime,videoBitsPerSecond:5e6});s.rec.ondataavailable=e=>{if(e.data.size)s.chunks.push(e.data);};s.rec.start(500);}
  catch(e){s.rec=null;return api().toast?.('영상 저장을 시작하지 못했어요: '+e.message);}
  s.speed=1;s.t=0;s.playing=true;paintButtons();});
 return open;}

function mountAvatar(){
 const dlg=el('dialog',{id:'avatarDialog','aria-labelledby':'avTitle'});
 dlg.innerHTML=`<div class="modal-content"><header class="modal-header"><h3 id="avTitle">🧑‍🎨 내 캐릭터 꾸미기</h3><button type="button" class="btn icononly" data-av="close" aria-label="닫기">×</button></header>
 <div class="av-top"><canvas id="avCanvas" width="300" height="348" role="img" aria-label="내 캐릭터 미리보기"></canvas><div id="avRel" style="display:grid;gap:10px"></div></div>
 <div id="avParts" style="display:grid;gap:10px"></div>
 <footer class="modal-actions"><button type="button" class="btn" data-av="random">🎲 랜덤</button><button type="button" class="btn" data-av="cancel">취소</button><button type="button" class="btn primary" data-av="save">저장</button></footer></div>`;
 document.body.append(dlg);
 const canvas=dlg.querySelector('#avCanvas'),rel=dlg.querySelector('#avRel'),parts=dlg.querySelector('#avParts');
 const s={av:null,group:'friends',raf:0,preview:null};
 const group=(title,chips)=>el('div',{class:'av-group'},[el('span',{text:title}),el('div',{class:'av-chips'},chips)]);
 const chip=(label,active,onClick,color)=>{const b=el('button',{type:'button',class:(color?'swatch ':'')+(active?'active':''),'aria-pressed':String(active)});
  if(color){b.style.background=color;b.setAttribute('aria-label',label);}else b.textContent=label;b.addEventListener('click',onClick);return b;};
 const refresh=()=>s.preview?.set(s.av,s.av.costume==='on'?tripKind():'');
 const paint=()=>{
  const set=(k,v)=>()=>{s.av[k]=v;paint();};
  const custom=el('input',{maxlength:'8',placeholder:'역할 직접 입력 (예: 막내)','aria-label':'역할 직접 입력'});custom.value=ROLES[s.group].includes(s.av.role)?'':s.av.role;
  custom.addEventListener('input',()=>{s.av.role=custom.value.trim().slice(0,8);rel.querySelectorAll('[data-role]').forEach(b=>b.classList.remove('active'));});
  const roleChips=[chip('없음',!s.av.role,set('role','')),...ROLES[s.group].map(r=>{const b=chip(r,s.av.role===r,set('role',r));b.dataset.role=r;return b;})];
  if(!api().getTrip?.())rel.replaceChildren(el('p',{class:'muted',text:'우리 사이와 내 역할은 여행을 연 뒤에 정할 수 있어요. 여기서 꾸민 캐릭터는 여행을 열면 자동으로 적용돼요.'}));
  else rel.replaceChildren(group('우리 사이 (이 여행 전체에 적용)',GROUPS.map(([k,l])=>chip(l,s.group===k,()=>{s.group=k;if(!ROLES[k].includes(s.av.role))s.av.role='';paint();}))),group('내 역할',roleChips),custom);
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
  const av=cleanAvatar(s.av,me),g=s.group;try{localStorage.setItem(LOCAL_KEY,JSON.stringify(av));}catch{}
  document.dispatchEvent(new Event('tripkku-avatar-saved'));
  if(!a.getTrip?.()){a.toast?.('내 캐릭터를 저장했어요. 여행을 열면 자동으로 적용돼요.');return close();}
  try{await a.saveTrip(d=>{d.avatars??={};d.avatars[me]=av;d.meta??={};d.meta.groupType=g;},'내 캐릭터를 저장했어요.');close();}catch(e){a.toast?.('캐릭터 저장 실패: '+e.message);}});
 return async()=>{const a=api(),me=a.getMyId?.(),doc=a.activeDoc?.()||{};
  s.av=cleanAvatar(doc.avatars?.[me]||localAvatar(),me);s.group=GROUPS.some(g=>g[0]===doc.meta?.groupType)?doc.meta.groupType:'friends';
  paint();dlg.showModal();
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
 watch('tripList',decorateTripCards);watch('hiddenTripList',decorateTripCards);watch('inviteMemberList',decorateInvite);watch('homeScreen',home,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('tripkku-avatar-saved',()=>renderHomeHero(openAvatar));home();}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();}
