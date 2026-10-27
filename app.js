import {getUiLanguage,isEnglish,setUiLanguage,translateUi,translateString} from './i18n.js';
import {earthAvatarHtml} from './earth-avatar.js';
import {SAMPLE_COORDS,knownDestination,geocodeCity,destinationGlobeHtml,dateRange,fetchTravelWeather,weatherLabel,weatherMood} from './destination-map.js';
import {CONFIG} from './config.js';
import {PRESETS,clonePreset,safeNum,googleDirections} from './presets.js';
import {Collaboration} from './collab.js?v=home-reels-20261027-2';
import {suggestWithAi,describeAction} from './ai.js';

const $=selector=>document.querySelector(selector);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE='tripkku-demo-v1:';
const PREF='tripkku-preset';
const THEME='tripkku-theme';
const isToss=CONFIG.platform==='toss';
const money=(n)=>new Intl.NumberFormat(isEnglish()?'en-US':'ko-KR').format(Math.round(Number(n)||0))+(isEnglish()?' KRW':'원');
const uiPrompt=(str,value)=>window.prompt(translateString(str),value);
const uiConfirm=str=>window.confirm(translateString(str));

// User-owned local appearance preferences. These are never uploaded to shared travel rooms.
const APPEARANCE_KEY='tripkku-appearance-v1';
const EARTH_PREF_KEY='tripkku-earth-style-v1';
const MOOD_OPTIONS={happy:['😄','신나는 지구'],angry:['😠','화난 지구'],sleepy:['😴','졸린 지구'],love:['🥰','설레는 지구']};
const EARTH_MAP_MODE='tripkku-globe-mode-v1';
let earthPrefs={mood:'happy'};
let earthMode=localStorage.getItem(EARTH_MAP_MODE)==='face'?'face':'map';
let activeGeo=SAMPLE_COORDS.oita;
let destinationLookupKey='';let weatherLookupKey='';let weatherUpdateSerial=0;
try{const value=JSON.parse(localStorage.getItem(EARTH_PREF_KEY)||'null');
  if(value&&MOOD_OPTIONS[value.mood])earthPrefs.mood=value.mood;
}catch{}
function applyEarthAppearance(){
  const appearance=document.body.dataset.appearance==='dark'?'dark':'light';
  const brand=$('#brandLogo');if(brand)brand.src='./assets/'+appearance+'-64.png';
  const mood=MOOD_OPTIONS[earthPrefs.mood]||MOOD_OPTIONS.happy;
  for(const id of ['customEarthArt','heroEarthArt']){
    const target=document.getElementById(id);
    if(!target)continue;
    const visual=earthMode==='map'?destinationGlobeHtml(activeGeo,appearance,isEnglish()?'en':'ko'):earthAvatarHtml(appearance,earthPrefs.mood,'basic');
    target.innerHTML=visual;
    target.setAttribute('aria-label',earthMode==='map'?(isEnglish()?'Destination map':'여행지 지도'):(appearance==='dark'?'밤 ':'낮 ')+mood[1]);
  }
  if($('#earthTagline'))$('#earthTagline').textContent=earthMode==='map'?(isEnglish()?activeGeo.nameEn||activeGeo.name||'Destination':activeGeo.nameKo||activeGeo.name||'여행 목적지'):(isEnglish()?'Earth mood: ':'지구 기분: ')+mood[1];
  for(const selector of ['data-appearance','data-mood','data-earth-mode']){
    document.querySelectorAll(`button[${selector}]`).forEach(button=>{
      const value=selector==='data-appearance'?appearance:selector==='data-mood'?earthPrefs.mood:earthMode;
      const active=button.getAttribute(selector)===value;
      button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));
    });
  }
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=appearance==='dark'?'#111c38':'#365a54';
  translateUi();
}
function updateWeatherPanel(state){
  window._tripkkuWeatherResult=state;
  const english=isEnglish(),h=$('#weatherHeadline'),days=$('#weatherDays');if(!h||!days)return;
  document.body.dataset.weather=state?.status==='ok'?weatherMood(state.days[0].code):'neutral';
  const intro={
    'dates-missing':english?'📅 Choose your travel dates to see the forecast.':'📅 여행 날짜를 설정하면 날씨를 보여줄게.',
    'not-yet':english?'📅 Forecast not released yet (available within 16 days).':'📅 예보 발표 전이야. 출발 16일 전부터 확인 가능해.',
    'past':english?'📅 Trip date has passed; a live forecast is unavailable.':'📅 지난 여행 날짜라 실시간 예보는 제공되지 않아.',
    'offline':english?'☁️ Weather unavailable. Try again when online.':'☁️ 날씨를 불러오지 못했어. 인터넷 연결 후 다시 확인해 줘.',
    'loading':english?'🌤️ Checking local weather...':'🌤️ 현지 날씨 확인 중…'
  };
  if(state?.status==='ok'){
    const first=state.days[0];
    h.textContent=`${weatherLabel(first.code,english?'en':'ko')} · ${first.date} · ${Math.round(first.min)}°~${Math.round(first.max)}°C`;
    days.innerHTML=state.days.map(x=>`<div class="weather-day"><span>${esc(x.date.slice(5))}</span><b>${esc(weatherLabel(x.code,english?'en':'ko'))}</b><span>${Math.round(x.min)}° / ${Math.round(x.max)}°</span></div>`).join('');
    if($('#heroWeatherText'))$('#heroWeatherText').textContent=h.textContent;
  }else{
    h.textContent=intro[state?.status]||intro['offline'];days.innerHTML='';
    if($('#heroWeatherText'))$('#heroWeatherText').textContent=h.textContent;
  }
}
async function refreshDestination(){
  if(!data)return;
  const trip=data.trip,key=`${trip.preset}:${trip.city}`;
  if(destinationLookupKey!==key){
    destinationLookupKey=key;
    activeGeo=knownDestination(trip)||SAMPLE_COORDS[trip.preset]||SAMPLE_COORDS.oita;
    applyEarthAppearance();
    const known=knownDestination(trip);
    if(!known){
      try{const found=await geocodeCity(trip.city);
        if(destinationLookupKey!==key)return;activeGeo=found;applyEarthAppearance();
      }catch(e){if(destinationLookupKey===key){activeGeo={...activeGeo,nameKo:'위치 검색 실패 · 샘플 지도',nameEn:'City not found · Sample map'};applyEarthAppearance();toast(isEnglish()?'City not found. Sample map shown; weather may not match.':'도시를 찾지 못했어. 샘플 지도이며 날씨가 다를 수 있어.');}}
    }
  }
  if($('#travelCity')&&document.activeElement!==$('#travelCity'))$('#travelCity').value=trip.city||'';
  const dates=dateRange(trip);
  if($('#travelStart')&&document.activeElement!==$('#travelStart'))$('#travelStart').value=dates?.start||'';
  if($('#travelEnd')&&document.activeElement!==$('#travelEnd'))$('#travelEnd').value=dates?.end||'';
  const wk=`${key}:${dates?.start||''}:${dates?.end||''}:${activeGeo.lat},${activeGeo.lon}`;
  if(wk===weatherLookupKey)return;
  weatherLookupKey=wk;
  const serial=++weatherUpdateSerial;
  updateWeatherPanel(dates?{status:'loading'}:{status:'dates-missing'});
  if(!dates)return;
  const output=activeGeo.nameKo?.startsWith('위치 검색 실패')?{status:'offline'}:await fetchTravelWeather(activeGeo,dates);
  if(serial===weatherUpdateSerial)updateWeatherPanel(output);
}

let activePreset=localStorage.getItem(PREF)||'oita';
let mode='demo';let data;let tripList=[];let updateTimer;
const repo=new Collaboration(CONFIG,async(reason)=>{
  if(reason==='auth')await initAccount();
  if(reason==='realtime'&&mode==='remote'){
    clearTimeout(updateTimer);updateTimer=setTimeout(async()=>{
      if(mode==='remote')try{data=await repo.readTrip(data.trip.id);render();}catch(e){notify('동기화 오류: '+e.message);}
    },350);
  }
});
const phrases={
  'ja-JP':[
    ['이것 얼마예요?','これはいくらですか？'],['두 명이에요.','二人です。'],['예약했어요.','予約しています。'],
    ['이곳에 가고 싶어요.','ここに行きたいです。'],['현금만 되나요?','現金のみですか？'],['계산 부탁드려요.','お会計をお願いします。']
  ],
  'en':[
    ['이것 얼마예요?','How much is this?'],['두 명이에요.','There are two of us.'],['예약했어요.','I have a reservation.'],
    ['이곳에 가고 싶어요.','I would like to go here.'],['카드 결제 되나요?','Do you accept credit cards?'],['계산 부탁드려요.','Could we have the bill, please?']
  ]
};

function makeLocal(key){
  const p=clonePreset(key);
  const trip={id:'demo-'+key,preset:p.key,title:p.title,city:p.city,dates:p.dates,language:p.language,
    description:p.description||'',budget_note:p.budgetNote||'',active_plan:p.plan,
    shared_target:p.shared_target,nights_a:p.nights_a,nights_b:p.nights_b};
  return {trip,members:[{user_id:'demo-me',nickname:'나',role:'owner'},{user_id:'demo-friend',nickname:'친구',role:'editor'}],
    finance:{personal_target:450000,airfare:0,personal_extra:0},
    expenses:p.expenses.map((x,i)=>({...x,id:'expense-'+i})),
    items:Object.entries(p.schedule).flatMap(([k,v])=>v.map((x,i)=>({id:k+'-'+i,plan_key:k,day_number:x.day,time_label:x.time,title:x.title,note:x.note})))
  };
}
function saveDemo(){if(mode==='demo')localStorage.setItem(STORE+activePreset,JSON.stringify(data));}
function loadDemo(key){activePreset=key;localStorage.setItem(PREF,key);mode='demo';
  try{data=JSON.parse(localStorage.getItem(STORE+key)||'null')||makeLocal(key);}catch{data=makeLocal(key);}
  render();}
function priceStatus(spent,target){
  const over=Math.max(0,spent-target);
  return {over,html:over>0?(isEnglish()?`🚨 Over budget <strong>+${money(over)}</strong>`:`🚨 목표 초과 <strong>+${money(over)}</strong>`):(isEnglish()?`✓ Within budget · ${money(target-spent)} left`:`✓ 목표 금액 이내 · ${money(target-spent)} 남았어`)};
}
function totalShared(){const {trip,expenses}=data;const ns=trip.active_plan==='A'?trip.nights_a:trip.nights_b;
  return safeNum(ns[0])+safeNum(ns[1])+expenses.reduce((sum,x)=>sum+safeNum(x.amount),0);
}
function currentPlanNights(){return data.trip.active_plan==='A'?data.trip.nights_a:data.trip.nights_b;}
function peopleCount(){return Math.max(1,data.members.length);}
function toast(message){const t=$('#toast');t.textContent=translateString(message);t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),3000);}
function fail(error){toast(error?.message||String(error));console.error(error);}
async function persistTrip(patch){
  if(mode==='remote'){await repo.updateTrip(data.trip.id,patch);data=await repo.readTrip(data.trip.id);}else{Object.assign(data.trip,patch);saveDemo();}render();
}
async function persistFinance(patch){
  if(mode==='remote'){await repo.updateFinance(data.trip.id,patch);data=await repo.readTrip(data.trip.id);}else{Object.assign(data.finance,patch);saveDemo();}render();
}
async function addExpense(x){
  if(mode==='remote'){await repo.addExpense(data.trip.id,x);data=await repo.readTrip(data.trip.id);}else{data.expenses.push({...x,id:crypto.randomUUID()});saveDemo();}render();
}
async function removeExpense(id){
  if(mode==='remote'){await repo.deleteExpense(id);data=await repo.readTrip(data.trip.id);}else{data.expenses=data.expenses.filter(x=>x.id!==id);saveDemo();}render();
}
async function addEvent(x){
  if(mode==='remote'){await repo.addItem(data.trip.id,x);data=await repo.readTrip(data.trip.id);}else{data.items.push({...x,id:crypto.randomUUID()});saveDemo();}render();
}
async function editEvent(id,x){
  if(mode==='remote'){await repo.updateItem(id,x);data=await repo.readTrip(data.trip.id);}else{Object.assign(data.items.find(i=>i.id===id),x);saveDemo();}render();
}
async function removeEvent(id){
  if(mode==='remote'){await repo.deleteItem(id);data=await repo.readTrip(data.trip.id);}else{data.items=data.items.filter(x=>x.id!==id);saveDemo();}render();
}
// Stored chat history: per authenticated user and trip, never shared across trips.
// Browser cache provides continuity on this device; DB table sync works across devices.
let chatHistory=[];
const CHAT_LIMIT=40;
function chatKey(){return mode==='remote'&&repo.user?`tripkku-chat:${repo.user.id}:${data.trip.id}`:null;}
function drawChat(){
  const area=$('#chatMessages');area.replaceChildren();
  if(!chatHistory.length){const intro=document.createElement('div');intro.className='bubble ai';intro.textContent='여행 일정 조회·추가·수정·삭제를 도와줄게! 변경은 승인 후 저장해 😊';area.append(intro);}
  for(const msg of chatHistory){const el=document.createElement('div');el.className='bubble '+(msg.role==='user'?'me':'ai');el.textContent=msg.text;area.append(el);}
  area.scrollTop=area.scrollHeight;
}
async function loadChat(){
  const key=chatKey();chatHistory=[];
  if(key){try{chatHistory=JSON.parse(localStorage.getItem(key)||'[]').slice(-CHAT_LIMIT);}catch{}
    try{const rows=await repo.readAiChat(data.trip.id);if(rows.length)chatHistory=rows.map(x=>({role:x.role,text:x.message})).slice(-CHAT_LIMIT);}catch(e){console.warn('Chat history DB not configured',e.message);}}
  drawChat();
}
function recordChat(role,text){
  chatHistory.push({role,text:String(text).slice(0,1600)});chatHistory=chatHistory.slice(-CHAT_LIMIT);
  const key=chatKey();if(key){try{localStorage.setItem(key,JSON.stringify(chatHistory));}catch{}
    repo.addAiChat(data.trip.id,role,String(text).slice(0,1600)).catch(e=>console.warn('Chat history cloud save failed',e.message));}
}
function setPageView(view){
  const next=view==='detail'?'detail':'home';
  document.body.dataset.view=next;
  const detailButton=document.getElementById('goTripDetail');
  if(detailButton)detailButton.setAttribute('aria-current',next==='detail'?'page':'false');
  window.scrollTo({top:0,behavior:'instant'});
}
function openSelectedTrip(){setPageView('detail');}
function setSidebarCollapsed(collapsed){
  document.body.classList.toggle('sidebar-collapsed',collapsed);
  const toggle=$('#sidebarToggle');if(toggle){toggle.textContent=collapsed?'▶ 펼치기':'◀ 접기';toggle.setAttribute('aria-expanded',String(!collapsed));toggle.title=collapsed?'사이드바 펼치기':'사이드바 접기';}
  try{localStorage.setItem('tripkku-sidebar-collapsed',collapsed?'1':'0');}catch{}
}
function renderSidebar(){
  const list=$('#sidebarTripList'),helper=$('#sidebarHelper');if(!list)return;
  helper.textContent=repo.user?(tripList.length?'여행을 선택하면 오른쪽에 크게 표시됩니다.':'아직 저장된 여행이 없습니다.'):'로그인 후 저장한 여행을 볼 수 있어요.';
  list.replaceChildren();
  for(const trip of tripList){
    const row=document.createElement('div');row.className='sidebar-trip-row'+(mode==='remote'&&data?.trip?.id===trip.id?' active':'');
    const btn=document.createElement('button');btn.type='button';btn.className='sidebar-trip';btn.dataset.sidebarTrip=trip.id;
    const title=document.createElement('b');title.textContent=trip.title||'이름 없는 여행';
    const sub=document.createElement('small');sub.textContent=[trip.city||'목적지 미정',trip.owner_id===repo.user?.id?'내가 만든 여행':'공유 여행'].join(' · ');
    btn.append(title,sub);row.append(btn);
    if(repo.user&&trip.owner_id===repo.user.id){
      const del=document.createElement('button');del.type='button';del.className='sidebar-delete-trip';del.dataset.deleteSidebarTrip=trip.id;
      del.title='여행 영구 삭제';del.setAttribute('aria-label',(trip.title||'여행')+' 삭제');del.textContent='🗑 삭제';row.append(del);
    }
    list.append(row);
  }
}
try{setSidebarCollapsed(localStorage.getItem('tripkku-sidebar-collapsed')==='1');}catch{}
function renderPresetPicker(){
  renderSidebar();
  $('#presetGrid').innerHTML=Object.values(PRESETS).map(p=>`<button class="preset ${data.trip.preset===p.key?'selected':''}" data-preset="${esc(p.key)}">
    <span class="emoji">${p.flag}</span><strong>🧪 샘플 · ${esc(p.title)}</strong><small>${esc(p.description)}</small></button>`).join('');
  const sel=$('#tripSelectArea');sel.hidden=!repo.user||!tripList.length;
  if(!sel.hidden){$('#tripSelect').innerHTML=tripList.map(t=>`<option value="${esc(t.id)}" ${mode==='remote'&&data.trip.id===t.id?'selected':''}>${esc(t.title)}</option>`).join('');}
  [...document.querySelectorAll('button[data-theme]')].forEach(b=>b.classList.toggle('selected',b.dataset.theme===document.body.dataset.theme));
}
function renderPlans(){
  $('#tripTitle').textContent=data.trip.title;
  $('#tripSubtitle').textContent=data.trip.description||data.trip.city;
  $('#tripDates').textContent=data.trip.dates;
  $('#tripTitle').textContent=(mode==='demo'?'🧪 샘플 · ':'')+data.trip.title;
  const deleteButton=$('#deleteTrip');if(deleteButton)deleteButton.hidden=mode!=='remote'||data.trip.owner_id!==repo.user?.id;
  const isOita=data.trip.preset==='oita';
  $('#flightNote').hidden=!isOita;
  $('#planALabel').textContent=isOita?'🛏️ 벳푸 일반 호텔 2박':'🛏️ 가성비 일반 호텔 연박';
  $('#planADesc').textContent=isOita?'한 호텔에서 연박 · 짐 이동 0회':'숙소 이동 최소화 · 관광/식비 우선';
  $('#planBLabel').textContent=isOita?'✨ 일반 호텔 1박 + 료칸 1박':'✨ 일반 호텔 + 특별 숙박';
  $('#planBDesc').textContent=isOita?'벳푸 안에서 1회 이동 · 료칸 객실 40만원 미만 목표':'둘째 날 다른 숙소에서 특별한 하루';
  for(const p of ['A','B'])$('#plan'+p).classList.toggle('active',data.trip.active_plan===p);
  const entries=data.items.filter(x=>x.plan_key===data.trip.active_plan);const days=Array.from({length:Math.min(30,Math.max(3,...entries.map(x=>Number(x.day_number)||1)))},(_,i)=>i+1);
  $('#eventList').innerHTML=days.map(d=>{
    const dayEvents=entries.filter(x=>x.day_number===d);
    return `<article class="day-col"><div class="day-top"><strong>DAY ${String(d).padStart(2,'0')}</strong><span>${d===1?'도착 & 밤':d===2?'본격 여행':'귀국'}</span></div>
      <div class="timeline-events">${dayEvents.length?dayEvents.map(e=>`<div class="timeline-event"><time>${esc(e.time_label)}</time><div><b>${esc(e.title)}</b><p>${esc(e.note)}</p>
        <div class="event-buttons"><button type="button" data-edit-event="${esc(e.id)}">수정</button><button type="button" class="danger" data-remove-event="${esc(e.id)}">삭제</button></div></div></div>`).join(''):'<p class="tinycopy">아직 등록된 일정이 없어.</p>'}</div></article>`;
  }).join('');
}
function renderBudget(){
  const trip=data.trip;const nights=currentPlanNights();const shared=totalShared();const per=shared/peopleCount();
  $('#sharedTarget').value=trip.shared_target;
  $('#night1').value=nights[0]??0;$('#night2').value=nights[1]??0;
  const sr=priceStatus(shared,trip.shared_target);
  $('#sharedSpent').textContent=money(shared);
  $('#sharedProgress').style.width=Math.min(100,trip.shared_target?100*shared/trip.shared_target:(shared?100:0))+'%';
  $('#sharedProgress').classList.toggle('over',sr.over>0);
  $('#sharedBudgetResult').innerHTML=sr.html;
  $('#sharedBudgetResult').classList.toggle('over',sr.over>0);
  $('#ryokanLimit').textContent=trip.active_plan==='B'&&trip.preset==='oita'?(
    safeNum(nights[1])>=400000?`🚨 료칸 1박 객실요금 40만원 기준 초과 ${money(safeNum(nights[1])-399999)} · 다른 후보를 찾아봐!`:
    `✨ 료칸은 2인 1실 객실 합계 40만원 미만 목표 · 현재 ${money(nights[1])}`
  ):'🛏️ 같은 호텔에서 편하게 2박. 객실 실제 예약가격은 변경해 주세요.';
  $('#ryokanLimit').classList.toggle('warning',trip.active_plan==='B'&&trip.preset==='oita'&&safeNum(nights[1])>=400000);
  $('#expenseList').innerHTML=data.expenses.map(x=>`<div class="expense"><div><strong>${esc(x.title)}</strong><small>${esc(x.category)}</small></div>
    <div class="money">${money(x.amount)} <button data-remove-expense="${esc(x.id)}" aria-label="경비 삭제">삭제</button></div></div>`).join('')||'<p class="tinycopy">아직 추가된 공동 경비가 없어.</p>';
  const fin=data.finance||{personal_target:0,airfare:0,personal_extra:0};
  const mySpent=Math.round(per)+safeNum(fin.airfare)+safeNum(fin.personal_extra);
  const pr=priceStatus(mySpent,safeNum(fin.personal_target));
  $('#personalTarget').value=fin.personal_target;
  $('#airfare').value=fin.airfare||'';
  $('#personalExtra').value=fin.personal_extra||'';
  $('#personalSpent').textContent=money(mySpent);
  $('#personalProgress').style.width=Math.min(100,fin.personal_target?100*mySpent/fin.personal_target:(mySpent?100:0))+'%';
  $('#personalProgress').classList.toggle('over',pr.over>0);
  $('#personalBudgetResult').innerHTML=pr.html;
  $('#personalBudgetResult').classList.toggle('over',pr.over>0);
  $('#personalFormula').textContent=`내 지출 예상 = 공동경비 1/${peopleCount()}인 ${money(per)} + 내 항공 ${money(fin.airfare)} + 개인경비 ${money(fin.personal_extra)}`;
}
function renderPlaces(){
  const preset=PRESETS[data.trip.preset]||PRESETS.oita;
  $('#placeGrid').innerHTML=preset.maps.map((p,i)=>`<article class="place"><span class="type">${esc(p.type)} #${String(i+1).padStart(2,'0')}</span><h3>${esc(p.name)}</h3><p>${esc(p.note)}</p>
     ${isToss?'<span class="tinycopy">토스 외부 연결 정책 검토 후 제공</span>':`<a href="${esc(googleDirections(p.query))}" target="_blank" rel="noopener noreferrer">🚶 대중교통 길찾기 ↗</a>`}</article>`).join('');
  $('#bookingList').innerHTML=isToss?'<span class="tinycopy">토스 정책 검토 전에는 외부 예약 링크를 표시하지 않습니다.</span>':
    (preset.booking||[]).map(p=>`<a href="${esc(p.url)}" rel="noopener noreferrer" target="_blank">${esc(p.site)} · ${esc(p.name)} ↗</a>`).join('')||'<span class="tinycopy">예약 링크는 여행별로 추가 예정</span>';
  $('#linkPolicy').textContent=isToss?'앱인토스에서는 외부 결제/회원가입 유도를 금지하거나 제한하므로, 직접 예약 이동 기능은 심사 정책 검토 전까지 비활성화합니다.':'외부 아고다·클룩·Google Maps 링크이며, 본 앱은 예약을 대신하거나 가격을 보증하지 않습니다.';
}
function renderAccount(){
  const connected=repo.configured&&repo.user;
  $('#connectionBadge').textContent=connected?'🔒 공동 편집 연결됨':repo.configured?'로그인 필요':'로컬 데모';
  $('#connectionBadge').classList.toggle('connected',Boolean(connected));
  $('#demoNotice').hidden=Boolean(connected&&mode==='remote');
  $('#accountInfo').textContent=connected?`${repo.user.email||'로그인된 계정'} · ${mode==='remote'?'공동 여행 동기화 중':'샘플 여행 미리보기 중'}`:
    repo.configured?'로그인하면 친구 초대와 공동 편집을 사용할 수 있어요.':'현재는 기기별 여행 저장을 사용할 수 있어요. 회원 초대는 준비 중입니다.';
  document.querySelectorAll('[data-login]').forEach(b=>{b.hidden=Boolean(repo.user)||isToss;b.disabled=!repo.configured;});
  $('#logout').hidden=!repo.user;
  $('#authHelp').textContent=isToss?'토스 미니앱은 토스 로그인만 허용됩니다. 서버 검증 연동 전이라 로그인이 비활성화되었습니다.':
    repo.configured?'로그인이 안 된다면 로그인 설정을 확인해 줘.':'계정 로그인 기능 준비 중이야. 지금은 이 기기에 여행을 저장할 수 있어.';
  $('#inviteButton').disabled=!(connected&&mode==='remote');
  $('#inviteButton').textContent=connected&&mode==='remote'?'🔗 7일 유효 초대 링크 만들기':'🔒 연결 후 초대 링크 사용 가능';
  const checker=$('#checkSupabase');if(checker)checker.textContent=repo.configured?'🔄 연결 상태 확인':'🔌 계정 연결 상태';
  const aiHelp=$('#aiStatus');if(aiHelp)aiHelp.textContent=mode==='remote'&&repo.user?'🤖 함께 만드는 여행에서 AI가 수정 제안을 보여줘. 변경 적용 전 확인할 수 있어.':'💬 여행을 말로 수정해 봐! 계정 연결 전에는 기본 명령으로 일정과 비용을 변경할 수 있어.';
  $('#memberList').innerHTML=data.members.map((m,i)=>`<span class="member">${m.role==='owner'?'👑':'👤'} ${esc(m.nickname||'친구')} ${i===0?'':' '}</span>`).join('');
  const myMember=mode==='remote'?data.members.find(x=>x.user_id===repo.user?.id):data.members[0];
  if(document.activeElement!==$('#nickname'))$('#nickname').value=myMember?.nickname||'';
}
function renderPhrases(){
  const lang=data.trip.language||'ja-JP';const isJa=lang.startsWith('ja');const items=isJa?phrases['ja-JP']:phrases.en;
  $('#languageText').textContent=isJa?'한국어 ↔ 일본어':'한국어 ↔ 영어';
  $('#phraseList').innerHTML=items.map(([ko,other],i)=>`<div class="phrase"><b>${esc(ko)}</b><div class="foreign">${esc(other)}</div><button type="button" data-speak="${i}">🔊 말하기</button></div>`).join('');
}
function render(){
  if(!data)return;
  document.body.dataset.tripId=mode==='remote'?data.trip.id:'';
  document.dispatchEvent(new CustomEvent('tripkku-trip-changed',{detail:{tripId:mode==='remote'?data.trip.id:null}}));
  renderPresetPicker();renderPlans();renderBudget();renderPlaces();renderAccount();renderPhrases();
  translateUi();void refreshDestination();
}

function previewBudgetWhileTyping(){
  if(!data)return;
  const shared=safeNum($('#night1').value)+safeNum($('#night2').value)+data.expenses.reduce((s,e)=>s+safeNum(e.amount),0);
  const target=safeNum($('#sharedTarget').value),s=priceStatus(shared,target);
  $('#sharedSpent').textContent=money(shared);
  $('#sharedProgress').style.width=Math.min(100,target?100*shared/target:(shared?100:0))+'%';
  $('#sharedProgress').classList.toggle('over',s.over>0);
  $('#sharedBudgetResult').innerHTML=s.html;
  $('#sharedBudgetResult').classList.toggle('over',s.over>0);
  if(data.trip.active_plan==='B'&&data.trip.preset==='oita'){
    const v=safeNum($('#night2').value),over=v>=400000;
    $('#ryokanLimit').textContent=over?`🚨 료칸 1박 객실요금 40만원 기준 초과 ${money(v-399999)}`:`✨ 료칸 2인 1실 목표: 40만원 미만 · 현재 ${money(v)}`;
    $('#ryokanLimit').classList.toggle('warning',over);
  }
  const me=Math.round(shared/peopleCount())+safeNum($('#airfare').value)+safeNum($('#personalExtra').value);
  const myTarget=safeNum($('#personalTarget').value),p=priceStatus(me,myTarget);
  $('#personalSpent').textContent=money(me);
  $('#personalProgress').style.width=Math.min(100,myTarget?100*me/myTarget:(me?100:0))+'%';
  $('#personalProgress').classList.toggle('over',p.over>0);
  $('#personalBudgetResult').innerHTML=p.html;$('#personalBudgetResult').classList.toggle('over',p.over>0);
  $('#personalFormula').textContent=`내 지출 예상 = 공동경비 1/${peopleCount()}인 ${money(shared/peopleCount())} + 내 항공 ${money($('#airfare').value)} + 개인경비 ${money($('#personalExtra').value)}`;
  translateUi();
}

function pendingInvite(){const url=new URL(location.href),token=url.searchParams.get('invite');if(token){
  sessionStorage.setItem('tripkku-invite',token);url.searchParams.delete('invite');history.replaceState({},'',url.toString());
}}
async function initAccount(){
  if(!repo.client)return;
  tripList=repo.user?await repo.trips():[];
  if(!repo.user){loadDemo(activePreset);chatHistory=[];drawChat();return;}
  const token=sessionStorage.getItem('tripkku-invite');
  if(token){try{const id=await repo.join(token);sessionStorage.removeItem('tripkku-invite');
      await selectRemote(id);toast('친구 여행에 합류했어! 🎉');return;}catch(e){fail(Error('초대 링크 사용 실패: '+e.message));}}
  if(tripList.length){const last=localStorage.getItem('tripkku-last-trip:'+repo.user.id);await selectRemote(tripList.some(t=>t.id===last)?last:tripList[0].id);}else{loadDemo(activePreset);toast('로그인 성공! 샘플을 보고 "새 여행 만들기"를 눌러줘.');}
}
async function selectRemote(id){
  const remote=await repo.readTrip(id);mode='remote';data=remote;
  activePreset=data.trip.preset||'oita';repo.subscribe(id);
  tripList=await repo.trips();localStorage.setItem('tripkku-last-trip:'+repo.user.id,id);render();await loadChat();
}
async function createTrip(){
  let key=data.trip.preset;
  if(!repo.user){toast('로컬 샘플은 자유롭게 수정할 수 있어. 공동 여행 생성은 로그인 후 가능해.');return;}
  const sample=uiConfirm('샘플 일정에서 시작할까요?\n확인: 샘플 일정 복사\n취소: 일정이 없는 새 여행 만들기');
  const name=uiPrompt('새 여행 이름',sample?(PRESETS[key]?.title||'우리 여행'):'새 여행');if(name===null)return;
  const p=clonePreset(key);p.title=name.trim()||'새 여행';
  if(!sample){p.key='custom';p.schedule={};p.expenses=[];p.city='미정';p.dates='날짜 미정';p.description='내가 직접 만드는 여행';p.budgetNote='';p.shared_target=0;p.nights_a=[0,0];p.nights_b=[0,0];}
  const id=await repo.createTrip(p);await selectRemote(id);openSelectedTrip();toast(sample?'샘플로 새 여행을 만들었어!':'빈 새 여행을 만들었어!');
}
async function deleteCurrentTrip(targetId=data?.trip?.id){
  if(!repo.user)throw Error('로그인이 필요해.');
  const trip=tripList.find(t=>t.id===targetId);
  if(!trip||trip.owner_id!==repo.user.id)throw Error('여행방 소유자만 삭제할 수 있어.');
  const title=trip.title||'이름 없는 여행';
  if(!uiConfirm('⚠️ '+title+' 여행을 삭제할까요?\n여행 일정·경비·친구 공유 정보도 영향을 받을 수 있습니다.\n삭제 후 복구할 수 없습니다.'))return;
  const key='tripkku-ai-chat:'+repo.user.id+':'+targetId;
  await repo.deleteTrip(targetId);
  try{localStorage.removeItem(key);}catch{}
  if(mode==='remote'&&data?.trip?.id===targetId&&repo.channel){await repo.client.removeChannel(repo.channel);repo.channel=null;}
  if(mode==='remote'&&data?.trip?.id===targetId){await initAccount();}
  else {tripList=await repo.trips();renderSidebar();renderPresetPicker();}
  toast('여행방 삭제 완료');
}
function listAllEvents(){
  if(!data)return '여행 정보가 없어.';
  const entries=[...data.items].sort((a,b)=>String(a.plan_key).localeCompare(String(b.plan_key))||Number(a.day_number)-Number(b.day_number)||String(a.time_label).localeCompare(String(b.time_label)));
  if(!entries.length)return '현재 저장된 일정이 없어. 추가하고 싶은 내용을 말해줘.';
  return '🗓️ '+(mode==='demo'?'[샘플] ':'')+data.trip.title+' 전체 일정 ('+entries.length+'개)\n'+entries.map(x=>`${x.plan_key}안 ${x.day_number}일차 · ${x.time_label||'시간 미정'} · ${x.title}${x.note?' ('+x.note+')':''}`).join('\n');
}
async function createInvite(){
  if(!(repo.user&&mode==='remote')){toast('먼저 SNS 로그인과 Supabase 연결이 필요해!');return;}
  const token=await repo.invite(data.trip.id);
  const url=new URL(location.href);url.searchParams.set('invite',token);
  $('#inviteURL').value=url.toString();$('#inviteLinkBox').hidden=false;
  toast('7일 유효한 초대장 준비 완료!');
}
function appendChat(who,text){recordChat(who==='me'?'user':'assistant',text);const div=document.createElement('div');div.className='bubble '+who;div.textContent=who==='ai'?translateString(text):text;$('#chatMessages').append(div);$('#chatMessages').scrollTop=$('#chatMessages').scrollHeight;}
async function processCommand(input){
  const tx=input.trim();const p=tx.toUpperCase();
  // Local demo also accepts concise English edit commands (no AI API required).
  const lower=tx.toLowerCase();
  if(/\b(?:plan\s*b|b\s*plan)\b/.test(lower)){
    await persistTrip({active_plan:'B'});
    return isEnglish()?'✨ Plan B selected: hotel + ryokan.':'✨ B안으로 바꿨어!';
  }
  if(/\b(?:plan\s*a|a\s*plan)\b/.test(lower)){
    await persistTrip({active_plan:'A'});
    return isEnglish()?'🛏️ Plan A selected: same hotel for two nights.':'🛏️ A안으로 바꿨어!';
  }
  const cost=lower.match(/\b(shared|personal|flight|airfare|ryokan|shopping)\b(?:\s+(?:target|budget|cost|price|to))?\s*([\d,]+)\b/);
  if(cost){const number=safeNum(cost[2].replace(/,/g,''));const field=cost[1];
    if(field==='shared'){await persistTrip({shared_target:number});return `💰 Shared budget: ${money(number)}`;}
    if(field==='personal'){await persistFinance({personal_target:number});return `💌 Personal budget: ${money(number)}`;}
    if(field==='flight'||field==='airfare'){await persistFinance({airfare:number});return `✈️ Flight cost: ${money(number)}`;}
    if(field==='shopping'){await persistFinance({personal_extra:number});return `🛍️ Shopping budget: ${money(number)}`;}
    if(field==='ryokan'){await persistTrip({active_plan:'B',nights_b:[data.trip.nights_b[0],number]});return `🏨 Ryokan price: ${money(number)}`;}
  }
  const englishEvent=lower.match(/^(?:add\s+)(.+?)\s+(?:to\s+)?day\s*([123])(?:\s+.*)?$/);
  if(englishEvent){const day=Number(englishEvent[2]);const title=tx.slice(4,4+englishEvent[1].length);
    await addEvent({plan_key:data.trip.active_plan,day_number:day,time_label:'TBD',title,note:'Added from chat'});
    return `🗓️ Added "${title}" to Day ${day}.`;
  }
  if(/(B안|B PLAN|료칸.*(바꾸|선택))/.test(p)){
    const amt=tx.match(/료칸\s*(\d[\d,]*(?:\.\d+)?)\s*(만\s*원|만원|원)?/);
    if(amt){let price=parseFloat(amt[1].replace(/,/g,''));if((amt[2]||'').includes('만'))price*=10000;
      await persistTrip({active_plan:'B',nights_b:[data.trip.nights_b[0],safeNum(price)]});
      return `✨ B안으로 바꾸고 료칸 금액을 ${money(price)}으로 수정했어!`;
    }
    await persistTrip({active_plan:'B'});return '✨ B안으로 바꿨어! 첫날 일반 호텔, 둘째 날 료칸이야.';
  }
  if(/(A안|A PLAN)/.test(p)){await persistTrip({active_plan:'A'});return '🛏️ A안으로 바꿨어. 벳푸 한 호텔에서 2박!';}
  const m=tx.match(/(공동|내|개인|항공(?:권)?|료칸|첫날|둘째날|호텔|쇼핑).*?(\d[\d,]*(?:\.\d+)?)\s*(만\s*원|만원|원)?/);
  if(m){const phrase=m[1];let n=parseFloat(m[2].replace(/,/g,''));if((m[3]||'').includes('만'))n*=10000;n=safeNum(n);
    if(phrase==='공동'){await persistTrip({shared_target:n});return '💰 공동 목표를 '+money(n)+'으로 바꿨어.';}
    if(phrase==='내'||phrase==='개인'){await persistFinance({personal_target:n});return '💌 내 목표를 '+money(n)+'으로 바꿨어.';}
    if(phrase.startsWith('항공')){await persistFinance({airfare:n});return '✈️ 항공권 비용 '+money(n)+' 입력했어.';}
    if(phrase==='쇼핑'){await persistFinance({personal_extra:n});return '🛍️ 개인 쇼핑비 '+money(n)+' 입력했어.';}
    if(phrase==='료칸'||phrase==='첫날'||phrase==='둘째날'||phrase==='호텔'){
      const plan=phrase==='료칸'?'B':data.trip.active_plan;
      const arr=[...(plan==='A'?data.trip.nights_a:data.trip.nights_b)];
      arr[phrase==='첫날'||phrase==='호텔'?0:1]=n;
      await persistTrip({[plan==='A'?'nights_a':'nights_b']:arr,active_plan:plan});return '🏨 숙소 요금을 '+money(n)+'으로 수정했어.';
    }
  }
  if(/\d\s*일차/.test(tx)&&/(추가|넣어)/.test(tx)){
    const day=Number((tx.match(/(\d)\s*일차/)||[])[1]);const title=tx.replace(/\d\s*일차/, '').replace(/(추가해줘|추가|넣어줘|넣어)/g,'').trim()||'자유 일정';
    await addEvent({plan_key:data.trip.active_plan,day_number:day,time_label:'시간 미정',title,note:'명령어로 추가 · 시간 확인 필요'});
    return `🗓️ ${day}일차에 "${title}" 일정을 추가했어.`;
  }
  return '아직 실제 AI가 아니라서 모든 문장을 이해하진 못해. "B안", "공동 55만원", "내 45만원", "항공권 25만원", "료칸 32만원", "2일차 카페 추가"처럼 말해줘!';
}

// After explicit confirmation, apply validated proposals through normal member-scoped RLS APIs.
async function commitAiProposal(actions){
  if(mode!=='remote'||!repo.user)throw Error('로그인이 필요해.');
  if(!Array.isArray(actions)||actions.length>5)throw Error('제안 수가 너무 많아.');
  const validTypes=['set_plan','set_shared_target','set_personal_target','set_airfare','set_personal_extra','set_night','add_event','update_event','delete_event','add_expense','delete_expense'];
  for(const a of actions){
    if(!validTypes.includes(a.type))throw Error('지원하지 않는 수정 종류야.');
    if(['delete_event','update_event'].includes(a.type)&&!data.items.some(x=>x.id===a.id))throw Error('일정이 변경되었어. 다시 요청해줘.');
    if(a.type==='delete_expense'&&!data.expenses.some(x=>x.id===a.id))throw Error('공동 경비가 이미 변경되었어. 다시 요청해줘.');
  }
  for(const a of actions){
    switch(a.type){
      case 'set_plan':await repo.updateTrip(data.trip.id,{active_plan:a.plan_key});data.trip.active_plan=a.plan_key;break;
      case 'set_shared_target':await repo.updateTrip(data.trip.id,{shared_target:a.amount});break;
      case 'set_personal_target':await repo.updateFinance(data.trip.id,{personal_target:a.amount});break;
      case 'set_airfare':await repo.updateFinance(data.trip.id,{airfare:a.amount});break;
      case 'set_personal_extra':await repo.updateFinance(data.trip.id,{personal_extra:a.amount});break;
      case 'set_night':{
        const prop=a.plan_key==='A'?'nights_a':'nights_b';const nights=[...data.trip[prop]];nights[a.night_index]=a.amount;
        await repo.updateTrip(data.trip.id,{[prop]:nights});data.trip[prop]=nights;break;}
      case 'add_event':await repo.addItem(data.trip.id,{plan_key:a.plan_key,day_number:a.day_number,time_label:a.time_label,title:a.title,note:a.note});break;
      case 'update_event':{
        const patch={};if(a.title)patch.title=a.title;if(a.time_label)patch.time_label=a.time_label;if(a.note)patch.note=a.note;
        await repo.updateItem(a.id,patch);break;}
      case 'delete_event':await repo.deleteItem(a.id);break;
      case 'add_expense':await repo.addExpense(data.trip.id,{title:a.title,category:a.category,amount:a.amount});break;
      case 'delete_expense':await repo.deleteExpense(a.id);break;
    }
  }
  data=await repo.readTrip(data.trip.id);render();
}
async function handleChat(text){
  if(/(전체|모든|전부|쭉|한번에).*(일정|스케줄)|(?:일정|스케줄).*(전체|모두|전부|쭉)/i.test(text))return listAllEvents();
  // AI requires an actual shared trip and authenticated membership; demo stays free/offline.
  if(mode!=='remote'||!repo.user)return processCommand(text);
  const history=chatHistory.slice(-13,-1).map(m=>({role:m.role==='user'?'user':'assistant',text:m.text.slice(0,450)}));
  const proposal=await suggestWithAi(repo,data.trip.id,text,history);
  if(!proposal.actions.length)return '🤖 '+proposal.reply;
  const preview=proposal.actions.map((a,i)=>(i+1)+'. '+describeAction(a)).join('\n');
  const approved=uiConfirm('🤖 AI 수정 제안\n\n'+proposal.reply+'\n\n'+preview+'\n\n이 변경사항을 공동 여행에 적용할까?');
  if(!approved)return '수정은 취소했어. 제안만 확인했어 😊';
  await commitAiProposal(proposal.actions);
  return '✅ 변경 완료! 친구와 공유한 여행에 반영했어.\n'+preview;
}
function speak(index){const lang=data.trip.language||'ja-JP';const p=(lang.startsWith('ja')?phrases['ja-JP']:phrases.en)[index];if(!p)return;
  if(!('speechSynthesis' in window)){toast('이 브라우저는 음성을 지원하지 않아.');return;}
  speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(p[1]);utterance.lang=lang;utterance.rate=.85;speechSynthesis.speak(utterance);
}
async function clickHandler(ev){
  const b=ev.target.closest('button');if(!b)return;
  try{
    if(b.id==='goHome'||b.id==='backHome'){setPageView('home');return;}
    if(b.id==='goTripDetail'||b.id==='heroOpenTrip'){openSelectedTrip();return;}
    if(b.id==='heroNewTrip'){await createTrip();return;}
    if(b.id==='sidebarToggle'){setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));return;}
    if(b.dataset.deleteSidebarTrip){await deleteCurrentTrip(b.dataset.deleteSidebarTrip);return;}
    if(b.dataset.sidebarTrip){await selectRemote(b.dataset.sidebarTrip);openSelectedTrip();return;}
    if(b.id==='sideNewTrip'){await createTrip();return;}
    if(b.dataset.go){if(b.dataset.go!=='trips')setPageView('detail');document.getElementById(b.dataset.go)?.scrollIntoView({behavior:'smooth'});return;}
    if(b.dataset.uiLang){setUiLanguage(b.dataset.uiLang);render();applyEarthAppearance();updateWeatherPanel(window._tripkkuWeatherResult||{status:'dates-missing'});toast(isEnglish()?'Language: English':'언어: 한국어');return;}
    if(b.dataset.appearance){document.body.dataset.appearance=b.dataset.appearance;
      localStorage.setItem(APPEARANCE_KEY,b.dataset.appearance);applyEarthAppearance();toast('낮·밤 로고를 바꿨어 🌍');return;}
    if(b.dataset.mood&&MOOD_OPTIONS[b.dataset.mood]){earthPrefs.mood=b.dataset.mood;
      localStorage.setItem(EARTH_PREF_KEY,JSON.stringify(earthPrefs));applyEarthAppearance();toast('지구 기분을 바꿨어 💬');return;}
    if(b.dataset.earthMode){earthMode=b.dataset.earthMode;localStorage.setItem(EARTH_MAP_MODE,earthMode);applyEarthAppearance();toast(earthMode==='map'?'📍 목적지 지도 보기':'😊 지구 표정 보기');return;}

    if(b.dataset.theme){document.body.dataset.theme=b.dataset.theme;localStorage.setItem(THEME,b.dataset.theme);renderPresetPicker();toast('테마를 바꿨어 🎨');return;}
    if(b.dataset.preset){
      if(mode==='remote'&&repo.user){const ok=uiConfirm('이 샘플로 별도 공동 여행을 새로 만들까요? (기존 여행 유지)');if(!ok)return;
        const id=await repo.createTrip(clonePreset(b.dataset.preset));await selectRemote(id);openSelectedTrip();toast('새 공동 여행을 만들었어!');}
      else {loadDemo(b.dataset.preset);openSelectedTrip();}return;
    }
    if(b.dataset.plan){await persistTrip({active_plan:b.dataset.plan});toast(b.dataset.plan+'안 적용 완료');return;}
    if(b.id==='makeTrip'){await createTrip();return;}
    if(b.id==='deleteTrip'){await deleteCurrentTrip();return;}
    if(b.id==='editTripInfo'){
      const title=uiPrompt('여행 이름',data.trip.title);if(title===null)return;
      const city=uiPrompt('목적지 도시 (예: Tokyo, London, 벳푸)',data.trip.city);if(city===null)return;
      await persistTrip({title:title.trim()||data.trip.title,city:city.trim()||data.trip.city});toast('여행지와 이름을 바꿨어!');return;
    }
    if(b.id==='saveTravelCity'){
      const city=$('#travelCity').value.trim();if(!city){toast('도시 이름을 입력해 줘.');return;}
      await persistTrip({city});toast('📍 목적지 지도 변경 완료');return;
    }
    if(b.id==='saveTravelDates'){
      const start=$('#travelStart').value,end=$('#travelEnd').value||start;
      if(!start||end<start){toast('여행 시작일과 종료일을 확인해 줘.');return;}
      await persistTrip({dates:start+' ~ '+end});toast('📅 여행 날짜 저장 완료');return;
    }
    if(b.id==='checkSupabase'){
      if(!repo.configured){toast('연결 설정이 없어. 먼저 웹앱의 공개 Supabase URL과 anon 키를 설정해 줘.');return;}
      if(!repo.client){await repo.init();await initAccount();}
      const {error}=await repo.client.from('trips').select('id').limit(1);
      if(error)throw error;
      toast(repo.user?'✅ Supabase 연결됨 · 로그인 완료':'✅ Supabase 연결됨 · Google 또는 카카오 로그인이 필요해.');return;
    }
    if(b.dataset.login){await repo.signIn(b.dataset.login);return;}
    if(b.id==='logout'){await repo.signOut();await initAccount();toast('로그아웃했어.');return;}
    if(b.id==='inviteButton'){await createInvite();return;}
    if(b.id==='copyInvite'){await navigator.clipboard.writeText($('#inviteURL').value);toast('초대 링크 복사 완료!');return;}
    if(b.id==='addExpense'){
      const title=uiPrompt('함께 쓰는 경비 이름 (예: 이자카야)', '카페/간식');if(!title?.trim())return;
      const amt=uiPrompt('2명 합산 비용 (원)', '30000');if(amt===null)return;
      await addExpense({category:'기타',title:title.trim(),amount:safeNum(amt)});toast('공동 경비 추가 완료');return;
    }
    if(b.dataset.removeExpense){if(uiConfirm('공동 경비를 삭제할까?'))await removeExpense(b.dataset.removeExpense);return;}
    if(b.id==='addEvent'){
      const day=Number(uiPrompt('몇 일차? (1~3)', '2'));if(!Number.isInteger(day)||day<1||day>3)return;
      const title=uiPrompt('일정 제목','☕ 카페 방문');if(!title?.trim())return;
      const time=uiPrompt('시간','15:00');if(time===null)return;
      await addEvent({plan_key:data.trip.active_plan,day_number:day,time_label:time.trim(),title:title.trim(),note:'직접 추가한 일정'});toast('공동 일정 추가 완료');return;
    }
    if(b.dataset.editEvent){const event=data.items.find(i=>i.id===b.dataset.editEvent);if(!event)return;
      const title=uiPrompt('일정 제목',event.title);if(title===null)return;
      const time=uiPrompt('시간',event.time_label);if(time===null)return;
      const note=uiPrompt('메모',event.note);if(note===null)return;
      await editEvent(event.id,{title,time_label:time,note});toast('일정 수정 완료');return;
    }
    if(b.dataset.removeEvent){if(uiConfirm('이 일정을 삭제할까?'))await removeEvent(b.dataset.removeEvent);return;}
    if(b.id==='saveNickname'){
      const nickname=$('#nickname').value.trim().slice(0,24);if(!nickname)return;
      if(mode==='remote'){await repo.setNickname(data.trip.id,nickname);data=await repo.readTrip(data.trip.id);}
      else{data.members[0].nickname=nickname;saveDemo();}
      render();toast('이름 변경 완료!');return;
    }
    if(b.dataset.speak){speak(Number(b.dataset.speak));return;}
  }catch(err){fail(err);}
}
async function inputChanged(e){const id=e.target.id;const value=safeNum(e.target.value);
  try{
    if(id==='tripSelect'){await selectRemote(e.target.value);return;}
    if(id==='sharedTarget'){await persistTrip({shared_target:value});return;}
    if(id==='night1'||id==='night2'){const a=[...currentPlanNights()];a[id==='night1'?0:1]=value;
      await persistTrip({[data.trip.active_plan==='A'?'nights_a':'nights_b']:a});return;}
    if(id==='personalTarget'){await persistFinance({personal_target:value});return;}
    if(id==='airfare'){await persistFinance({airfare:value});return;}
    if(id==='personalExtra'){await persistFinance({personal_extra:value});return;}
  }catch(err){fail(err);}
}
async function boot(){
  setUiLanguage(getUiLanguage());
  pendingInvite();document.body.dataset.theme=localStorage.getItem(THEME)||'forest';
  document.body.dataset.appearance=localStorage.getItem(APPEARANCE_KEY)||'light';
  loadDemo(activePreset);setPageView('home');applyEarthAppearance();
  document.addEventListener('click',clickHandler);
  document.addEventListener('change',inputChanged);
  document.addEventListener('input',e=>{
    if(['sharedTarget','night1','night2','personalTarget','airfare','personalExtra'].includes(e.target.id))previewBudgetWhileTyping();
  });
  $('#chatForm').addEventListener('submit',async e=>{
    e.preventDefault();const val=$('#chatInput').value.trim();if(!val)return;$('#chatInput').value='';appendChat('me',val);
    try{appendChat('ai',await handleChat(val));}catch(err){appendChat('ai','⚠️ AI 응답을 받을 수 없어: '+(err.message||err)+'\n간단한 일정 명령 편집은 그대로 이용할 수 있어.');}
  });
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
  if(isToss){toast('앱인토스 모드는 정식 토스 로그인 서버 연동 전이라 데모만 제공해.');return;}
  if(repo.configured){
    try{await repo.init();await initAccount();}catch(e){fail(Error('온라인 연결 실패: '+e.message));}
  }
}
boot();
