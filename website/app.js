import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm';
import {CONFIG} from './config.js';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const won=n=>new Intl.NumberFormat('ko-KR').format(Math.round(n))+'원';
const yen=n=>'¥'+new Intl.NumberFormat('ja-JP').format(Math.round(n));
const clone=o=>JSON.parse(JSON.stringify(o));
const urlMap=s=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(s||'Oita Japan');
const names=['10/31 (토)','11/01 (일)','11/02 (월)'];
const checklistLabels=[
 '10/31 공항버스 14:05편 운행·탑승 가능 확인',
 '첫날 HOTEL MYSTAYS Oita 짐 보관·늦은 체크인 확인',
 '11/1 WANDER COMPASS 짐 보관 접수·요금·회수 마감 확인',
 '11/1 벳푸역 14:40 유후인행 36번 버스 확인',
 '유후 모미지 도착 셔틀 5분 · 픽업 시각 사전 연락',
 '유후 모미지 가이세키 석식·조식 제공 시간 확인',
 '11/2 유후인 09:45 공항버스·료칸 송영 확인',
 '항공편 시간·수하물·여권·eSIM 점검'
];
function item(id,start,end,title,note,place,kind='visit'){return {id,start,end,title,note,place,kind};}
function defaultTrip(){return {
 title:'우리 오이타 2박 3일',walkMode:'near',notes:'',checklist:{},reels:[],
 luggagePlan:{version:16,mode:'staffed-station',checkedAt:'2026-10-28'},
 hotels:[{name:'HOTEL MYSTAYS Oita',day:1,price:96200,payer:'a',info:'10/31 체크인 → 11/1 11시 체크아웃 · 짐 먼저 맡기기',place:'HOTEL MYSTAYS Oita, 1-32 Niagemachi, Oita'},
 {name:'유후 모미지',day:2,price:517514,payer:'b',info:'11/1~11/2 · 석식(가이세키) + 조식 포함 · 유후인역 셔틀 약 5분',place:'旅館ゆふもみじ, 大分県由布市湯布院町川北662'}],
 days:[
 {day:1,title:'오이타 · 이치란·몽벨·이자카야',events:[
 item('d1-air','13:00','13:45','✈️ 오이타공항 도착','입국·수하물 예상 45분. 항공편 최종 확인.','Oita Airport','move'),
 item('d1-bus','14:05','15:08','🚌 공항버스 → 니아게마치','약 63분 · 성인 1인 약 1,600엔. 운행 시각 확인.','Niagemachi, Oita','move'),
 item('d1-bag','15:10','15:25','🧳 호텔에 캐리어 맡기기','HOTEL MYSTAYS Oita. 체크인 전 짐 보관 가능 여부 확인.','HOTEL MYSTAYS Oita','hotel'),
 item('d1-taxi','15:25','15:50','🚕 이치란 벤텐점 이동','택시 약 15~25분 예상.','Ichiran Oita Benten','move'),
 item('d1-ichiran','15:50','16:35','🍜 이치란 · 늦은 점심','대기·영업 변동 확인. 식사 후 역 방향 이동.','Ichiran Oita Benten','food'),
 item('d1-montbell','17:05','18:05','🎒 몽벨 오이타점 쇼핑','AMU PLAZA OITA 2층 · 20시 마감 전.','Montbell Oita AMU PLAZA','visit'),
 item('d1-izakaya','19:10','20:45','🍶 오이타 시내 이자카야','토요일 영업·예약 확인.','Kotsukotsuan Oita','food'),
 item('d1-checkin','20:45','21:05','🏨 HOTEL MYSTAYS Oita 체크인','맡겨둔 짐 수령 · 다음날 늦잠.','HOTEL MYSTAYS Oita','hotel')
 ]},
 {day:2,title:'가마지옥 → 유후인 모미지',events:[
 item('d2-out','10:45','11:00','🧳 호텔 체크아웃','늦게 준비하고 11시 퇴실.','HOTEL MYSTAYS Oita','hotel'),
 item('d2-jr','11:10','11:45','🚆 오이타역 → 벳푸역','JR 이동 및 대기 약 30~35분 계획치.','Beppu Station','move'),
 item('d2-bag','11:45','12:00','🧳 벳푸역 유인 짐보관','코인로커 대신 WANDER COMPASS BEPPU 직원에게 맡기기. 당일 접수·요금·회수 마감 확인.','WANDER COMPASS BEPPU, Beppu Station','visit'),
 item('d2-taxik','12:00','12:30','🚕 벳푸역 → 가마지옥','택시 예상 20~30분 · 1대 약 3,100~3,800엔 계획치.','Kamado Jigoku Beppu','move'),
 item('d2-kamado','12:30','13:20','♨️ 가마지옥 관람','입장 약 500엔/인. 17시 폐장.','Kamado Jigoku Beppu','visit'),
 item('d2-back','13:20','14:00','🚕 벳푸역 유인 보관소 복귀·짐 회수','WANDER COMPASS에서 맡긴 짐을 찾고 역 서쪽 출구로 이동. 접수증과 회수 마감 확인.','WANDER COMPASS BEPPU, Beppu Station','move'),
 item('d2-wait','14:00','14:40','🚌 유후인행 36번 버스 기다리기','벳푸역 서쪽 출구. 출발 편은 운행 날짜에 다시 확인.','Beppu Station West Exit','move'),
 item('d2-bus','14:40','15:32','🚌 벳푸역 → 유후인역 앞','36번 버스 · 약 52분 · 편도 약 1,100엔/인.','Yufuin Station Bus Center','move'),
 item('d2-shuttle','15:32','15:45','🚐 유후 모미지 픽업 셔틀','숙소 안내: 역에서 셔틀 약 5분. 픽업 대기 포함, 시각 사전 예약.','Yufu Momiji','move'),
 item('d2-room','15:45','16:05','🏡 모미지 체크인·짐 풀기','석식·조식 포함. 저녁 가이세키 시간 확인.','Yufu Momiji','hotel'),
 item('d2-walk','16:05','16:40','🌿 숙소 주변 산책','료칸 주변 20~35분 가볍게 걷기.','Yufu Momiji','visit'),
 item('d2-walkback','16:40','17:55','♨️ 숙소에서 온천·휴식','저녁 가이세키 전에 씻고 쉬기.','Yufu Momiji','hotel'),
 item('d2-dinner','18:00','19:30','🍱 유후 모미지 가이세키 석식','예약한 객실 요금에 포함, 실제 식사 시간은 숙소에 확인.','Yufu Momiji','food'),
 item('d2-night','19:30','21:00','🌙 온천·휴식','별도 외식 없음.','Yufu Momiji','hotel')
 ]},
 {day:3,title:'모미지 조식 → 오이타공항',events:[
 item('d3-breakfast','08:00','08:45','🍚 숙소 조식','모미지 숙박비 포함 · 실제 제공 시각 확인.','Yufu Momiji','food'),
 item('d3-out','08:45','09:15','🧳 체크아웃 준비','객실 짐 정리·송영 출발 확인.','Yufu Momiji','hotel'),
 item('d3-shuttle','09:15','09:30','🚐 모미지 → 유후인역 앞','셔틀 5분 + 탑승 준비. 오전 송영 가능 여부를 반드시 확인.','Yufuin Station Bus Center','move'),
 item('d3-bus','09:45','10:40','🚌 유후인 → 오이타공항','직행 공항버스. 약 55분 · 1인 약 2,000엔. 최신 시간표 확인.','Oita Airport','move'),
 item('d3-airport','10:40','13:20','🛂 체크인·출국 수속','14시 귀국 항공편 예시.','Oita Airport','visit'),
 item('d3-flight','14:00','15:45','✈️ 오이타 → 인천','항공권 실제 예약 시각 확인.','Incheon International Airport','move')
 ]}
 ],
 expenses:[{id:'stay1-mystays',day:1,title:'HOTEL MYSTAYS Oita · 숙박비',amount:96200,currency:'KRW',payer:'a',category:'숙소'},
 {id:'stay2-momiji',day:2,title:'유후 모미지 · 가이세키·조식 포함 숙박비',amount:517514,currency:'KRW',payer:'b',category:'숙소'}]
};}

const LUGGAGE_PATCHES=[
 {id:'d2-bag',before:{title:'🧳 벳푸역 짐 보관',note:'역 코인로커 또는 짐 보관. 빈자리·요금 확인.',place:'Beppu Station'},after:{title:'🧳 벳푸역 유인 짐보관',note:'코인로커 대신 WANDER COMPASS BEPPU 직원에게 맡기기. 당일 접수·요금·회수 마감 확인.',place:'WANDER COMPASS BEPPU, Beppu Station'}},
 {id:'d2-back',before:{title:'🚕 벳푸역 복귀·캐리어 회수',note:'택시 및 짐 회수·버스 승강장 이동 여유.',place:'Beppu Station'},after:{title:'🚕 벳푸역 유인 보관소 복귀·짐 회수',note:'WANDER COMPASS에서 맡긴 짐을 찾고 역 서쪽 출구로 이동. 접수증과 회수 마감 확인.',place:'WANDER COMPASS BEPPU, Beppu Station'}}
];
function unchangedLuggageEvent(event,patch){return event && ['title','note','place'].every(k=>event[k]===patch.before[k]);}
function luggageChangeCount(d){const events=d?.days?.find(x=>x.day===2)?.events||[];return LUGGAGE_PATCHES.filter(p=>unchangedLuggageEvent(events.find(e=>e.id===p.id),p)).length;}
function applyLuggageText(d){
 const events=d.days.find(x=>x.day===2)?.events||[];let changed=0,skipped=0;
 for(const patch of LUGGAGE_PATCHES){
  const event=events.find(e=>e.id===patch.id);
  if(unchangedLuggageEvent(event,patch)){Object.assign(event,patch.after);changed++;}
  else if(event && event.title!==patch.after.title)skipped++;
 }
 // Never overwrite manual edits, event times, expenses, reels or existing reservations.
 d.luggagePlan={version:16,mode:'staffed-station',checkedAt:'2026-10-28',manualPreserved:skipped};
 if(changed){d.checklist=d.checklist||{};d.checklist[2]=false;}
 return changed;
}
function renderLuggageState(){
 if(!data)return;
 const count=luggageChangeCount(data);
 $('luggageUpdateBanner').hidden=activeDay!==2 || count===0;
 $('applyLuggageTransport').hidden=count===0;
 $('luggageApplyState').textContent=count?`기존 일정 ${count}곳의 안내만 변경해요. 시간과 정산은 유지됩니다.`:
 (data.luggagePlan?.version===16?'현재 짐보관 안내가 반영되어 있어요. 직접 수정한 일정은 그대로 유지합니다.':'직접 수정한 일정은 보존했어요. 아래 안내와 실제 보관 장소를 대조해 주세요.');
}
let luggageSaving=false;
async function saveLuggagePlan(){
 if(luggageSaving||!data||!luggageChangeCount(data))return;
 luggageSaving=true;document.querySelectorAll('[data-apply-luggage]').forEach(b=>b.disabled=true);
 try{await mutate(d=>applyLuggageText(d),'짐 보관 안내를 친구와 공유하는 일정에 반영했어.');}
 finally{luggageSaving=false;document.querySelectorAll('[data-apply-luggage]').forEach(b=>b.disabled=false);}
}

function applyWalkMode(d,mode){
 d.walkMode=mode;
 const list=d.days.find(x=>x.day===2)?.events;
 if(!list)return;
 const at=list.findIndex(e=>e.id==='d2-walk');
 const after=list.findIndex(e=>e.id==='d2-walkback');
 if(at<0||after<0)return;
 if(mode==='center'){
  list[at]={...list[at],start:'16:05',end:'16:55',title:'🚕 택시로 유노츠보 거리 잠깐 구경',note:'유노츠보 거리 약 2.3km 편도 · 도보 왕복 대신 택시 권장. 가게 마감 임박 주의.',place:'Yunotsubo Kaido, Yufuin',kind:'visit'};
  list[after]={...list[after],start:'16:55',end:'17:55',title:'🚕 료칸 복귀·온천 준비',note:'택시로 복귀 후 18시 가이세키 준비. 택시 대기 시간에 따라 산책 축소.',place:'Yufu Momiji',kind:'move'};
 }else{
  list[at]={...list[at],start:'16:05',end:'16:40',title:'🌿 숙소 주변 산책',note:'료칸 가까이서 20~35분 가볍게 걷기.',place:'Yufu Momiji',kind:'visit'};
  list[after]={...list[after],start:'16:40',end:'17:55',title:'♨️ 숙소에서 온천·휴식',note:'저녁 가이세키 전에 씻고 쉬기.',place:'Yufu Momiji',kind:'hotel'};
 }
}
let client=null,user=null,room=null,data=null,revision=0,subscription=null,saveQueue=Promise.resolve(),pending=0;
let activeDay=1,activePage='schedule';
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(window._toastId);window._toastId=setTimeout(()=>$('toast').classList.remove('show'),3300);}
function status(s){$('syncStatus').textContent=s;}
function screen(id){['authScreen','createScreen','loadingScreen','appScreen'].forEach(k=>$(k).hidden=k!==id);$('shareBtn').hidden=id!=='appScreen';$('logoutBtn').hidden=id==='authScreen';}
function fail(id,msg){$(id).textContent=msg;status('연결 오류');}
async function signIn(provider){try{
  const ret=location.origin+location.pathname+location.search;
  const {error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:ret}});
  if(error)throw error;
 }catch(e){fail('authError',e.message+' · Supabase Auth 설정과 Redirect URL을 확인해 줘.');}}
function newInvite(){const b=new Uint8Array(24);crypto.getRandomValues(b);return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');}
async function fetchRoom(id){const {data:r,error}=await client.from('oita_rooms').select('id,invite_code,data,revision,updated_at').eq('id',id).single();if(error)throw error;return r;}
async function refreshRoom(){if(!room||pending>0)return;try{const r=await fetchRoom(room.id);if(r.revision>revision){room=r;data=r.data;revision=r.revision;renderAll();status('친구 변경 반영 ✓');}}catch(e){console.warn('업데이트 지연',e.message);}}
async function openRoom(r){room=r;data=r.data;revision=r.revision;screen('appScreen');renderAll();status('공동 저장 연결 ✓');
 if(subscription){await client.removeChannel(subscription);subscription=null;}
 subscription=client.channel('oita-shared-'+r.id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'oita_rooms',filter:'id=eq.'+r.id},()=>{void refreshRoom();}).subscribe();
 await fetchWeather();
}
async function enter(){screen('loadingScreen');try{
 const invite=new URLSearchParams(location.search).get('invite');
 if(invite){const {data:id,error}=await client.rpc('oita_join_room',{p_code:invite});if(error)throw error;return openRoom(await fetchRoom(id));}
 const {data:rows,error}=await client.from('oita_rooms').select('id,invite_code,data,revision,updated_at').order('updated_at',{ascending:false}).limit(1);
 if(error)throw error;
 if(rows?.length)return openRoom(rows[0]);
 screen('createScreen');status('로그인 완료');
 }catch(e){screen('authScreen');fail('authError','여행방 연결 실패: '+e.message+' · SQL 설정이나 초대 링크를 확인해 줘.');}}
async function init(){if(!CONFIG.supabaseUrl||!CONFIG.supabasePublishableKey){screen('authScreen');fail('authError','config.js의 Supabase 연결값을 확인해 줘.');return;}
 client=createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const {data:auth,error}=await client.auth.getSession();if(error)console.warn(error.message);
 user=auth?.session?.user||null;
 if(user){await enter();}else{screen('authScreen');status('로그인 필요');}
 client.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_IN'&&session?.user&&!user){user=session.user;setTimeout(()=>void enter(),0);}
   if(event==='SIGNED_OUT'){user=null;room=null;data=null;screen('authScreen');status('로그인 필요');}
 });
}
function attachHandlers(){
 document.querySelectorAll('[data-apply-luggage]').forEach(b=>b.addEventListener('click',()=>void saveLuggagePlan()));
 $('googleLogin').addEventListener('click',()=>void signIn('google'));
 $('kakaoLogin').addEventListener('click',()=>void signIn('kakao'));
 $('logoutBtn').addEventListener('click',()=>void client?.auth.signOut());
 $('createBtn').addEventListener('click',async()=>{
  $('createBtn').disabled=true;try{const token=newInvite();const {data:id,error}=await client.rpc('oita_create_room',{p_code:token,p_initial:defaultTrip()});if(error)throw error;
   history.replaceState({},'',location.pathname+'?invite='+token);await openRoom(await fetchRoom(id));toast('여행방 생성 완료! 친구 초대 링크를 보내 줘.');
  }catch(e){fail('createError','여행방 만들기 실패: '+e.message+' · SQL을 실행했는지 확인해 줘.');}finally{$('createBtn').disabled=false;}
 });
 $('shareBtn').addEventListener('click',async()=>{
  if(!room)return;const link=location.origin+location.pathname+'?invite='+encodeURIComponent(room.invite_code);
  try{if(navigator.share){await navigator.share({title:'우리 오이타 여행 · 함께 수정',url:link});}else{await navigator.clipboard.writeText(link);toast('친구 초대 링크 복사 완료!');}}catch(e){if(e.name==='AbortError')return;try{await navigator.clipboard.writeText(link);toast('초대 링크를 복사했어.');}catch(_){prompt('이 링크를 복사해서 친구에게 보내 줘',link);}}
 });
 document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>choosePage(b.dataset.page)));
 document.querySelectorAll('[data-day]').forEach(b=>b.addEventListener('click',()=>{activeDay=Number(b.dataset.day);renderTimeline();}));
 $('addEvent').addEventListener('click',()=>showEditor(null));
 $('cancelDialog').addEventListener('click',()=>$('editDialog').close());
 $('editForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget);const id=String(f.get('id'))||'new-'+crypto.randomUUID();
  const ev={id,day:Number(f.get('day')),start:String(f.get('start')),end:String(f.get('end')),title:String(f.get('title')).trim(),place:String(f.get('place')).trim(),note:String(f.get('note')).trim(),kind:'visit'};
  if(ev.end<=ev.start){toast('종료 시간이 시작 시간보다 늦어야 해.');return;}
  $('editDialog').close();void mutate(d=>{d.days.forEach(x=>x.events=x.events.filter(item=>item.id!==id));d.days[ev.day-1].events.push(ev);},'일정 저장 완료');
 });
 $('deleteEvent').addEventListener('click',()=>{const id=$('editForm').elements.namedItem('id').value;if(!id||!confirm('이 일정을 삭제할까?'))return;$('editDialog').close();void mutate(d=>d.days.forEach(x=>x.events=x.events.filter(item=>item.id!==id)),'일정 삭제 완료');});
 $('timeline').addEventListener('click',e=>{const b=e.target.closest('button[data-edit]');if(b)showEditor(b.dataset.edit);});
 document.querySelectorAll('input[name="walkMode"]').forEach(i=>i.addEventListener('change',e=>{void mutate(d=>applyWalkMode(d,e.target.value),'산책 동선 변경 완료');}));
 $('expenseForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget);const amount=Number(f.get('amount'));if(!Number.isFinite(amount)||amount<=0)return;
  const record={id:'exp-'+crypto.randomUUID(),title:String(f.get('title')).trim(),amount,currency:String(f.get('currency')),payer:String(f.get('payer')),category:String(f.get('category')),day:Number(f.get('day'))};
  void mutate(d=>{if(!d.expenses.some(x=>x.id===record.id))d.expenses.push(record);},'공용 지출 저장 완료');e.currentTarget.reset();});
 $('expenseList').addEventListener('click',e=>{const b=e.target.closest('[data-delete-expense]');if(!b||!confirm('이 지출 내역을 삭제할까?'))return;void mutate(d=>{d.expenses=d.expenses.filter(x=>x.id!==b.dataset.deleteExpense);},'지출 내역 삭제 완료');});
 $('checklist').addEventListener('change',e=>{const k=e.target.dataset.check;if(k!==undefined)void mutate(d=>{d.checklist[k]=e.target.checked;},'체크 상태 저장 완료');});
 $('saveMemo').addEventListener('click',()=>{const value=$('memo').value;void mutate(d=>{d.notes=value;},'메모 저장 완료');});
 $('reelForm').addEventListener('submit',e=>{
  e.preventDefault();const f=new FormData(e.currentTarget),raw=String(f.get('url')).trim();
  let u;try{u=new URL(raw);}catch(_){toast('올바른 링크를 넣어 줘.');return;}
  if(u.protocol!=='https:'||!validReelHost(u.hostname)){toast('인스타그램 또는 유튜브 링크만 저장할 수 있어.');return;}
  const r={id:'reel-'+crypto.randomUUID(),url:u.href,title:String(f.get('title')).trim().slice(0,90),place:String(f.get('place')).trim().slice(0,130),note:String(f.get('note')).trim().slice(0,350),category:String(f.get('category'))};
  if(!r.title){toast('링크 이름을 적어 줘.');return;}
  void mutate(d=>{d.reels=Array.isArray(d.reels)?d.reels:[];d.reels.unshift(r);},'친구와 공유 목록에 링크를 저장했어.');e.currentTarget.reset();
 });
 $('reelList').addEventListener('click',e=>{const b=e.target.closest('[data-delete-reel]');if(!b||!confirm('이 링크를 목록에서 삭제할까?'))return;void mutate(d=>{d.reels=(d.reels||[]).filter(x=>x.id!==b.dataset.deleteReel);},'링크 삭제 완료');});
 $('chatForm').addEventListener('submit',e=>{e.preventDefault();const msg=$('chatInput').value.trim().slice(0,600);if(!msg)return;$('chatInput').value='';void handleChat(msg);});
 document.querySelectorAll('[data-chat-quick]').forEach(b=>b.addEventListener('click',()=>void handleChat(b.dataset.chatQuick)));
 $('chatProposal').addEventListener('click',e=>{if(e.target.closest('[data-proposal-cancel]')){$('chatProposal').hidden=true;pendingProposal=null;}
  if(e.target.closest('[data-proposal-apply]')){const act=pendingProposal;pendingProposal=null;$('chatProposal').hidden=true;if(act)void applyAIProposal(act);}});
} 
function choosePage(page){activePage=page;document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
 ['schedule','transport','settlement','reels','assistant','notes'].forEach(p=>$(p+'Page').hidden=p!==page);
}
function renderOverview(){const sum=data.expenses.filter(x=>x.currency==='KRW').reduce((a,b)=>a+Number(b.amount),0);
 const paidA=data.expenses.filter(x=>x.currency==='KRW'&&x.payer==='a').reduce((a,b)=>a+Number(b.amount),0);
 const transfer=Math.abs(paidA-sum/2);
 $('overview').innerHTML=`<div class="mini"><small>10/31 숙소</small><strong>HOTEL MYSTAYS Oita</strong><em>내 결제 ${won(data.hotels[0].price)}</em></div><div class="mini"><small>11/01 숙소 · 가이세키/조식</small><strong>유후 모미지</strong><em>친구 결제 ${won(data.hotels[1].price)}</em></div><div class="mini"><small>공용 지출 (원화)</small><strong class="big">${won(sum)}</strong><em>1인 ${won(sum/2)}</em></div><div class="mini"><small>현재 숙소·공용 정산</small><strong class="big">${won(transfer)}</strong><em>${paidA<sum/2?'내가 친구에게':'친구가 나에게'} 송금</em></div>`;
}
function renderTimeline(){renderLuggageState();const day=data.days[activeDay-1];$('dayHeading').textContent=names[activeDay-1]+' · '+day.title;
 document.querySelectorAll('[data-day]').forEach(b=>b.classList.toggle('active',Number(b.dataset.day)===activeDay));
 const sorted=[...day.events].sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
 $('timeline').innerHTML=sorted.map(e=>`<article class="event"><span class="when">${esc(e.start)}–${esc(e.end)}</span><div><h3>${esc(e.title)}</h3><p>${esc(e.note)}</p><div class="eventfoot"><span class="tag">${e.kind==='move'?'이동':e.kind==='food'?'식사':e.kind==='hotel'?'숙소':'여행'}</span>${e.place?`<a href="${urlMap(e.place)}" target="_blank" rel="noopener">지도 보기 ↗</a>`:''}<button type="button" data-edit="${esc(e.id)}">수정</button></div></div></article>`).join('');
}
function showEditor(id){const entry=id?data.days.flatMap(d=>d.events).find(e=>e.id===id):null;
 const f=$('editForm');f.reset();f.elements.namedItem('id').value=entry?.id||'';f.elements.namedItem('day').value=String(entry?.day||activeDay);
 if(entry){const d=data.days.find(x=>x.events.some(y=>y.id===id));f.elements.namedItem('day').value=String(d.day);}
 f.elements.namedItem('start').value=entry?.start||'16:00';f.elements.namedItem('end').value=entry?.end||'17:00';f.elements.namedItem('title').value=entry?.title||'';f.elements.namedItem('note').value=entry?.note||'';f.elements.namedItem('place').value=entry?.place||'';
 $('dialogTitle').textContent=entry?'일정 수정':'일정 추가';$('deleteEvent').hidden=!entry;$('editDialog').showModal();
}
function renderLodgings(){const h=data.hotels;const all=data.expenses.filter(x=>x.currency==='KRW'&&x.category==='숙소');
 $('lodgings').innerHTML=`<h3>확정된 숙소 2곳</h3>${h.map((x,i)=>`<div class="lodging-row"><div><small>${i===0?'10/31 · 첫날':'11/01 · 둘째 날'}</small><b style="display:block">${esc(x.name)}</b><span>${esc(x.info)}</span><div><a href="${urlMap(x.place)}" target="_blank" rel="noopener" style="font-size:12px">지도 보기 ↗</a></div></div><div><strong>${won(x.price)}</strong><small style="display:block">${x.payer==='a'?'내 결제':'친구 결제'}</small></div></div>`).join('')}<p class="hint">숙소비는 공용 정산에 등록돼 있어. 별도로 다시 입력하면 중복 정산되므로 주의해 줘.</p>`;
 document.querySelectorAll('[name="walkMode"]').forEach(i=>i.checked=i.value===data.walkMode);
 $('walkNotice').textContent=data.walkMode==='center'?'택시 왕복을 전제로 오후 4시대 유노츠보 거리 방문. 거리가 약 2.3km 편도이므로 도보 왕복은 비추천이야.':'모미지 셔틀로 도착한 후 짐을 풀고 숙소 근처 산책. 저녁 식사를 여유 있게 준비할 수 있어.';
}
function currencies(code){const exp=data.expenses.filter(e=>e.currency===code);
 const total=exp.reduce((a,e)=>a+Number(e.amount),0);const a=exp.filter(e=>e.payer==='a').reduce((a,e)=>a+Number(e.amount),0);
 return {total,a,b:total-a,net:a-total/2,fmt:code==='JPY'?yen:won};}
function renderSettlement(){const krw=currencies('KRW'),jpy=currencies('JPY');
 const result=(x)=>x.total===0?'정산할 금액 없음':x.net>0?`친구 → 나 ${x.fmt(x.net)}`:x.net<0?`나 → 친구 ${x.fmt(-x.net)}`:'정산 완료';
 $('settlementSummary').innerHTML=`<div class="settlebox"><span>공용 지출 (원)</span><strong>${won(krw.total)}</strong></div><div class="settlebox"><span>나 / 친구 결제</span><strong>${won(krw.a)} / ${won(krw.b)}</strong></div><div class="settlebox"><span>원화 각자 부담</span><strong>${won(krw.total/2)}</strong></div><div class="settlebox wide"><span>원화 송금 결론</span><strong>${esc(result(krw))}</strong><small>엔화는 별도 정산: ${esc(result(jpy))}</small></div>`;
 $('expenseList').innerHTML=data.expenses.length?data.expenses.slice().reverse().map(e=>`<div class="expense-row"><div><b>${esc(e.title)}</b><small>${names[e.day-1]||'기타'} · ${esc(e.category)} · ${e.payer==='a'?'내 결제':'친구 결제'}</small></div><div><strong>${e.currency==='JPY'?yen(e.amount):won(e.amount)}</strong><button type="button" data-delete-expense="${esc(e.id)}">삭제</button></div></div>`).join(''):'<p class="hint">지출 기록이 없어.</p>';
}
function renderNotes(){
 $('checklist').innerHTML=checklistLabels.map((s,i)=>`<label class="checkitem"><input type="checkbox" data-check="${i}" ${data.checklist?.[i]?'checked':''}><span>${esc(s)}</span></label>`).join('');$('memo').value=data.notes||'';
}

// Instagram / YouTube links are stored within the same RLS-protected Oita trip data.
function validReelHost(host){const h=String(host||'').toLowerCase();return ['instagram.com','youtube.com','youtu.be'].some(x=>h===x||h.endsWith('.'+x));}
function renderReels(){const reels=Array.isArray(data.reels)?data.reels:[];
 $('reelList').innerHTML=reels.length?reels.map(r=>{
  let url='';try{const u=new URL(r.url);if(u.protocol==='https:'&&validReelHost(u.hostname))url=u.href;}catch(_){}
  const category=r.category==='food'?'🍜 맛집':r.category==='place'?'📍 장소':'🎥 영상';
  return `<article class="reel-card"><span class="reel-kind">${category}</span><strong>${esc(r.title)}</strong>${r.place?`<p>📍 ${esc(r.place)}</p>`:''}${r.note?`<p>${esc(r.note)}</p>`:''}<div class="reel-actions">${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">영상 보러 가기 ↗</a>`:''}${r.place?`<a href="${urlMap(r.place)}" target="_blank" rel="noopener noreferrer">지도 ↗</a>`:''}<button type="button" data-delete-reel="${esc(r.id)}">삭제</button></div></article>`;
 }).join(''):'<div class="card section-card" style="grid-column:1/-1;color:#697c74;font-size:13px">아직 저장한 링크가 없어. 인스타에서 찾은 음식점과 장소를 이곳에 모아봐.</div>';
}
let pendingProposal=null,chatBusy=false;
function chatBubble(s,mine=false){const e=document.createElement('div');e.className='chat-bubble '+(mine?'me':'bot');e.textContent=String(s).slice(0,2000);$('chatMessages').appendChild(e);$('chatMessages').scrollTop=$('chatMessages').scrollHeight;}
function chatAnswerLocal(msg){const m=msg.toLowerCase();
 if(/짐|캐리어|보관|로커|코인/.test(m))return '현재 숙소는 오이타 시내와 유후인에 있어 가마지옥(벳푸 간나와) 근처가 아니야. 첫날은 MYSTAYS에 맡기고, 둘째 날은 벳푸역 WANDER COMPASS 직원에게 맡겼다가 가마지옥 관람 후 찾아서 유후인으로 가는 동선을 권해. 숙소 보관은 가까운 숙소로 변경되고 보관이 가능하다고 확인될 때만 적용해. 교통·예약 탭에서 근거와 반영 상태를 볼 수 있어.';

 if(/정산|숙소비|돈|송금|결제|경비|예산/.test(m)){
  const k=currencies('KRW'),j=currencies('JPY');const who=k.net<0?'내가 친구에게':k.net>0?'친구가 나에게':'정산 완료';
  return `현재 공용 지출 총 ${won(k.total)}, 한 명당 ${won(k.total/2)}이야. ${who}${k.net===0?'':(' '+won(Math.abs(k.net))+'을 보내면 돼.')}${j.total?' 엔화는 '+yen(j.total)+' 별도 정산.':''}`;
 }
 if(/첫날|1일차|10\/31|토요일/.test(m))return '10/31: 오이타공항 → 공항버스 → HOTEL MYSTAYS 짐 보관 → 이치란 → 몽벨 → 이자카야. 1일 차 탭에서 각 시각과 지도 링크를 볼 수 있어.';
 if(/둘째|2일차|2일 차|11\/1|가마|벳푸/.test(m)){const events=data.days.find(d=>d.day===2)?.events||[];return '지금 저장된 둘째 날 일정이야.\n'+[...events].sort((a,b)=>a.start.localeCompare(b.start)).map(e=>`${e.start}–${e.end} ${e.title}`).join('\n');}
 if(/셋째|3일차|11\/2|공항버스/.test(m))return '11/2: 모미지 조식 → 체크아웃 → 유후인역 앞 이동 → 09:45 오이타공항행 버스 → 10:40 도착. 숙소 송영 예약과 공항버스 운행을 확인해야 해.';
 if(/셔틀|산책|유노츠보|걷기/.test(m))return '유후 모미지는 유후인역에서 셔틀 약 5분이야. 료칸에서 유노츠보까지 약 2.3km 편도라 왕복 도보는 1시간 이상 걸릴 수 있어. 기본은 숙소 주변 산책, 중심가 방문은 택시 왕복이 편해. 셔틀은 미리 예약해.';
 if(/이치란|몽벨/.test(m))return '이치란 벤텐점과 몽벨 오이타점은 모두 1일 차에 넣어뒀어. 2일 차에는 가마지옥과 유후인 이동에 집중하면 돼.';
 return null;
}
async function handleChat(msg){if(chatBusy)return;chatBubble(msg,true);
 const local=chatAnswerLocal(msg);if(local){chatBubble(local);return;}
 chatBusy=true;$('chatSend').disabled=true;chatBubble('Gemini에게 물어보는 중…');const bubble=$('chatMessages').lastElementChild;
 try{
  const {data:result,error}=await client.functions.invoke('oita-chat',{body:{roomId:room.id,message:msg}});
  if(error){let detail='';try{const c=await error.context?.json();detail=c?.error||'';}catch(_){}throw new Error(detail||'AI 서버 연결 실패');}
  if(!result?.reply)throw new Error('AI 응답이 비어 있어.');bubble.textContent=String(result.reply).slice(0,2000);
  if(result.action)showAIProposal(result.action);
 }catch(e){bubble.textContent='현재는 기본 안내 챗봇으로 동작하고 있어. 자유 질문용 Gemini 연결은 서버의 oita-chat Edge Function을 배포한 후 사용할 수 있어. ('+String(e.message||'연결 실패').slice(0,120)+')';}
 finally{chatBusy=false;$('chatSend').disabled=false;}
}
function showAIProposal(action){if(!action||typeof action!=='object'||!['add_event','update_event','delete_event'].includes(action.type))return;
 const title=String(action.title||'일정 변경').slice(0,100);
 if(action.type!=='add_event'){chatBubble('수정·삭제는 일정 화면에서 직접 확인하며 변경하는 방식으로 유지할게.');return;}
 const day=Number(action.day),start=String(action.start||''),end=String(action.end||'');
 if(![1,2,3].includes(day)||!/^\d\d:\d\d$/.test(start)||!/^\d\d:\d\d$/.test(end)||end<=start||!title)return;
 pendingProposal={type:'add_event',day,start,end,title,place:String(action.place||'').slice(0,160),note:String(action.note||'').slice(0,450)};
 $('chatProposal').hidden=false;$('chatProposal').innerHTML=`<p><b>일정 추가 제안</b><br>${esc(names[day-1])} · ${esc(start)}–${esc(end)}<br>${esc(title)}</p><button type="button" class="button dark" data-proposal-apply>일정에 반영</button><button type="button" class="button" data-proposal-cancel>취소</button>`;
}
async function applyAIProposal(a){if(!a||a.type!=='add_event')return;
 const day=data.days[a.day-1];const overlap=day.events.some(e=>a.start<e.end&&a.end>e.start);
 if(overlap){chatBubble('같은 시간의 기존 일정과 겹쳐서 자동으로 추가하지 않았어. 일정 화면에서 시간을 조정해 줘.');return;}
 const id='ai-'+crypto.randomUUID();await mutate(d=>{d.days[a.day-1].events.push({id,day:a.day,start:a.start,end:a.end,title:a.title,place:a.place,note:a.note,kind:'visit'});},'챗봇 제안을 일정에 저장했어.');chatBubble('새 일정이 친구와 공유되는 일정표에 저장됐어.');
}

function renderAll(){if(!data)return;renderOverview();renderTimeline();renderLodgings();renderSettlement();renderReels();renderNotes();choosePage(activePage);}
async function mutate(update,success){
 pending++;status('저장 중…');
 saveQueue=saveQueue.then(async()=>{
  for(let attempt=0;attempt<3;attempt++){
   const draft=clone(data);update(draft);
   const {data:newRev,error}=await client.rpc('oita_save_room',{p_id:room.id,p_data:draft,p_revision:revision});
   if(!error){data=draft;revision=newRev;renderAll();status('공동 저장 완료 ✓');toast(success);return;}
   if(String(error.message).includes('OITA_VERSION_CONFLICT')){
    const latest=await fetchRoom(room.id);data=latest.data;revision=latest.revision;continue;
   }
   throw error;
  }
  throw new Error('동시에 많은 수정이 발생했어. 화면을 갱신하고 다시 저장해 줘.');
 }).catch(e=>{status('저장 실패');toast('저장 실패: '+e.message);console.error(e);}).finally(()=>{pending--;if(pending===0)void refreshRoom();});
 return saveQueue;
}
async function fetchWeather(){try{
 const forCity=async(lat,lon)=>{const query=new URL('https://api.open-meteo.com/v1/forecast');query.searchParams.set('latitude',lat);query.searchParams.set('longitude',lon);query.searchParams.set('daily','temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code');query.searchParams.set('timezone','Asia/Tokyo');query.searchParams.set('start_date','2026-10-31');query.searchParams.set('end_date','2026-11-02');const res=await fetch(query);if(!res.ok)throw Error('weather');return res.json();};
 const [oita,yufu]=await Promise.all([forCity('33.239','131.610'),forCity('33.264','131.356')]);
 const days=[oita.daily,yufu.daily,yufu.daily];$('weather').innerHTML=days.map((w,i)=>{const temp=Number.isFinite(w.temperature_2m_max?.[i])?`${Math.round(w.temperature_2m_min[i])}~${Math.round(w.temperature_2m_max[i])}℃`:'예보 대기';return `<div class="weather-item"><b>${names[i]} · ${i===0?'오이타':'유후인'}</b><span>${esc(temp)}</span><small>강수확률 ${w.precipitation_probability_max?.[i]??'—'}% · Open-Meteo</small></div>`;}).join('');
 }catch(e){$('weather').innerHTML='<div class="weather-item" style="grid-column:1/-1">날씨 조회가 지연되고 있어. 출발 전 기상청·현지 예보를 다시 확인해 줘.</div>';}}
attachHandlers();void init();
