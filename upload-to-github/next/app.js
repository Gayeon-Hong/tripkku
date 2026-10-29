import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm';
import {COUNTRIES,BY_COUNTRY,LANGUAGES,suggestCountry,countryInfo,languageLabel} from './countries.js';

// Public URL and publishable key are safe in the browser; never put GEMINI_API_KEY here.
const CONFIG={url:'https://aachvbbblwycutggzdpp.supabase.co',publishable:'sb_publishable_VeMIoHqNqCTnxZSMCqLHVg_FLQTW6Pq'};
const client=createClient(CONFIG.url,CONFIG.publishable,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const DEMO=new URLSearchParams(location.search).has('demo');
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid=()=>crypto.randomUUID();
const clone=o=>JSON.parse(JSON.stringify(o));
const dateRE=/^\d{4}-\d\d-\d\d$/;
const timeRE=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MONEY=['KRW','JPY','USD','EUR','THB','TWD','VND','GBP','CNY','HKD','AUD','CAD','SGD','CHF','IDR','PHP','MYR','AED','TRY','INR'];
const MY_UID='demo-user';
const userName=()=>user?.user_metadata?.full_name||user?.user_metadata?.name||'나';
const status=s=>{$('syncBadge').textContent=s;};
function toast(message){const el=$('toast');el.textContent=String(message);el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3300);}
function mapUrl(place){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place||trip?.destination||'');}
function directionsUrl(start,end){return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(start)+'&destination='+encodeURIComponent(end);}
function safeUrl(url){try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
function showScreen(screen){for(const name of ['auth','home','trip','feedback'])$(name+'Screen').hidden=name!==screen;}
function isoDay(d){return new Date(d).toISOString().slice(0,10);}
function daysBetween(start,end){if(!dateRE.test(start)||!dateRE.test(end))return [];
 const a=Date.parse(start+'T00:00:00Z'),b=Date.parse(end+'T00:00:00Z');if(!Number.isFinite(a)||!Number.isFinite(b)||b<a||b-a>=14*86400000)return [];
 return Array.from({length:Math.round((b-a)/86400000)+1},(_,i)=>new Date(a+i*86400000).toISOString().slice(0,10));}
function fmtDate(s){if(!s)return '';const d=new Date(s+'T00:00:00Z');return Number.isFinite(+d)?new Intl.DateTimeFormat('ko-KR',{timeZone:'UTC',month:'short',day:'numeric',weekday:'short'}).format(d):s;}
function money(n,c){try{return new Intl.NumberFormat('ko-KR',{style:'currency',currency:c,maximumFractionDigits:['KRW','JPY','VND','IDR'].includes(c)?0:2}).format(n);}catch{return Number(n).toLocaleString('ko-KR')+' '+c;}}
const emptyMessage=(message)=>`<div class="empty-state">${esc(message)}</div>`;
function currentCountry(){return countryInfo(trip?.country_code||trip?.data?.meta?.countryCode||'JP');}
function tripDates(){return daysBetween(trip?.start_date||'',trip?.end_date||'');}
function activeDoc(){return trip?.data||{};}
function normalizeDoc(d){d.meta??={};d.days??=[];d.todos??=[];d.notes??='';d.savedPlaces??=[];d.reels??=[];d.expenses??=[];d.bookings??=[];return d;}
function newDoc(meta){return normalizeDoc({meta,days:daysBetween(meta.startDate,meta.endDate).map(date=>({date,title:'자유 일정',events:[]})),todos:[{id:uuid(),title:'항공편과 여권·출입국 서류 확인',done:false},{id:uuid(),title:'현지 인터넷·교통·숙소 예약 확인',done:false}],notes:'',savedPlaces:[],reels:[],expenses:[],bookings:[]});}
const DEFAULT_DEMO_KEY='tripkku-next-demo-v1';
let feedbackReturnScreen='home',isBetaAdmin=false,feedbackEntries=[];
let user=null, trips=[],trip=null,revision=0,members=[],personalExpenses=[],privateFiles=[],activeTab='schedule',activeDate='',pendingPlan=null,pendingChatActions=[],chatHistory=[],editingEventId=null,saveQueue=Promise.resolve(),subscription=null,pendingConflict=null,recognition=null,lastTranslatedLang='';
function demoTrips(){try{return JSON.parse(localStorage.getItem(DEFAULT_DEMO_KEY)||'[]');}catch{return [];}}
function setDemoTrips(rows){localStorage.setItem(DEFAULT_DEMO_KEY,JSON.stringify(rows));}
function setBusy(el,busy,label){if(!el)return;el.disabled=busy;if(label)el.textContent=busy?'처리 중…':label;}
function latestMeta(row){return row?.data?.meta||{};}
function updateLocaleHint(){const input=$('newDestination').value.trim();const selected=$('newCountry').value;const guess=suggestCountry(input);
 if(!selected&&guess){$('newCountry').value=guess;$('newCountry').dataset.autoSuggested='yes';}
 if($('newCountry').dataset.autoSuggested==='yes'&&selected&&selected!==guess&&guess){/* never overwrite a manual selection */}
 const code=$('newCountry').value,info=BY_COUNTRY[code];
 $('localeHint').textContent=info?`${info.flag} ${info.name} · ${languageLabel(info.language)} 번역 · ${info.currency} 현지 통화 · 번역 언어는 여행 생성 후 변경 가능`:'도시를 입력하면 국가를 추천합니다. 확인이 필요하면 직접 국가를 선택해 주세요.';
}
async function suggestCountryFromAI(){if(DEMO||!user||$('newCountry').value||$('newDestination').value.trim().length<2)return;
 const city=$('newDestination').value.trim();$('localeHint').textContent='🌐 여행 국가를 확인하는 중…';
 try{const {data,error}=await client.functions.invoke('tripkku-ai',{body:{kind:'detect-country',destination:city}});
  if(error||!BY_COUNTRY[data?.countryCode])throw new Error('직접 선택이 필요합니다.');
  if($('newCountry').value||$('newDestination').value.trim()!==city)return;
  $('newCountry').value=data.countryCode;$('newCountry').dataset.autoSuggested='yes';updateLocaleHint();
 }catch{$('localeHint').textContent='국가 자동 판별이 어려워요. 목록에서 국가를 선택해 주세요.';}}
function initCountryPicker(){const opts=COUNTRIES.map(c=>`<option value="${c.code}">${c.flag} ${esc(c.name)}</option>`).join('');$('newCountry').insertAdjacentHTML('beforeend',opts);
 $('newDestination').addEventListener('input',()=>{if($('newCountry').dataset.autoSuggested==='yes')$('newCountry').value='';updateLocaleHint();});
 $('newCountry').addEventListener('change',()=>{$('newCountry').dataset.autoSuggested='no';updateLocaleHint();});
 $('newDestination').addEventListener('blur',()=>void suggestCountryFromAI());
 const today=new Date();today.setDate(today.getDate()+14);const end=new Date(today);end.setDate(end.getDate()+3);
 $('tripStart').value=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
 $('tripEnd').value=[end.getFullYear(),String(end.getMonth()+1).padStart(2,'0'),String(end.getDate()).padStart(2,'0')].join('-');
}
const MOODS=[['happy','😊'],['love','🥰'],['sleepy','😴'],['angry','😡']];
function applyTheme(){const night=localStorage.getItem('tripkku-next-night')==='yes';document.body.classList.toggle('night',night);
 const mood=MOODS.find(x=>x[0]===localStorage.getItem('tripkku-next-mood'))||MOODS[0];
 $('themeToggle').textContent=night?'☀':'☾';$('moodToggle').textContent=mood[1];
 document.querySelectorAll('.hero-earth,.trip-earth').forEach(img=>img.src=`./assets/earth-icon-${night?'dark':'light'}-${mood[0]}-192.png`);}

async function init(){initCountryPicker();applyTheme();bindHandlers();
 if(DEMO){user={id:MY_UID,user_metadata:{full_name:'체험 사용자'}};$('logoutBtn').hidden=true;$('feedbackTop').hidden=false;$('authError').textContent='';await loadTrips();return;}
 client.auth.onAuthStateChange((event,session)=>{if(session?.user){const changed=user?.id!==session.user.id;user=session.user;$('logoutBtn').hidden=false;$('feedbackTop').hidden=false;if(changed)queueMicrotask(()=>loadTrips());}
  else{user=null;trip=null;trips=[];isBetaAdmin=false;$('logoutBtn').hidden=true;$('feedbackTop').hidden=true;$('adminFeedbackBtn').hidden=true;showScreen('auth');}});
 const {data,error}=await client.auth.getSession();if(error)console.warn('TRIPKKU auth',error.message);
 if(data.session?.user){user=data.session.user;$('logoutBtn').hidden=false;$('feedbackTop').hidden=false;await loadTrips();}else showScreen('auth');
}
async function login(){try{const redirectTo=location.origin+location.pathname+(location.search||'');const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo}});if(error)throw error;}catch(e){$('authError').textContent='로그인 실패: '+e.message;}}
async function loadTrips(){if(!user)return;status(DEMO?'체험 모드':'여행 목록 동기화 중');showScreen('home');try{
 if(DEMO)trips=demoTrips();
 else{const {data,error}=await client.from('tripkku_trips').select('id,owner_id,invite_code,title,destination,country_code,start_date,end_date,data,revision,updated_at').order('updated_at',{ascending:false}).limit(50);if(error)throw error;trips=data||[];}
 renderTripList();status(DEMO?'체험 모드 · 서버 저장 안 됨':'여행 목록 준비 완료');await refreshBetaAdminRole();
 const inv=new URLSearchParams(location.search).get('invite');if(inv&&!DEMO){history.replaceState({},'',location.pathname);await joinTrip(inv);}
 }catch(e){status('Supabase 설정 확인');$('tripList').innerHTML=emptyMessage('새 여행 테이블을 불러올 수 없어요. setup.sql을 SQL Editor에서 실행했는지 확인해 주세요. ('+e.message+')');}
}
function renderTripList(){$('tripList').innerHTML=trips.length?trips.map(t=>{const c=countryInfo(t.country_code);return `<div class="trip-card"><div><strong>${c.flag} ${esc(t.title)}</strong><small>${esc(t.destination)} · ${esc(fmtDate(t.start_date))}~${esc(fmtDate(t.end_date))}</small></div><button class="btn small" data-open-trip="${esc(t.id)}">열기</button></div>`;}).join(''):emptyMessage('아직 여행이 없어요. 왼쪽에서 첫 여행을 만들어 보세요.');}
async function createTripFromForm(e){e.preventDefault();if(!user)return toast('먼저 로그인해 주세요.');const f=e.currentTarget;const d=new FormData(f);
 const destination=String(d.get('destination')||'').trim(),country=String(d.get('country')||'');
 const start=String(d.get('start')||''),end=String(d.get('end')||''),dates=daysBetween(start,end);
 if(destination.length<2||!BY_COUNTRY[country])return toast('여행지와 국가를 확인해 주세요.');
 if(!dates.length)return toast('여행 기간은 1~14일 사이로 설정해 주세요.');
 const meta={countryCode:country,destination,startDate:start,endDate:end,travelers:Number(d.get('travelers'))||2,style:String(d.get('style')),pace:String(d.get('pace')),
 budget:String(d.get('budget')||'').slice(0,60),mustVisit:String(d.get('mustVisit')||'').slice(0,900),constraints:String(d.get('constraints')||'').slice(0,1100),language:countryInfo(country).language};
 const title=destination+' '+dates.length+'일 여행',doc=newDoc(meta),btn=$('newTripSubmit');setBusy(btn,true);
 try{let id;
 if(DEMO){id=uuid();trips.unshift({id,owner_id:MY_UID,invite_code:'demo-only',title,country_code:country,destination,start_date:start,end_date:end,data:doc,revision:0,updated_at:new Date().toISOString()});setDemoTrips(trips);}
 else{const {data,error}=await client.rpc('tripkku_create_trip',{p_title:title,p_country:country,p_destination:destination,p_start:start,p_end:end,p_data:doc});if(error)throw error;id=data;await loadTrips();}
 await openTrip(id);toast('여행이 생성되었습니다. 일정 추천을 시작합니다.');await generatePlan(true);
 }catch(err){toast('여행 생성 실패: '+err.message);}finally{setBusy(btn,false,'✨ 여행 만들고 추천 일정 받기');}}
async function joinTrip(raw){const code=String(raw||'').trim().toLowerCase();if(!/^[0-9a-f]{24}$/.test(code)){toast('24자리 초대 코드를 확인해 주세요.');return;}
 if(DEMO){toast('데모에서는 친구 초대가 지원되지 않습니다.');return;}
 try{const {data:id,error}=await client.rpc('tripkku_join_trip',{p_invite_code:code});if(error)throw error;toast('여행방에 참여했습니다!');await loadTrips();if(id)await openTrip(id);
 }catch(e){toast('초대 참여 실패: '+e.message);}}
async function openTrip(id){if(!user)return;status('여행 데이터 불러오는 중');if(subscription){await client.removeChannel(subscription);subscription=null;}
 try{if(DEMO){trip=demoTrips().find(t=>t.id===id);if(!trip)throw new Error('여행을 찾을 수 없습니다.');members=[{user_id:MY_UID,display_name:'나'}];privateFiles=[];personalExpenses=[];}
 else{const {data,error}=await client.from('tripkku_trips').select('*').eq('id',id).single();if(error)throw error;trip=data;
  const [m,p,f]=await Promise.all([client.from('tripkku_trip_members').select('user_id,display_name').eq('trip_id',id),
   client.from('tripkku_private_expenses').select('*').eq('trip_id',id).order('created_at',{ascending:false}),
   client.from('tripkku_private_files').select('*').eq('trip_id',id).order('created_at',{ascending:false})]);
  members=m.data||[];personalExpenses=p.data||[];privateFiles=f.data||[];
  subscription=client.channel('tripkku-next-'+id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'tripkku_trips'},evt=>{
   if(evt.new?.id===trip?.id&&evt.new.revision>revision)void refreshTripFromCloud();}).subscribe();}
 if(!trip)throw new Error('여행을 찾을 수 없습니다.');normalizeDoc(trip.data);revision=trip.revision||0;
 activeDate=tripDates()[0]||'';activeTab='schedule';pendingPlan=null;pendingChatActions=[];chatHistory=[];showScreen('trip');renderAll();chooseTab('schedule');
 localStorage.setItem('tripkku-next-last-trip',id);window.scrollTo({top:0,behavior:'auto'});status(DEMO?'체험 모드':'친구와 저장 연결됨 ✓');
 }catch(e){toast('여행 열기 실패: '+e.message);showScreen('home');}}
async function refreshTripFromCloud(){if(!trip||DEMO)return;
 const {data,error}=await client.from('tripkku_trips').select('*').eq('id',trip.id).single();if(error||!data||data.revision<=revision)return;
 trip=data;revision=data.revision;normalizeDoc(trip.data);renderAll();status('공동 데이터 갱신됨 ✓');}
async function saveTrip(update,success='저장 완료'){if(!trip)throw new Error('활성 여행 없음');
 const task=async()=>{status(DEMO?'체험 내용 저장 중':'공동 저장 중…');
  for(let retry=0;retry<3;retry++){
   const draft=clone(trip.data);normalizeDoc(draft);update(draft);
   if(JSON.stringify(draft).length>300000)throw new Error('여행 데이터가 너무 큽니다. 파일을 첨부함으로 옮기세요.');
   if(DEMO){trip.data=draft;trip.revision=(trip.revision||0)+1;revision=trip.revision;trip.updated_at=new Date().toISOString();const list=demoTrips().map(x=>x.id===trip.id?trip:x);setDemoTrips(list);renderAll();status('체험 저장됨');toast(success);return;}
   const {data:newRev,error}=await client.rpc('tripkku_save_trip',{p_id:trip.id,p_data:draft,p_revision:revision});
   if(!error){trip.data=draft;revision=Number(newRev);trip.revision=revision;renderAll();status('공동 저장 완료 ✓');toast(success);return;}
   if((error.message||'').includes('TRIPKKU_VERSION_CONFLICT')){const {data:latest,error:readError}=await client.from('tripkku_trips').select('*').eq('id',trip.id).single();if(readError)throw readError;trip=latest;revision=latest.revision;continue;}
   throw error;
  }
  throw new Error('동시에 수정이 많습니다. 화면을 갱신 후 다시 시도하세요.');
 };
 const p=saveQueue.then(task);saveQueue=p.catch(e=>{status('저장 오류');toast('저장 실패: '+e.message);console.error(e);});return p;}
function renderIntro(){const c=currentCountry(),d=activeDoc(),lang=d.meta?.language||c.language;
 $('activeTripTitle').textContent=trip.title;$('activeTripSummary').textContent=trip.destination+' · '+fmtDate(trip.start_date)+' ~ '+fmtDate(trip.end_date)+' · '+tripDates().length+'일';
 $('activeCountry').textContent=c.flag+' '+c.name;$('activeLanguage').textContent='번역: '+languageLabel(lang);$('activeCurrency').textContent='예산: '+c.currency;
 $('inviteTop').hidden=DEMO;}
function chooseTab(tab){activeTab=tab;document.querySelectorAll('#mainNav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 document.querySelectorAll('.workspace-page').forEach(x=>x.hidden=x.id!==tab+'Page');if(tab==='assistant')renderTranslatorConfig();}
function renderAll(){if(!trip)return;renderIntro();renderSchedule();renderTodos();renderBudget();renderPlaces();renderBookings();renderTranslatorConfig();renderChat();}
function goHome(){if(trip){trip=null;pendingPlan=null;}if(subscription){void client.removeChannel(subscription);subscription=null;}
 $('inviteTop').hidden=true;showScreen(user?'home':'auth');if(user)void loadTrips();window.scrollTo({top:0,behavior:'smooth'});}
async function copyInvite(){if(!trip||DEMO)return;const link=location.origin+location.pathname+'?invite='+trip.invite_code;
 try{await navigator.clipboard.writeText(link);toast('친구 초대 링크를 복사했습니다.');}catch{prompt('친구에게 이 링크를 보내세요',link);}}
async function aiCall(kind,payload={}){if(DEMO)throw new Error('체험 모드에서는 실시간 AI가 제공되지 않습니다. 로그인 후 이용해 주세요.');
 const {data,error}=await client.functions.invoke('tripkku-ai',{body:{kind,tripId:trip.id,...payload}});
 if(error){const detail=typeof data?.error==='string'?data.error:'Edge Function이 준비되지 않았습니다. tripkku-ai 배포를 확인하세요.';throw new Error(detail);}
 if(data?.error)throw new Error(data.error);return data;}
async function generatePlan(afterCreate=false){if(!trip)return;const btn=$('regeneratePlan');setBusy(btn,true);
 try{if(DEMO){const raw=activeDoc().meta.mustVisit.split(/[,\n、]/).map(x=>x.trim()).filter(Boolean).slice(0,12);
  const dates=tripDates();pendingPlan={summary:'체험용 샘플입니다. 실제 AI 동선 생성은 로그인 후 Edge Function 배포가 필요합니다.',tips:['실제 이동시간·영업시간은 Google 지도에서 확인하세요.'],days:dates.map((date,i)=>({date,title:(i+1)+'일 차 · 샘플 일정',events:(raw.length?raw.slice(i*2,i*2+2):['현지 산책','카페 휴식']).map((name,j)=>({start:j?'13:00':'10:00',end:j?'14:00':'11:30',title:name,place:name,note:'체험용. 실제 이동시간을 확인하세요.',kind:'visit'}))}))};}
  else{const {plan}=await aiCall('plan',{request:activeDoc().meta.constraints+'\n꼭 가고 싶은 곳: '+activeDoc().meta.mustVisit});pendingPlan=plan;}
  renderPlanPreview();if(!afterCreate)toast('AI 추천 일정이 준비됐습니다. 적용 전 확인하세요.');chooseTab('schedule');
 }catch(e){toast('AI 추천 오류: '+e.message);if(afterCreate)toast('여행은 저장됐습니다. AI 추천은 나중에 다시 실행할 수 있어요.');}
 finally{setBusy(btn,false,'✨ AI 동선 다시 추천');}}
function renderPlanPreview(){const box=$('planPreview');if(!pendingPlan){box.hidden=true;return;}box.hidden=false;
 box.innerHTML=`<h3>✨ AI 추천 경로 미리보기</h3><p class="muted">${esc(pendingPlan.summary||'일정 추천')}</p><div class="draft-grid">${(pendingPlan.days||[]).map(x=>`<div><strong>${esc(fmtDate(x.date))} · ${esc(x.title)}</strong>${x.events.map(e=>`<small>${esc(e.start)} ${esc(e.title)}</small>`).join('<br>')}</div>`).join('')}</div>
  <p class="tiny">${esc((pendingPlan.tips||[]).join(' · '))}</p><div class="draft-actions"><button class="btn primary" id="applyPlan">이 일정 적용</button><button class="btn" id="dismissPlan">나중에 적용</button></div>`;
 $('applyPlan').addEventListener('click',()=>void applyPlan());$('dismissPlan').addEventListener('click',()=>{pendingPlan=null;renderPlanPreview();});}
async function applyPlan(){if(!pendingPlan)return;if(activeDoc().days.some(d=>d.events?.length)&&!confirm('기존 일정이 AI 추천 일정으로 대체됩니다. 계속할까요?'))return;
 const days=clone(pendingPlan.days).map(d=>({...d,events:d.events.map(e=>({id:uuid(),...e}))}));await saveTrip(d=>{d.days=days;},'AI 추천 일정을 적용했습니다.');pendingPlan=null;renderPlanPreview();}
function routeForDay(events){const stops=[...new Set(events.filter(e=>e.place&&e.kind!=='move').map(e=>e.place+' '+trip.country_code))].slice(0,5);
 if(stops.length<2)return '';
 const origin=encodeURIComponent(stops[0]),destination=encodeURIComponent(stops.at(-1));
 return 'https://www.google.com/maps/dir/?api=1&origin='+origin+'&destination='+destination+(stops.length>2?'&waypoints='+stops.slice(1,-1).map(encodeURIComponent).join('%7C'):'');}
function renderSchedule(){const dates=tripDates();if(!dates.includes(activeDate))activeDate=dates[0];
 $('dayTabs').innerHTML=dates.map((date,i)=>`<button data-day="${date}" class="${date===activeDate?'active':''}">${esc(fmtDate(date))}<br><small>${i+1}일 차</small></button>`).join('');
 $('dayTabs').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{activeDate=b.dataset.day;renderSchedule();}));
 const day=activeDoc().days.find(d=>d.date===activeDate),events=[...(day?.events||[])].sort((a,b)=>a.start.localeCompare(b.start));
 const route=routeForDay(events);$('dayRoute').innerHTML=route?`<a href="${esc(route)}" target="_blank" rel="noopener noreferrer" class="btn small">🗺 오늘의 추천 동선 Google 지도에서 확인 ↗</a>`:'';
 $('timeline').innerHTML=events.length?events.map(e=>`<article class="event-card"><div class="event-time">${esc(e.start)}–${esc(e.end)}</div><div><div class="event-title">${esc(e.title)}</div><p class="event-note">${esc(e.place||'')} ${e.place?' · ':''}${esc(e.note||'')}</p><div class="event-tools">${e.place?`<a href="${esc(mapUrl(e.place+' '+trip.destination))}" target="_blank" rel="noopener noreferrer">📍 지도 보기</a>`:''}<button data-edit-event="${esc(e.id)}">수정</button><button data-delete-event="${esc(e.id)}">삭제</button></div></div></article>`).join(''):emptyMessage('아직 일정이 없어요. AI 추천을 적용하거나 + 일정 추가를 눌러 주세요.');
 $('timeline').querySelectorAll('[data-edit-event]').forEach(b=>b.addEventListener('click',()=>openEventDialog(b.dataset.editEvent)));
 $('timeline').querySelectorAll('[data-delete-event]').forEach(b=>b.addEventListener('click',()=>void deleteEvent(b.dataset.deleteEvent)));
 renderPlanPreview();}
function findEvent(id){for(const day of activeDoc().days){const event=day.events.find(e=>e.id===id);if(event)return {...event,date:day.date};}return null;}
function openEventDialog(eventId=null,placeName=''){if(!trip)return;editingEventId=eventId;const existing=eventId?findEvent(eventId):null;
 $('eventDialogTitle').textContent=existing?'일정 수정':'일정 추가';$('eventDate').innerHTML=tripDates().map(date=>`<option value="${date}">${esc(fmtDate(date))}</option>`).join('');
 const f=$('eventForm');f.elements.date.value=existing?.date||activeDate;f.elements.start.value=existing?.start||'10:00';f.elements.end.value=existing?.end||'11:00';
 f.elements.title.value=existing?.title||placeName;f.elements.place.value=existing?.place||placeName;f.elements.note.value=existing?.note||'';
 $('eventDialog').showModal();}
function conflictsFor(candidate,oldId){return(activeDoc().days.find(d=>d.date===candidate.date)?.events||[]).filter(e=>e.id!==oldId&&candidate.start<e.end&&candidate.end>e.start);}
function eventFromForm(f){return {id:editingEventId||uuid(),date:f.elements.date.value,start:f.elements.start.value,end:f.elements.end.value,
 title:f.elements.title.value.trim(),place:f.elements.place.value.trim(),note:f.elements.note.value.trim(),kind:'visit'};}
async function submitEvent(e){e.preventDefault();const entry=eventFromForm(e.currentTarget);if(!tripDates().includes(entry.date)||!timeRE.test(entry.start)||!timeRE.test(entry.end)||entry.start>=entry.end||!entry.title)return toast('날짜와 시작·종료 시간을 확인해 주세요.');
 const conflicts=conflictsFor(entry,editingEventId);$('eventDialog').close();
 if(conflicts.length){pendingConflict={candidate:entry,oldId:editingEventId,conflicts};$('conflictDetails').textContent=conflicts.map(x=>`${x.start}~${x.end} · ${x.title}`).join('\n');$('conflictDialog').showModal();return;}
 await saveEvent(entry,editingEventId,[]);}
async function saveEvent(entry,oldId,removeIds=[]){await saveTrip(doc=>{
  for(const day of doc.days)day.events=day.events.filter(e=>e.id!==oldId&&!removeIds.includes(e.id));
  let target=doc.days.find(d=>d.date===entry.date);if(!target){target={date:entry.date,title:'자유 일정',events:[]};doc.days.push(target);}
  const {date,...payload}=entry;target.events.push(payload);target.events.sort((a,b)=>a.start.localeCompare(b.start));
 },'일정을 저장했습니다.');activeDate=entry.date;renderSchedule();}
async function deleteEvent(id){const old=findEvent(id);if(!old||!confirm(`'${old.title}' 일정을 삭제할까요?`))return;
 await saveTrip(d=>{for(const day of d.days)day.events=day.events.filter(e=>e.id!==id);},'일정을 삭제했습니다.');}
function timeMinutes(s){const [h,m]=s.split(':').map(Number);return h*60+m;}
function minutesTime(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
function suggestSlot(entry,oldId){const duration=timeMinutes(entry.end)-timeMinutes(entry.start);
 const items=(activeDoc().days.find(d=>d.date===entry.date)?.events||[]).filter(e=>e.id!==oldId).sort((a,b)=>a.start.localeCompare(b.start));
 let start=Math.max(timeMinutes(entry.start),8*60);
 for(const e of items){const s=timeMinutes(e.start),en=timeMinutes(e.end);if(start+duration<=s)break;if(start<en)start=en;}
 if(start+duration>23*60)return null;return {...entry,start:minutesTime(start),end:minutesTime(start+duration)};}
async function conflictAction(kind){const p=pendingConflict;if(!p)return;$('conflictDialog').close();pendingConflict=null;
 if(kind==='cancel')return;
 if(kind==='adjust'){
  const next=suggestSlot(p.candidate,p.oldId);editingEventId=p.oldId;openEventDialog(p.oldId);
  const f=$('eventForm');f.elements.date.value=p.candidate.date;f.elements.title.value=p.candidate.title;f.elements.place.value=p.candidate.place;f.elements.note.value=p.candidate.note;
  f.elements.start.value=next?.start||p.candidate.start;f.elements.end.value=next?.end||p.candidate.end;
  toast(next?`비어 있는 ${next.start}부터로 조정했어요. 확인 후 저장하세요.`:'오늘은 빈 시간이 부족해요. 시간을 직접 선택해 주세요.');return;
 }
 if(kind==='replace')await saveEvent(p.candidate,p.oldId,p.conflicts.map(e=>e.id));}
function renderTodos(){const d=activeDoc(),total=d.todos.length,done=d.todos.filter(t=>t.done).length;
 $('todoProgress').textContent=`${done}/${total} 완료`;$('sharedNotes').value=d.notes||'';
 $('todoList').innerHTML=total?d.todos.map(t=>`<div class="list-row"><label class="todo-line"><input type="checkbox" data-check-todo="${esc(t.id)}" ${t.done?'checked':''}><span class="${t.done?'done':''}">${esc(t.title)}</span></label><div class="list-tools"><button class="btn" data-edit-todo="${esc(t.id)}">수정</button><button class="btn" data-remove-todo="${esc(t.id)}">삭제</button></div></div>`).join(''):emptyMessage('추가한 할 일이 없습니다.');
 $('todoList').querySelectorAll('[data-check-todo]').forEach(x=>x.addEventListener('change',()=>void saveTrip(d=>{const todo=d.todos.find(t=>t.id===x.dataset.checkTodo);if(todo)todo.done=x.checked;},'완료 상태를 저장했습니다.')));
 $('todoList').querySelectorAll('[data-edit-todo]').forEach(x=>x.addEventListener('click',()=>{const t=d.todos.find(t=>t.id===x.dataset.editTodo);if(!t)return;const name=prompt('할 일 수정',t.title);if(!name?.trim())return;void saveTrip(x=>{const found=x.todos.find(a=>a.id===t.id);if(found)found.title=name.trim().slice(0,160);},'할 일을 수정했습니다.');}));
 $('todoList').querySelectorAll('[data-remove-todo]').forEach(x=>x.addEventListener('click',()=>{if(!confirm('할 일을 삭제할까요?'))return;void saveTrip(d=>{d.todos=d.todos.filter(t=>t.id!==x.dataset.removeTodo);},'할 일을 삭제했습니다.');}));
 renderFiles();}
async function addTodo(e){e.preventDefault();const f=e.currentTarget,title=f.elements.title.value.trim();if(!title)return;
 await saveTrip(d=>d.todos.push({id:uuid(),title,done:false}),'할 일을 추가했습니다.');f.reset();}
async function saveNotes(){const value=$('sharedNotes').value;
 await saveTrip(d=>{d.notes=value;},'공용 메모를 저장했습니다.');}
function renderFiles(){$('privateFileList').innerHTML=DEMO?emptyMessage('데모 모드에서는 파일 보관 기능이 비활성화됩니다.'):
 privateFiles.length?privateFiles.map(f=>`<div class="list-row"><div><strong>📎 ${esc(f.display_name)}</strong><small>${new Date(f.created_at).toLocaleDateString('ko-KR')} · ${(f.size_bytes/1048576).toFixed(1)} MB · 본인 전용</small></div><div class="list-tools"><button class="btn" data-file-open="${f.id}">보기</button><button class="btn" data-file-rename="${f.id}">이름 수정</button><button class="btn" data-file-delete="${f.id}">삭제</button></div></div>`).join(''):emptyMessage('아직 저장한 예약 PDF나 QR 이미지가 없습니다.');
 $('privateFileList').querySelectorAll('[data-file-open]').forEach(b=>b.addEventListener('click',()=>void openPrivateFile(b.dataset.fileOpen)));
 $('privateFileList').querySelectorAll('[data-file-rename]').forEach(b=>b.addEventListener('click',()=>void renamePrivateFile(b.dataset.fileRename)));
 $('privateFileList').querySelectorAll('[data-file-delete]').forEach(b=>b.addEventListener('click',()=>void deletePrivateFile(b.dataset.fileDelete)));}
async function uploadPrivateFiles(e){if(DEMO)return toast('파일 업로드는 로그인 후 가능합니다.');
 const files=Array.from(e.target.files||[]);if(!files.length)return;
 const types=new Set(['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']);
 const extList={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif'};
 for(const file of files){const ext=file.name.split('.').at(-1).toLowerCase();const mime=types.has(file.type)?file.type:extList[ext];
  if(!mime||!Object.hasOwn(extList,ext)||file.size>15728640||file.size===0){toast('지원 파일: PDF·JPG·PNG·WEBP·HEIC, 각 15MB 이하');continue;}
  const path=`${user.id}/${trip.id}/${uuid()}.${ext}`;status('개인 파일 업로드 중');
  const {error:uploadError}=await client.storage.from('tripkku-next-files').upload(path,file,{contentType:mime,upsert:false});
  if(uploadError){toast('업로드 실패: '+uploadError.message);continue;}
  const {data, error}=await client.from('tripkku_private_files').insert({trip_id:trip.id,user_id:user.id,path,display_name:file.name.slice(0,160),mime_type:mime,size_bytes:file.size}).select('*').single();
  if(error){await client.storage.from('tripkku-next-files').remove([path]);toast('파일 목록 저장 실패: '+error.message);continue;}
  privateFiles.unshift(data);renderFiles();toast('파일을 비공개로 저장했습니다.');
 }
 e.target.value='';status('파일 보관함 동기화 완료');}
async function openPrivateFile(id){const f=privateFiles.find(f=>f.id===id);if(!f)return;
 const {data,error}=await client.storage.from('tripkku-next-files').createSignedUrl(f.path,90);
 if(error){toast('파일 열기 실패: '+error.message);return;}
 window.open(data.signedUrl,'_blank','noopener,noreferrer');}
async function renamePrivateFile(id){const f=privateFiles.find(f=>f.id===id);if(!f)return;
 const next=prompt('목록에 표시할 파일 이름 수정 (원본 파일은 유지)',f.display_name)?.trim();if(!next||next===f.display_name)return;
 const {data,error}=await client.from('tripkku_private_files').update({display_name:next.slice(0,160)}).eq('id',id).select('*').single();
 if(error)return toast('이름 변경 실패: '+error.message);privateFiles=privateFiles.map(x=>x.id===id?data:x);renderFiles();toast('파일 표시 이름을 변경했습니다.');}
async function deletePrivateFile(id){const f=privateFiles.find(f=>f.id===id);if(!f||!confirm(`'${f.display_name}' 파일을 영구 삭제할까요?`))return;
 const {error:storageError}=await client.storage.from('tripkku-next-files').remove([f.path]);
 if(storageError)return toast('저장소 삭제 실패: '+storageError.message);
 const {error}=await client.from('tripkku_private_files').delete().eq('id',id);
 if(error)return toast('파일은 삭제되었지만 목록 정리에 실패했습니다. 관리자에게 알려 주세요.');
 privateFiles=privateFiles.filter(x=>x.id!==id);renderFiles();toast('파일이 삭제됐습니다.');}
function currencyOptions(){const home=currentCountry().currency;return [...new Set([home,'KRW',...MONEY])];}
function renderBudget(){const d=activeDoc(),c=currentCountry(),home=c.currency,shared=d.expenses||[],personal=personalExpenses||[],count=Math.max(1,members.length),uid=user?.id;
 const payerOptions=members.length?members:[{user_id:uid,display_name:'나'}];
 $('expensePayer').innerHTML=payerOptions.map(m=>`<option value="${esc(m.user_id)}">${m.user_id===uid?'나':esc(m.display_name)}</option>`).join('');
 $('expenseCurrency').innerHTML=currencyOptions().map(code=>`<option value="${code}">${code}${code===home?' · 현지 통화':''}</option>`).join('');
 $('expenseCurrency').value=home;$('expenseDate').value=activeDate||trip.start_date;
 const currencies=[...new Set([...shared,...personal].map(x=>x.currency))];if(!currencies.includes(home))currencies.unshift(home);
 $('budgetSummary').innerHTML=currencies.map(currency=>{
  const paid=shared.filter(x=>x.currency===currency&&x.payer===uid).reduce((a,x)=>a+Number(x.amount),0);
  const total=shared.filter(x=>x.currency===currency).reduce((a,x)=>a+Number(x.amount),0);
  const mine=personal.filter(x=>x.currency===currency).reduce((a,x)=>a+Number(x.amount),0);
  return `<div class="summary-item"><small>${currency} · 공동 지출</small><strong>${esc(money(total,currency))}</strong></div>
  <div class="summary-item"><small>${currency} · 내 개인 지출</small><strong>${esc(money(mine,currency))}</strong></div>
  <div class="summary-item"><small>${currency} · 내 공동 결제 차액 (${count}명 균등)</small><strong>${esc(money(paid-total/count,currency))}</strong></div>`;
 }).join('');
 const items=[...shared.map(x=>({...x,scope:'shared'})),...personal.map(x=>({...x,scope:'personal'}))];
 $('expenseList').innerHTML=items.length?items.map(x=>`<div class="list-row"><div><strong>${x.scope==='shared'?'🤝':'👤'} ${esc(x.title)}</strong><small>${esc(x.category)} · ${esc(x.expense_date||x.date||'')} · ${x.scope==='shared'?'공동':'개인'}</small></div><div class="list-tools"><strong>${esc(money(Number(x.amount),x.currency))}</strong><button class="btn" data-edit-expense="${esc(x.id)}" data-scope="${x.scope}">수정</button><button class="btn" data-remove-expense="${esc(x.id)}" data-scope="${x.scope}">삭제</button></div></div>`).join(''):emptyMessage('아직 지출 기록이 없습니다.');
 $('expenseList').querySelectorAll('[data-remove-expense]').forEach(b=>b.addEventListener('click',()=>void removeExpense(b.dataset.removeExpense,b.dataset.scope)));
 $('expenseList').querySelectorAll('[data-edit-expense]').forEach(b=>b.addEventListener('click',()=>void editExpense(b.dataset.editExpense,b.dataset.scope)));}
async function addExpense(e){e.preventDefault();const f=e.currentTarget,d=new FormData(f),scope=d.get('scope'),entry={id:uuid(),title:String(d.get('title')||'').trim().slice(0,100),amount:Number(d.get('amount')),
 currency:String(d.get('currency')||''),category:String(d.get('category')||'기타'),date:String(d.get('date')||'')||trip.start_date,payer:String(d.get('payer')||user.id)};
 if(!entry.title||!Number.isFinite(entry.amount)||entry.amount<=0||entry.amount>100000000000||!currencyOptions().includes(entry.currency))return toast('지출 내용을 확인해 주세요.');
 if(scope==='personal'){
  if(DEMO){personalExpenses.unshift({...entry,expense_date:entry.date});renderBudget();toast('체험 개인 지출 기록 완료 (화면에서만 표시)');}
  else{const {data,error}=await client.from('tripkku_private_expenses').insert({trip_id:trip.id,user_id:user.id,title:entry.title,amount:entry.amount,currency:entry.currency,category:entry.category,expense_date:entry.date}).select('*').single();
   if(error)return toast('개인 지출 저장 실패: '+error.message);personalExpenses.unshift(data);renderBudget();toast('나만 보는 개인 지출을 저장했습니다.');}
 }else await saveTrip(doc=>doc.expenses.push(entry),'공동 지출을 저장했습니다.');
 f.reset();}
async function editExpense(id,scope){const current=scope==='shared'?activeDoc().expenses.find(x=>x.id===id):personalExpenses.find(x=>x.id===id);
 if(!current)return;
 const title=prompt('지출 이름 수정',current.title)?.trim();if(!title)return;
 const raw=prompt('금액 수정',String(current.amount));if(raw===null)return;
 const amount=Number(raw);if(!Number.isFinite(amount)||amount<=0||amount>100000000000)return toast('금액을 확인해 주세요.');
 if(scope==='shared')await saveTrip(d=>{const x=d.expenses.find(e=>e.id===id);if(x){x.title=title.slice(0,100);x.amount=amount;}},'공동 지출을 수정했습니다.');
 else if(DEMO){current.title=title.slice(0,100);current.amount=amount;renderBudget();toast('개인 지출을 수정했습니다.');}
 else{const {data,error}=await client.from('tripkku_private_expenses').update({title:title.slice(0,100),amount}).eq('id',id).select('*').single();
  if(error)return toast('수정 실패: '+error.message);personalExpenses=personalExpenses.map(x=>x.id===id?data:x);renderBudget();toast('개인 지출을 수정했습니다.');}
}
async function removeExpense(id,scope){if(!confirm('이 지출 기록을 삭제할까요?'))return;
 if(scope==='shared')await saveTrip(d=>{d.expenses=d.expenses.filter(x=>x.id!==id);},'공동 지출을 삭제했습니다.');
 else if(DEMO){personalExpenses=personalExpenses.filter(x=>x.id!==id);renderBudget();}
 else{const {error}=await client.from('tripkku_private_expenses').delete().eq('id',id);if(error)return toast(error.message);personalExpenses=personalExpenses.filter(x=>x.id!==id);renderBudget();toast('개인 지출을 삭제했습니다.');}}
function renderPlaces(){const d=activeDoc();$('placeList').innerHTML=d.savedPlaces.length?d.savedPlaces.map(p=>`<div class="list-row"><div><strong>❤️ <a target="_blank" rel="noopener noreferrer" href="${esc(mapUrl(p.name+' '+trip.destination))}">${esc(p.name)}</a></strong><small>이름을 누르면 Google 지도 검색</small></div><div class="list-tools"><button class="btn" data-place-add="${esc(p.id)}">일정 추가</button><button class="btn" data-place-remove="${esc(p.id)}">삭제</button></div></div>`).join(''):emptyMessage('아직 찜한 장소가 없습니다.');
 $('placeList').querySelectorAll('[data-place-add]').forEach(b=>b.addEventListener('click',()=>{const p=d.savedPlaces.find(p=>p.id===b.dataset.placeAdd);if(p)openEventDialog(null,p.name);}));
 $('placeList').querySelectorAll('[data-place-remove]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('저장 장소를 삭제할까요?'))return;void saveTrip(d=>d.savedPlaces=d.savedPlaces.filter(p=>p.id!==b.dataset.placeRemove));}));
 $('reelList').innerHTML=d.reels.length?d.reels.map(x=>`<div class="list-row"><div><strong>📷 <a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener noreferrer">${esc(x.title)}</a></strong><small>${esc(x.url)}</small></div><button class="btn" data-remove-reel="${esc(x.id)}">삭제</button></div>`).join(''):emptyMessage('아직 저장한 영상 링크가 없습니다.');
 $('reelList').querySelectorAll('[data-remove-reel]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('영상 링크를 삭제할까요?'))return;void saveTrip(d=>d.reels=d.reels.filter(x=>x.id!==b.dataset.removeReel));}));}
async function addPlace(e){e.preventDefault();const f=e.currentTarget,name=f.elements.name.value.trim();if(name.length<2)return;
 if(activeDoc().savedPlaces.some(x=>x.name.toLowerCase()===name.toLowerCase()))return toast('이미 저장한 장소입니다.');
 await saveTrip(d=>d.savedPlaces.push({id:uuid(),name}),'장소를 저장했습니다.');f.reset();}
async function addReel(e){e.preventDefault();const f=e.currentTarget,url=safeUrl(f.elements.url.value.trim()),title=f.elements.title.value.trim();
 if(!url||!title)return toast('올바른 영상 주소와 이름을 입력하세요.');await saveTrip(d=>d.reels.push({id:uuid(),url,title}),'영상 링크를 저장했습니다.');f.reset();}
function renderBookings(){const d=activeDoc();$('bookingList').innerHTML=d.bookings.length?d.bookings.map(x=>`<div class="list-row"><div><strong>${esc(x.kind)} · ${esc(x.title)}</strong><small>${esc(x.date||'')} ${esc(x.time||'')} · ${esc(x.note||'')}</small></div><button class="btn" data-booking-delete="${esc(x.id)}">삭제</button></div>`).join(''):emptyMessage('아직 등록한 교통·숙소 예약이 없습니다.');
 $('bookingDate').value=activeDate||trip.start_date;$('bookingList').querySelectorAll('[data-booking-delete]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('예약 메모를 삭제할까요?'))return;void saveTrip(d=>d.bookings=d.bookings.filter(x=>x.id!==b.dataset.bookingDelete));}));}
async function addBooking(e){e.preventDefault();const f=e.currentTarget,d=new FormData(f),entry={id:uuid(),kind:String(d.get('kind')),title:String(d.get('title')).trim().slice(0,120),date:String(d.get('date')),time:String(d.get('time')),note:String(d.get('note')).slice(0,300)};
 if(!entry.title)return;await saveTrip(d=>d.bookings.push(entry),'예약 메모를 저장했습니다.');f.reset();}
function localeForLanguage(code){return LANGUAGES[code]?.[1]||'en-US';}
function renderTranslatorConfig(){if(!trip)return;const c=currentCountry();const d=activeDoc();const chosen=d.meta?.language||c.language;
 const box=$('localLanguage'),before=box.value;
 box.innerHTML=[...new Set([...c.languages,...Object.keys(LANGUAGES)])].map(l=>`<option value="${esc(l)}">${esc(languageLabel(l))}${c.languages.includes(l)?' · 현지':''}</option>`).join('');
 box.value=LANGUAGES[chosen]?chosen:c.language;
 $('translationTitle').textContent=`${c.flag} 한국어 ↔ ${languageLabel(box.value)} 바로 번역`;
 $('translateCountryHint').textContent=`${c.name} 여행 기준 · 기본 현지 통화 ${c.currency} · 영어·지역별 언어로 변경 가능`;
 $('translateExternal').href=translateExternalUrl();$('papagoExternal').hidden=!['ja','en','zh-CN','zh-TW','vi','th'].includes(box.value);
}
function translateExternalUrl(){const lang=$('localLanguage').value||currentCountry().language,dir=$('translationDirection').value,text=$('translateInput').value||'';
 return 'https://translate.google.com/?sl='+encodeURIComponent(dir==='to-local'?'ko':dir==='to-ko'?lang:'auto')+'&tl='+encodeURIComponent(dir==='to-ko'?'ko':lang)+'&text='+encodeURIComponent(text.slice(0,600))+'&op=translate';}
function setTranslateStatus(text){$('translateStatus').textContent=text;}
async function translateText(){if(!trip)return;const text=$('translateInput').value.trim(),language=$('localLanguage').value,direction=$('translationDirection').value;
 if(!text)return setTranslateStatus('번역할 문장을 입력해 주세요.');
 const btn=$('translateRun');setBusy(btn,true);
 try{const result=await aiCall('translate',{text,language,direction});$('translateOutput').value=result.translation;
  lastTranslatedLang=result.targetLang||language;setTranslateStatus('번역을 완료했습니다.');}
 catch(e){setTranslateStatus('번역이 안 되면 아래 외부 번역기를 이용해 주세요. '+e.message);}
 finally{setBusy(btn,false,'번역');$('translateExternal').href=translateExternalUrl();}}
function speak(text,lang){if(!text.trim())return setTranslateStatus('읽어줄 문장이 없습니다.');
 if(!('speechSynthesis' in window))return setTranslateStatus('이 브라우저에서 음성 듣기를 지원하지 않습니다.');
 const utterance=new SpeechSynthesisUtterance(text);utterance.lang=localeForLanguage(lang);utterance.rate=0.93;
 const voices=speechSynthesis.getVoices();const wanted=voices.find(v=>v.lang.toLowerCase()===utterance.lang.toLowerCase())||voices.find(v=>v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0,2)));
 if(wanted)utterance.voice=wanted;window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);setTranslateStatus('음성을 재생하고 있어요.');}
function startSpeech(){const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Speech){setTranslateStatus('이 아이폰/브라우저는 웹 음성 인식이 제한돼요. 키보드의 🎙 받아쓰기를 이용해 주세요.');return;}
 if(recognition){recognition.stop();recognition=null;setTranslateStatus('음성 입력 중지');return;}
 const dir=$('translationDirection').value,lang=$('localLanguage').value;
 recognition=new Speech();recognition.lang=dir==='to-ko'?localeForLanguage(lang):'ko-KR';recognition.interimResults=false;recognition.maxAlternatives=1;
 recognition.onresult=e=>{$('translateInput').value=e.results[0][0].transcript;setTranslateStatus('음성을 인식했습니다. 번역 중…');void translateText();};
 recognition.onerror=()=>setTranslateStatus('음성 인식이 되지 않았습니다. 아이폰 키보드 받아쓰기를 이용해 주세요.');
 recognition.onend=()=>{recognition=null;$('translateMic').textContent='🎙 말하기';};
 try{recognition.start();$('translateMic').textContent='■ 녹음 중지';setTranslateStatus('말씀해 주세요.');}catch(e){recognition=null;setTranslateStatus('마이크 권한과 브라우저 지원 여부를 확인해 주세요.');}}
function swapTranslate(){const x=$('translationDirection');x.value=x.value==='to-ko'?'to-local':'to-ko';
 const before=$('translateInput').value,after=$('translateOutput').value;if(after){$('translateInput').value=after;$('translateOutput').value=before;}
 $('translateExternal').href=translateExternalUrl();}
function renderChat(){if(!trip)return;
 $('chatMessages').innerHTML=chatHistory.length?chatHistory.map(m=>`<p class="${m.role==='user'?'chat-user':'chat-bot'}">${esc(m.text)}</p>`).join(''):
 '<p class="chat-bot">여행·맛집·교통·일상 질문까지 편하게 물어보세요. 일정 변경은 확인 후에만 적용됩니다.</p>';
 const box=$('chatProposals');box.innerHTML=pendingChatActions.map((a,i)=>`<div class="chat-proposal"><p><strong>${a.op==='delete_event'?'일정 삭제':a.op==='update_event'?'일정 변경':'일정 추가'} 제안</strong><br>${esc(fmtDate(a.date))}${a.op==='delete_event'?'':` · ${esc(a.start)}~${esc(a.end)}`}<br>${esc(a.title||findEvent(a.id)?.title||'선택 일정')}</p><button class="btn primary" data-accept-ai="${i}">확인 후 적용</button> <button class="btn" data-reject-ai="${i}">거절</button></div>`).join('');
 box.querySelectorAll('[data-accept-ai]').forEach(b=>b.addEventListener('click',()=>void applyChatAction(Number(b.dataset.acceptAi))));
 box.querySelectorAll('[data-reject-ai]').forEach(b=>b.addEventListener('click',()=>{pendingChatActions.splice(Number(b.dataset.rejectAi),1);renderChat();}));
 $('chatMessages').scrollTop=$('chatMessages').scrollHeight;}
async function sendChat(e){e.preventDefault();if(!trip)return;const f=e.currentTarget,message=f.elements.message.value.trim();if(!message)return;
 const btn=f.querySelector('button[type=submit]');const history=chatHistory.slice(-8).map(m=>({role:m.role==='bot'?'assistant':'user',text:String(m.text||'').slice(0,850)}));chatHistory.push({role:'user',text:message});renderChat();f.reset();setBusy(btn,true);
 try{const res=await aiCall('chat',{message,history});chatHistory.push({role:'bot',text:res.reply||'다시 시도해 주세요.'});
  pendingChatActions=Array.isArray(res.actions)?res.actions:[];
 }catch(e){chatHistory.push({role:'bot',text:'답변을 가져오지 못했습니다. '+e.message});}
 finally{setBusy(btn,false,'보내기');renderChat();}}
async function applyChatAction(index){const a=pendingChatActions[index];if(!a)return;
 const existing=a.op==='add_event'?null:findEvent(a.id);
 if(a.op!=='add_event'&&!existing){toast('수정 대상 일정을 찾지 못했습니다.');return;}
 if(a.op==='delete_event'){
  if(!confirm(`'${existing.title}' 일정을 삭제할까요?`))return;
  await saveTrip(d=>{for(const day of d.days)day.events=day.events.filter(e=>e.id!==a.id);},'AI 제안에 따라 일정을 삭제했습니다.');
 }else{
  const candidate={id:existing?.id||uuid(),date:a.date,start:a.start,end:a.end,title:a.title,place:a.place||'',note:a.note||'',kind:'visit'};
  const overlap=conflictsFor(candidate,existing?.id||null);
  if(overlap.length){pendingConflict={candidate,oldId:existing?.id||null,conflicts:overlap};$('conflictDetails').textContent=overlap.map(e=>`${e.start}~${e.end} ${e.title}`).join('\n');$('conflictDialog').showModal();}
  else await saveEvent(candidate,existing?.id||null,[]);
 }
 pendingChatActions.splice(index,1);renderChat();}
// Feedback: a signed-in user can submit/view own records; DB RLS grants all-record and status control to SQL-provisioned admins only.
const feedbackStatusNames={new:'접수됨',reviewing:'검토 중',resolved:'처리 완료'};
const feedbackCategoryNames={bug:'🐛 오류·불편',idea:'💡 개선·기능 제안',other:'💬 기타'};
async function refreshBetaAdminRole(){
 if(DEMO||!user){isBetaAdmin=false;$('adminFeedbackBtn').hidden=true;return;}
 const {data,error}=await client.from('tripkku_beta_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 isBetaAdmin=!error&&!!data;$('adminFeedbackBtn').hidden=!isBetaAdmin;
 if(error)console.warn('TRIPKKU feedback setup not complete:',error.message);
}
function feedbackFormTrips(){const select=$('feedbackTripSelect');const selected=select.value;
 select.innerHTML='<option value="">전체 서비스</option>'+trips.map(t=>`<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('');
 select.value=(trip?.id||selected||'');if(!select.value)select.selectedIndex=0;
}
async function openFeedback(admin=false){
 if(!user)return toast('피드백은 로그인 후 사용할 수 있습니다.');
 feedbackReturnScreen=trip?'trip':'home';showScreen('feedback');feedbackFormTrips();
 $('feedbackAdminPanel').hidden=!isBetaAdmin;
 $('feedbackNotice').textContent=DEMO?'체험 모드에서는 실제 피드백을 제출할 수 없습니다. Google 계정으로 로그인해 주세요.':'작성한 의견은 관리자에게만 전달됩니다.';
 if(DEMO){$('myFeedbackList').innerHTML=emptyMessage('데모 모드에서는 피드백 저장이 제공되지 않습니다.');return;}
 await refreshFeedback();
 if(admin&&isBetaAdmin)$('feedbackAdminPanel').scrollIntoView({behavior:'smooth',block:'start'});
 else window.scrollTo({top:0,behavior:'smooth'});
}
function closeFeedback(){showScreen(feedbackReturnScreen==='trip'&&trip?'trip':'home');window.scrollTo({top:0,behavior:'smooth'});}
function feedbackStamp(value){if(!value)return '';const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):String(value);}
function renderFeedback(){
 const own=feedbackEntries.filter(x=>x.user_id===user?.id);
 $('myFeedbackList').innerHTML=own.length?own.map(x=>`<article class="feedback-entry"><div class="feedback-entry-head"><strong>${esc(feedbackCategoryNames[x.category]||'💬 기타')}</strong><span class="feedback-state">${esc(feedbackStatusNames[x.status]||x.status)}</span></div><p>${esc(x.message)}</p><small>${esc(feedbackStamp(x.created_at))}</small>${x.admin_note?`<div class="feedback-reply"><strong>관리자 답변</strong><p>${esc(x.admin_note)}</p></div>`:''}</article>`).join(''):emptyMessage('아직 남긴 피드백이 없어요.');
 $('feedbackAdminPanel').hidden=!isBetaAdmin;
 if(!isBetaAdmin)return;
 const filter=$('feedbackFilter').value,all=feedbackEntries.filter(x=>filter==='all'||x.status===filter);
 $('feedbackAdminCount').textContent=feedbackEntries.length+'건';
 $('feedbackAdminList').innerHTML=all.length?all.map(x=>`<article class="feedback-entry" data-feedback-id="${esc(x.id)}"><div class="feedback-entry-head"><strong>${esc(feedbackCategoryNames[x.category]||'💬 기타')}</strong><small>${esc(feedbackStamp(x.created_at))}</small></div><p>${esc(x.message)}</p><small>작성자 ID: ${esc(String(x.user_id).slice(0,8))}…${x.trip_id?' · 관련 여행: '+esc(String(x.trip_id).slice(0,8))+'…':''}</small><div class="feedback-admin-fields"><label>처리 상태<select data-fb-status><option value="new"${x.status==='new'?' selected':''}>접수됨</option><option value="reviewing"${x.status==='reviewing'?' selected':''}>검토 중</option><option value="resolved"${x.status==='resolved'?' selected':''}>처리 완료</option></select></label><label>관리자 답변<textarea rows="2" maxlength="2000" data-fb-note placeholder="작성자에게 보일 답변">${esc(x.admin_note||'')}</textarea></label><button class="btn primary small" data-fb-save="${esc(x.id)}" type="button">상태·답변 저장</button></div></article>`).join(''):emptyMessage('해당 상태의 피드백이 없습니다.');
}
async function refreshFeedback(){if(DEMO||!user)return;
 $('feedbackNotice').textContent='피드백을 불러오는 중…';
 const {data,error}=await client.from('tripkku_beta_feedback')
  .select('id,user_id,trip_id,category,message,status,admin_note,created_at,updated_at')
  .order('created_at',{ascending:false}).limit(200);
 if(error){$('feedbackNotice').textContent='피드백을 불러올 수 없어요. Supabase SQL Editor에서 02-beta-feedback.sql을 실행했는지 확인해 주세요. ('+error.message+')';return;}
 feedbackEntries=data||[];$('feedbackNotice').textContent='의견은 작성자 본인과 관리자만 열람할 수 있습니다.';renderFeedback();
}
async function submitFeedback(e){e.preventDefault();if(DEMO)return toast('데모에서는 제출할 수 없습니다. 로그인해 주세요.');
 if(!user)return toast('먼저 로그인해 주세요.');
 const form=e.currentTarget,category=form.elements.category.value,message=form.elements.message.value.trim(),tripId=form.elements.tripId.value;
 if(!['bug','idea','other'].includes(category)||message.length<5||message.length>2000)return toast('의견은 5~2000자로 작성해 주세요.');
 const button=$('feedbackSendBtn');setBusy(button,true,'관리자에게 보내기');
 try{const row={category,message,trip_id:tripId||null};
  const {error}=await client.from('tripkku_beta_feedback').insert(row);if(error)throw error;
  form.elements.message.value='';$('feedbackNotice').textContent='피드백이 접수됐습니다. 감사합니다!';toast('피드백을 보냈습니다.');await refreshFeedback();
 }catch(err){$('feedbackNotice').textContent='전송 실패: '+err.message;}finally{setBusy(button,false,'관리자에게 보내기');}
}
async function updateAdminFeedback(id){if(!isBetaAdmin||DEMO)return;
 const entry=[...document.querySelectorAll('[data-feedback-id]')].find(e=>e.dataset.feedbackId===id);if(!entry)return;
 const status=entry.querySelector('[data-fb-status]').value,admin_note=entry.querySelector('[data-fb-note]').value.trim();
 if(!['new','reviewing','resolved'].includes(status)||admin_note.length>2000)return toast('처리 상태와 답변을 확인해 주세요.');
 const btn=entry.querySelector('[data-fb-save]');setBusy(btn,true,'상태·답변 저장');
 try{const {data,error}=await client.from('tripkku_beta_feedback').update({status,admin_note}).eq('id',id).select('id');
  if(error)throw error;if(!data?.length)throw new Error('관리자 권한을 확인해 주세요.');toast('처리 상태와 답변이 저장됐습니다.');await refreshFeedback();
 }catch(err){toast('관리자 저장 실패: '+err.message);}finally{setBusy(btn,false,'상태·답변 저장');}
}
function bindHandlers(){
 $('goHome').addEventListener('click',goHome);$('backHome').addEventListener('click',goHome);
 $('themeToggle').addEventListener('click',()=>{localStorage.setItem('tripkku-next-night',document.body.classList.contains('night')?'no':'yes');applyTheme();});
 $('moodToggle').addEventListener('click',()=>{const old=localStorage.getItem('tripkku-next-mood')||'happy';const next=MOODS[(MOODS.findIndex(x=>x[0]===old)+1)%MOODS.length][0];localStorage.setItem('tripkku-next-mood',next);applyTheme();});
 $('loginBtn').addEventListener('click',()=>void login());$('logoutBtn').addEventListener('click',async()=>{if(DEMO){goHome();return;}await client.auth.signOut();user=null;trip=null;isBetaAdmin=false;$('feedbackTop').hidden=true;$('adminFeedbackBtn').hidden=true;showScreen('auth');});
 $('newTripForm').addEventListener('submit',e=>void createTripFromForm(e));$('refreshTrips').addEventListener('click',()=>void loadTrips());
 $('joinBtn').addEventListener('click',()=>void joinTrip($('joinCode').value));$('inviteTop').addEventListener('click',()=>void copyInvite());
 $('tripList').addEventListener('click',e=>{const b=e.target.closest('[data-open-trip]');if(b)void openTrip(b.dataset.openTrip);});
 document.querySelectorAll('#mainNav button').forEach(b=>b.addEventListener('click',()=>{chooseTab(b.dataset.tab);window.scrollTo({top:0,behavior:'smooth'});}));
 $('regeneratePlan').addEventListener('click',()=>void generatePlan());$('addEvent').addEventListener('click',()=>openEventDialog());
 $('eventForm').addEventListener('submit',e=>void submitEvent(e));
 document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',() => $(b.dataset.closeDialog).close()));
 $('conflictCancel').addEventListener('click',()=>void conflictAction('cancel'));
 $('conflictAdjust').addEventListener('click',()=>void conflictAction('adjust'));
 $('conflictReplace').addEventListener('click',()=>void conflictAction('replace'));
 $('todoForm').addEventListener('submit',e=>void addTodo(e));$('saveNotes').addEventListener('click',()=>void saveNotes());
 $('fileUpload').addEventListener('change',e=>void uploadPrivateFiles(e));
 $('expenseForm').addEventListener('submit',e=>void addExpense(e));
 $('placeForm').addEventListener('submit',e=>void addPlace(e));$('reelForm').addEventListener('submit',e=>void addReel(e));
 $('bookingForm').addEventListener('submit',e=>void addBooking(e));
 $('localLanguage').addEventListener('change',()=>{
  const lang=$('localLanguage').value;void saveTrip(d=>{d.meta.language=lang;},languageLabel(lang)+' 번역 언어로 변경했습니다.');
 });
 $('translationDirection').addEventListener('change',()=>{$('translateExternal').href=translateExternalUrl();});
 $('translateRun').addEventListener('click',()=>void translateText());$('translateMic').addEventListener('click',startSpeech);
 $('translateSourceSpeak').addEventListener('click',()=>speak($('translateInput').value,$('translationDirection').value==='to-ko'?$('localLanguage').value:'ko'));
 $('translateSpeak').addEventListener('click',()=>speak($('translateOutput').value,lastTranslatedLang||$('localLanguage').value));
 $('translateCopy').addEventListener('click',async()=>{const t=$('translateOutput').value;if(!t)return;try{await navigator.clipboard.writeText(t);setTranslateStatus('번역 결과를 복사했습니다.');}catch{setTranslateStatus('복사가 제한됐어요. 결과를 길게 눌러 복사해 주세요.');}});
 $('translateSwitch').addEventListener('click',swapTranslate);
 $('translateInput').addEventListener('input',()=>{$('translateExternal').href=translateExternalUrl();});
 $('chatForm').addEventListener('submit',e=>void sendChat(e));
 $('feedbackTop').addEventListener('click',()=>void openFeedback(false));
 $('adminFeedbackBtn').addEventListener('click',()=>void openFeedback(true));
 $('feedbackBack').addEventListener('click',closeFeedback);
 $('feedbackForm').addEventListener('submit',e=>void submitFeedback(e));
 $('feedbackRefresh').addEventListener('click',()=>void refreshFeedback());
 $('feedbackFilter').addEventListener('change',renderFeedback);
 $('feedbackAdminList').addEventListener('click',e=>{const b=e.target.closest('[data-fb-save]');if(b)void updateAdminFeedback(b.dataset.fbSave);});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&trip&&!DEMO)void refreshTripFromCloud();});
}
void init();
