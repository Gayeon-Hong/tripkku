import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm';
import {COUNTRIES,BY_COUNTRY,LANGUAGES,suggestCountry,countryInfo,languageLabel} from './countries.js';
import {OITA_DEFAULTS} from './oita-templates.js';
import {convertOitaRoom} from './oita-import.mjs';

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
const isGoogleMapLink=url=>{try{const u=new URL(url);return u.protocol==='https:'&&(['google.com','www.google.com','maps.google.com','maps.app.goo.gl','goo.gl'].includes(u.hostname)||u.hostname.endsWith('.google.com')&&u.pathname.startsWith('/maps'));}catch{return false;}};
const displayMapUrl=(item)=>isGoogleMapLink(item?.mapUrl)?item.mapUrl:mapUrl(item?.name||item?.place||'');
const eventEmoji=(e)=>e.emoji||({food:'🍜',move:'🚆',flight:'✈️',hotel:'🏨',visit:'📍',other:'✨'})[e.kind]||'📍';
const compactCountry=(code)=>countryInfo(code)?.name||code;
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
function currentCountry(){const day=activeDoc().days?.find(d=>d.date===activeDate);return countryInfo(day?.countryCode||trip?.country_code||trip?.data?.meta?.countryCode||'JP');}
function tripDates(){return daysBetween(trip?.start_date||'',trip?.end_date||'');}
function activeDoc(){return trip?.data||{};}
function normalizeDoc(d){d.meta??={};d.meta.countries??=[d.meta.countryCode||'JP'];d.meta.countries=[...new Set(d.meta.countries.filter(x=>BY_COUNTRY[x]))];d.meta.countries.length||d.meta.countries.push(d.meta.countryCode||'JP');d.days??=[];d.todos??=[];d.notes??='';d.savedPlaces??=[];d.reels??=[];d.expenses??=[];d.bookings??=[];return d;}
function newDoc(meta){return normalizeDoc({meta,days:daysBetween(meta.startDate,meta.endDate).map(date=>({date,title:'자유 일정',events:[]})),todos:[{id:uuid(),title:'항공편과 여권·출입국 서류 확인',done:false},{id:uuid(),title:'현지 인터넷·교통·숙소 예약 확인',done:false}],notes:'',savedPlaces:[],reels:[],expenses:[],bookings:[]});}
const DEFAULT_DEMO_KEY='tripkku-next-demo-v1';
let feedbackReturnScreen='home',isBetaAdmin=false,feedbackEntries=[],legacyRooms=[],adminTripIndex=[];
let budgetFxRates={KRW:1},budgetFxDate='',budgetFxLast=0,budgetFxFetching=false,budgetFxError='';
let user=null, trips=[],trip=null,revision=0,members=[],personalExpenses=[],privateFiles=[],activeTab='schedule',activeDate='',pendingPlan=null,pendingChatActions=[],chatHistory=[],editingEventId=null,saveQueue=Promise.resolve(),subscription=null,pendingConflict=null,recognition=null,lastTranslatedLang='',pendingEventMapUrl='',selectedBookingFile=null,bookingPendingForEvent=null;
function demoTrips(){try{return JSON.parse(localStorage.getItem(DEFAULT_DEMO_KEY)||'[]');}catch{return [];}}
function setDemoTrips(rows){localStorage.setItem(DEFAULT_DEMO_KEY,JSON.stringify(rows));}
function setBusy(el,busy,label){if(!el)return;el.disabled=busy;if(label)el.textContent=busy?'처리 중…':label;}
function latestMeta(row){return row?.data?.meta||{};}
function updateLocaleHint(){const input=$('newDestination').value.trim();const selected=$('newCountry').value;const guess=suggestCountry(input);
 if(!selected&&guess){$('newCountry').value=guess;$('newCountry').dataset.autoSuggested='yes';}
 if($('newCountry').dataset.autoSuggested==='yes'&&selected&&selected!==guess&&guess){/* never overwrite a manual selection */}
 const code=$('newCountry').value,info=BY_COUNTRY[code];
 $('localeHint').textContent=info?`${info.flag} ${info.name} · ${languageLabel(info.language)} 번역 · ${info.currency} · 여러 국가를 함께 입력하면 일정·언어·통화에 추가됩니다.`:'도시를 입력하면 국가를 추천합니다. 다른 나라가 있으면 쉼표로 함께 적어 주세요.';
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
const COUNTRY_ALIASES={Italy:'IT',France:'FR',Germany:'DE',Switzerland:'CH',Austria:'AT',Spain:'ES',UK:'GB',England:'GB',Japan:'JP',Korea:'KR',USA:'US',Netherlands:'NL',Belgium:'BE',Portugal:'PT',Czechia:'CZ'};
function parseExtraCountries(raw,primary){const inputs=String(raw||'').split(/[,\n、;]+/).map(s=>s.trim()).filter(Boolean);const result=[primary],unknown=[];
 for(const name of inputs){const lc=name.toLowerCase(),found=COUNTRIES.find(c=>c.name===name||c.code.toLowerCase()===lc||countryAliasMatch(name,c.code));if(found&&!result.includes(found.code))result.push(found.code);else if(!found)unknown.push(name);}
 return {countries:result,unknown};}
function countryAliasMatch(raw,code){return Object.entries(COUNTRY_ALIASES).some(([key,id])=>id===code&&key.toLowerCase()===raw.toLowerCase());}
function itineraryCountries(){return (activeDoc().meta?.countries||[trip?.country_code||'JP']).filter(c=>BY_COUNTRY[c]);}
function countriesText(){return itineraryCountries().map(c=>countryInfo(c).flag+' '+countryInfo(c).name).join(' · ');}
const MOODS=[['happy','😊'],['love','🥰'],['sleepy','😴'],['angry','😡']];
function applyTheme(){const night=localStorage.getItem('tripkku-next-night')==='yes';document.body.classList.toggle('night',night);
 const mood=MOODS.find(x=>x[0]===localStorage.getItem('tripkku-next-mood'))||MOODS[0];
 $('themeToggle').textContent=night?'☀':'☾';$('moodToggle').textContent=mood[1];
 document.querySelectorAll('.hero-earth,.trip-earth').forEach(img=>img.src=`../assets/earth-icon-${night?'dark':'light'}-${mood[0]}-192.png`);}

function oauthReturnError(){
 const params=new URLSearchParams(location.search), hash=new URLSearchParams(location.hash.slice(1));
 const error=params.get('error_description')||hash.get('error_description')||params.get('error')||hash.get('error');
 if(error){if(/Unable to exchange external code/i.test(error))return '구글 로그인 인증코드 교환 실패: Supabase Google Provider의 Client ID / Client Secret과 Google Cloud OAuth callback URI를 확인해 주세요. 인증 상세 원인은 Auth Logs를 확인해 주세요.';return '로그인 오류: '+error.slice(0,160);}
 try{const t=Number(sessionStorage.getItem('tripkku-oauth-pending')||0);if(t&&Date.now()-t<15*60*1000)return 'Google 로그인 후 인증 세션이 없습니다. Supabase Auth Redirect URLs에 /tripkku/next/를 추가하고 브라우저의 사이트 데이터 허용 여부를 확인해 주세요.';}catch(_){}
 return '';
}
async function init(){initCountryPicker();applyTheme();bindHandlers();
 if(DEMO){user={id:MY_UID,user_metadata:{full_name:'체험 사용자'}};$('logoutBtn').hidden=true;$('feedbackTop').hidden=false;$('authError').textContent='';await loadTrips();return;}
 client.auth.onAuthStateChange((event,session)=>{if(session?.user){try{sessionStorage.removeItem('tripkku-oauth-pending');}catch(_){} const changed=user?.id!==session.user.id;user=session.user;$('logoutBtn').hidden=false;$('feedbackTop').hidden=false;if(changed)queueMicrotask(()=>loadTrips());}
  else{user=null;trip=null;trips=[];isBetaAdmin=false;$('logoutBtn').hidden=true;$('feedbackTop').hidden=true;$('adminFeedbackBtn').hidden=true;setLegacyAdminVisibility(false);showScreen('auth');}});
 const {data,error}=await client.auth.getSession();if(error)console.warn('TRIPKKU auth',error.message);
 if(data.session?.user){try{sessionStorage.removeItem('tripkku-oauth-pending');}catch(_){} user=data.session.user;$('logoutBtn').hidden=false;$('feedbackTop').hidden=false;await loadTrips();}else{showScreen('auth');$('authError').textContent=oauthReturnError()||(error?'인증 확인 실패: '+error.message:'');}
}
async function login(provider='google'){try{const redirectTo=new URL('./',location.href).href;try{const invite=new URLSearchParams(location.search).get('invite');if(invite)sessionStorage.setItem('tripkku-next-pending-invite',invite);sessionStorage.setItem('tripkku-oauth-pending',String(Date.now()));}catch(_){} const {error}=await client.auth.signInWithOAuth({provider,options:{redirectTo}});if(error)throw error;}catch(e){$('authError').textContent='로그인 실패: '+e.message;}}
async function loadTrips(){if(!user)return;status(DEMO?'체험 모드':'여행 목록 동기화 중');showScreen('home');try{
 if(DEMO)trips=demoTrips();
 else{
  // Only owned/joined trips appear on the ordinary home screen. Admin-only trips have their own read-only panel.
  const {data:mine,error:memberError}=await client.from('tripkku_trip_members').select('trip_id').eq('user_id',user.id).limit(500);
  if(memberError)throw memberError;
  const ids=[...new Set((mine||[]).map(m=>m.trip_id).filter(Boolean))];
  if(!ids.length)trips=[];
  else{const {data,error}=await client.from('tripkku_trips').select('id,owner_id,invite_code,title,destination,country_code,start_date,end_date,data,revision,updated_at').in('id',ids).order('updated_at',{ascending:false}).limit(100);if(error)throw error;trips=data||[];}
 }
 renderTripList();status(DEMO?'체험 모드 · 서버 저장 안 됨':'여행 목록 준비 완료');await refreshBetaAdminRole();
 let inv=new URLSearchParams(location.search).get('invite');try{inv=inv||sessionStorage.getItem('tripkku-next-pending-invite');}catch(_){} if(inv&&!DEMO){try{sessionStorage.removeItem('tripkku-next-pending-invite');}catch(_){} history.replaceState({},'',location.pathname);await joinTrip(inv);}
 }catch(e){status('Supabase 설정 확인');$('tripList').innerHTML=emptyMessage('새 여행 테이블을 불러올 수 없어요. setup.sql을 SQL Editor에서 실행했는지 확인해 주세요. ('+e.message+')');}
}
function renderTripList(){$('tripList').innerHTML=trips.length?trips.map(t=>{const c=countryInfo(t.country_code);return `<div class="trip-card"><div><strong>${c.flag} ${esc(t.title)}</strong><small>${esc(t.destination)} · ${esc(fmtDate(t.start_date))}~${esc(fmtDate(t.end_date))}</small></div><button class="btn small" data-open-trip="${esc(t.id)}">열기</button></div>`;}).join(''):emptyMessage('아직 여행이 없어요. 왼쪽에서 첫 여행을 만들어 보세요.');}
async function createTripFromForm(e){e.preventDefault();if(!user)return toast('먼저 로그인해 주세요.');const f=e.currentTarget;const d=new FormData(f);
 const destination=String(d.get('destination')||'').trim(),country=String(d.get('country')||'');
 const start=String(d.get('start')||''),end=String(d.get('end')||''),dates=daysBetween(start,end);
 if(destination.length<2||!BY_COUNTRY[country])return toast('여행지와 국가를 확인해 주세요.');
 if(!dates.length)return toast('여행 기간은 1~14일 사이로 설정해 주세요.');
 const other=parseExtraCountries(d.get('additionalCountries'),country);if(other.unknown.length)return toast('국가 이름을 확인해 주세요: '+other.unknown.join(', '));
 const meta={countryCode:country,countries:other.countries,travelRoute:String(d.get('travelRoute')||'').slice(0,350),destination,startDate:start,endDate:end,travelers:Number(d.get('travelers'))||2,style:String(d.get('style')),pace:String(d.get('pace')),
 budget:String(d.get('budget')||'').slice(0,60),mustVisit:String(d.get('mustVisit')||'').slice(0,900),constraints:String(d.get('constraints')||'').slice(0,1100),language:countryInfo(country).language};
 const title=destination+' '+dates.length+'일 여행',doc=newDoc(meta),btn=$('newTripSubmit');setBusy(btn,true);
 try{let id;
 if(DEMO){id=uuid();trips.unshift({id,owner_id:MY_UID,invite_code:'demo-only',title,country_code:country,destination,start_date:start,end_date:end,data:doc,revision:0,updated_at:new Date().toISOString()});setDemoTrips(trips);}
 else{const {data,error}=await client.rpc('tripkku_create_trip',{p_title:title,p_country:country,p_destination:destination,p_start:start,p_end:end,p_data:doc});if(error)throw error;id=data;await loadTrips();}
 await openTrip(id);toast('여행이 생성되었습니다. 일정 추천을 시작합니다.');await generatePlan(true);
 }catch(err){toast('여행 생성 실패: '+err.message);}finally{setBusy(btn,false,'✨ 여행 만들고 추천 일정 받기');}}
async function joinTrip(raw){const token=String(raw||'').trim().toLowerCase();
 if(!/^[0-9a-f]{32}$/.test(token)){toast('초대 코드가 올바르지 않아요. 새 개인 초대 링크를 요청해 주세요.');return;}
 if(DEMO){toast('체험 모드에서는 초대에 참여할 수 없어요.');return;}
 try{const {data:id,error}=await client.rpc('tripkku_accept_invitation',{p_token:token});
  if(error)throw error;toast('초대받은 여행에 참여했어요. 함께 수정할 수 있습니다.');await loadTrips();if(id)await openTrip(id);
 }catch(e){toast('초대 참여 실패: '+e.message+' · 초대를 받은 계정의 로그인 이메일을 확인해 주세요.');}}

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
 activeDate=tripDates()[0]||'';window.tripkkuSetTravelCurrency?.(countryInfo(trip.country_code)?.currency||'USD');activeTab='schedule';pendingPlan=null;pendingChatActions=[];chatHistory=[];selectedBookingFile=null;bookingPendingForEvent=null;showScreen('trip');renderAll();chooseTab('schedule');
 localStorage.setItem('tripkku-next-last-trip',id);window.scrollTo({top:0,behavior:'auto'});status(DEMO?'체험 모드':'친구와 저장 연결됨 ✓');
 }catch(e){toast('여행 열기 실패: '+e.message);showScreen('home');}}
async function refreshTripFromCloud(){if(!trip||DEMO)return;
 const {data,error}=await client.from('tripkku_trips').select('*').eq('id',trip.id).single();
 if(!data&&(error?.code==='PGRST116'||error?.code==='42501'||error?.status===403)){
  toast('이 여행의 접근 권한이 해제되었습니다.');goHome();return;
 }
 if(error||!data||data.revision<=revision)return;
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
 $('activeCountry').textContent=countriesText();$('activeLanguage').textContent='번역: '+languageLabel(lang);$('activeCurrency').textContent='통화: '+[...new Set(itineraryCountries().map(code=>BY_COUNTRY[code].currency))].join(' · ');
 $('inviteTop').hidden=!isTripOwner();}
function chooseTab(tab){activeTab=tab;document.querySelectorAll('#mainNav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 document.querySelectorAll('.workspace-page').forEach(x=>x.hidden=x.id!==tab+'Page');if(tab==='assistant')renderTranslatorConfig();if(tab==='budget')void ensureBudgetFxRates();}
function renderAll(){if(!trip)return;renderIntro();renderSchedule();renderTodos();renderBudget();renderPlaces();renderBookings();renderTranslatorConfig();renderChat();}
function goHome(){if(trip){trip=null;pendingPlan=null;}if(subscription){void client.removeChannel(subscription);subscription=null;}
 $('inviteTop').hidden=true;showScreen(user?'home':'auth');if(user)void loadTrips();window.scrollTo({top:0,behavior:'smooth'});}
function isTripOwner(){return Boolean(!DEMO&&user&&trip&&trip.owner_id===user.id);}
async function copyTextSafe(value){
 try{await navigator.clipboard.writeText(value);return true;}
 catch(_){prompt('이 링크를 복사하세요',value);return false;}
}
async function copyInvite(){
 if(!isTripOwner())return toast('여행방을 만든 사람만 친구를 초대할 수 있어요.');
 $('inviteCreatedBox').hidden=true;$('inviteRecipientEmail').value='';$('inviteStatus').textContent='';
 renderInviteMembers();$('inviteDialog').showModal();
}
function renderInviteMembers(){
 const box=$('inviteMemberList');
 box.innerHTML=members.length?members.map(m=>`<div class="invite-member-row"><div><strong>${esc(m.display_name||'여행자')} ${m.user_id===trip?.owner_id?'👑 (여행 만든 사람)':''}</strong><p class="tiny">${m.user_id===user?.id?'나 · ':''}수정 권한 있음</p></div>${isTripOwner()&&m.user_id!==trip.owner_id?`<button type="button" class="btn danger small" data-remove-member="${esc(m.user_id)}">참여 제외</button>`:''}</div>`).join(''):emptyMessage('초대한 친구가 아직 없어요.');
}
async function createEmailInvite(e){e.preventDefault();if(!isTripOwner())return;
 const target=$('inviteRecipientEmail').value.trim().toLowerCase();
 const byUid=/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/.test(target);
 if(!byUid&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)){toast('로그인 이메일 또는 공유받은 계정 ID를 입력하세요.');return;}
 const btn=$('inviteCreateBtn');setBusy(btn,true);
 try{const {data:code,error}=byUid?
   await client.rpc('tripkku_create_invitation_by_uid',{p_trip_id:trip.id,p_invited_user:target}):
   await client.rpc('tripkku_create_invitation',{p_trip_id:trip.id,p_email:target});
   if(error)throw error;
  if(!/^[0-9a-f]{32}$/.test(code||''))throw new Error('서버에서 유효한 초대 코드를 받지 못했어요.');
  const link=location.origin+location.pathname+'?invite='+code;
  $('inviteCreatedLink').value=link;$('inviteCreatedBox').hidden=false;
  const copied=await copyTextSafe(link);$('inviteStatus').textContent=copied?`✅ ${target} 계정만 수락할 수 있는 초대 링크를 복사했어요 (7일 유효).`:`${target} 계정 전용 초대 링크를 만들었어요.`;
 }catch(err){$('inviteStatus').textContent='초대 링크 생성 실패: '+err.message;}
 finally{setBusy(btn,false,'🔗 전용 초대 링크 만들고 복사');}}
async function removeTripMember(target){
 if(!isTripOwner()||target===user.id)return;
 const person=members.find(x=>x.user_id===target);
 if(!person||!confirm((person.display_name||'친구')+'의 이 여행 접근·수정 권한을 없앨까요?'))return;
 const {error}=await client.rpc('tripkku_remove_member',{p_trip_id:trip.id,p_member_id:target});
 if(error)return toast('참여자 제외 실패: '+error.message);
 members=members.filter(m=>m.user_id!==target);renderInviteMembers();toast('해당 참여자의 접근·수정 권한을 해제했습니다.');
}

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
 const planned=(pendingPlan.days||[]).map(x=>{const es=Array.isArray(x.events)?x.events:[];
 const waypoints=es.filter(e=>e.place&&e.kind!=='move').map(e=>e.place);const route=routeForStops(waypoints);
 return `<article class="plan-day"><div class="plan-day-head"><strong>🗓 ${esc(fmtDate(x.date))} · ${esc(x.title)}</strong>${route?`<a target="_blank" rel="noopener noreferrer" href="${esc(route)}">🗺 Google 지도 경로 ↗</a>`:''}</div><div class="plan-day-events">${es.map(e=>`<div class="plan-stop"><span class="plan-time">${esc(e.start)}</span><span class="plan-emoji">${esc(eventEmoji(e))}</span><div><b>${esc(e.title)}</b><p>${esc(e.note||'간단한 방문 추천')}</p>${e.place?`<a target="_blank" rel="noopener noreferrer" href="${esc(mapUrl(e.place))}">📍 ${esc(e.place)} · 지도 보기 ↗</a>`:''}</div></div>`).join('')}</div></article>`;}).join('');
 box.innerHTML=`<h3>✨ AI 추천 동선 · 미리보기</h3><p class="muted">${esc(pendingPlan.summary||'일정 추천')}</p><div class="plan-day-list">${planned}</div><p class="tiny">${esc((pendingPlan.tips||[]).join(' · '))}</p><div class="draft-actions"><button class="btn primary" id="applyPlan">이 일정 적용</button><button class="btn" id="dismissPlan">나중에 적용</button></div>`;
 $('applyPlan').addEventListener('click',()=>void applyPlan());$('dismissPlan').addEventListener('click',()=>{pendingPlan=null;renderPlanPreview();});}
async function applyPlan(){if(!pendingPlan)return;
 const old=activeDoc().days||[];const oldRegular=old.some(d=>d.events?.some(e=>!e.bookingId));
 if(oldRegular&&!confirm('기존 일반 일정을 AI 추천으로 교체할까요? 항공·열차 등 예약 일정은 유지됩니다.'))return;
 const days=clone(pendingPlan.days).map(d=>{const fixed=old.find(x=>x.date===d.date)?.events?.filter(e=>e.bookingId)||[];
  const recommendations=d.events.filter(e=>!fixed.some(b=>e.start<b.end&&e.end>b.start));
  return {...d,events:[...fixed,...recommendations.map(e=>({id:uuid(),...e}))].sort((a,b)=>a.start.localeCompare(b.start))};});
 const skipped=(pendingPlan.days||[]).reduce((a,d)=>a+d.events.length,0)-days.reduce((a,d)=>a+d.events.length,0)+old.reduce((a,d)=>a+(d.events?.filter(e=>e.bookingId).length||0),0);
 await saveTrip(d=>{d.days=days;},skipped>0?`예약 시간과 겹치는 추천 ${skipped}개를 제외하고 적용했습니다.`:'AI 추천 일정을 적용했습니다.');pendingPlan=null;renderPlanPreview();}
function routeForStops(rawStops){const stops=[...new Set(rawStops.filter(Boolean).map(x=>String(x).trim()))].slice(0,5);
 if(stops.length<2)return stops.length===1?mapUrl(stops[0]):'';
 return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(stops[0])+'&destination='+encodeURIComponent(stops.at(-1))+(stops.length>2?'&waypoints='+stops.slice(1,-1).map(encodeURIComponent).join('%7C'):'');}
function routeForDay(events){return routeForStops(events.filter(e=>e.place&&e.kind!=='move').map(e=>e.place));}
function renderSchedule(){const dates=tripDates();if(!dates.includes(activeDate))activeDate=dates[0];
 $('dayTabs').innerHTML=dates.map((date,i)=>{const row=activeDoc().days.find(d=>d.date===date),flag=row?.countryCode?countryInfo(row.countryCode).flag:'';return `<button data-day="${date}" class="${date===activeDate?'active':''}">${flag} ${esc(fmtDate(date))}<br><small>${i+1}일 차</small></button>`;}).join('');
 $('dayTabs').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{activeDate=b.dataset.day;renderSchedule();renderTranslatorConfig();renderIntro();}));
 renderOitaVariants();
 const day=activeDoc().days.find(d=>d.date===activeDate),events=[...(day?.events||[])].sort((a,b)=>a.start.localeCompare(b.start));
 const route=routeForDay(events);$('dayRoute').innerHTML=route?`<a href="${esc(route)}" target="_blank" rel="noopener noreferrer" class="btn small">🗺 오늘의 추천 동선 Google 지도에서 확인 ↗</a>`:'';
 $('timeline').innerHTML=events.length?events.map(e=>`<article class="event-card"><div class="event-time">${esc(e.start)}–${esc(e.end)}</div><div><div class="event-title">${esc(eventEmoji(e))} ${esc(e.title)}</div><p class="event-note">${esc(e.place||'')} ${e.place?' · ':''}${esc(e.note||'')}</p><div class="event-tools">${e.place||e.mapUrl?`<a href="${esc(displayMapUrl(e))}" target="_blank" rel="noopener noreferrer">📍 Google 지도 열기</a>`:''}<button data-edit-event="${esc(e.id)}">수정</button><button data-delete-event="${esc(e.id)}">삭제</button></div></div></article>`).join(''):emptyMessage('아직 일정이 없어요. AI 추천을 적용하거나 + 일정 추가를 눌러 주세요.');
 $('timeline').querySelectorAll('[data-edit-event]').forEach(b=>b.addEventListener('click',()=>openEventDialog(b.dataset.editEvent)));
 $('timeline').querySelectorAll('[data-delete-event]').forEach(b=>b.addEventListener('click',()=>void deleteEvent(b.dataset.deleteEvent)));
 renderPlanPreview();}
function findEvent(id){for(const day of activeDoc().days){const event=day.events.find(e=>e.id===id);if(event)return {...event,date:day.date};}return null;}
function openEventDialog(eventId=null,placeName='',placeUrl=''){if(!trip)return;editingEventId=eventId;pendingEventMapUrl=isGoogleMapLink(placeUrl)?placeUrl:'';const existing=eventId?findEvent(eventId):null;
 $('eventDialogTitle').textContent=existing?'일정 수정':'일정 추가';$('eventDate').innerHTML=tripDates().map(date=>`<option value="${date}">${esc(fmtDate(date))}</option>`).join('');
 const f=$('eventForm');f.elements.date.value=existing?.date||activeDate;f.elements.start.value=existing?.start||'10:00';f.elements.end.value=existing?.end||'11:00';
 f.elements.title.value=existing?.title||placeName;f.elements.place.value=existing?.place||placeName;f.elements.note.value=existing?.note||'';
 $('eventDialog').showModal();}
function conflictsFor(candidate,oldId){return(activeDoc().days.find(d=>d.date===candidate.date)?.events||[]).filter(e=>e.id!==oldId&&candidate.start<e.end&&candidate.end>e.start);}
function eventFromForm(f){return {id:editingEventId||uuid(),date:f.elements.date.value,start:f.elements.start.value,end:f.elements.end.value,
 title:f.elements.title.value.trim(),place:f.elements.place.value.trim(),note:f.elements.note.value.trim(),kind:editingEventId?findEvent(editingEventId)?.kind||'visit':'visit',mapUrl:editingEventId?findEvent(editingEventId)?.mapUrl||'':pendingEventMapUrl};}
async function submitEvent(e){e.preventDefault();const entry=eventFromForm(e.currentTarget);if(bookingPendingForEvent){entry.bookingId=bookingPendingForEvent.id;entry.kind=bookingPendingForEvent.kind==='항공'?'flight':'move';entry.emoji=({항공:'✈️',열차:'🚆',버스:'🚌',렌터카:'🚗',차량:'🚗',숙소:'🏨'})[bookingPendingForEvent.kind]||'🧾';}if(!tripDates().includes(entry.date)||!timeRE.test(entry.start)||!timeRE.test(entry.end)||entry.start>=entry.end||!entry.title)return toast('날짜와 시작·종료 시간을 확인해 주세요.');
 const conflicts=conflictsFor(entry,editingEventId);$('eventDialog').close();
 if(conflicts.length){pendingConflict={candidate:entry,oldId:editingEventId,conflicts,booking:bookingPendingForEvent};$('conflictDetails').textContent=conflicts.map(x=>`${x.start}~${x.end} · ${x.title}`).join('\n');$('conflictDialog').showModal();return;}
 await saveEvent(entry,editingEventId,[],bookingPendingForEvent);}
async function saveEvent(entry,oldId,removeIds=[],bookingEntry=null){await saveTrip(doc=>{
  if(bookingEntry&&!doc.bookings.some(x=>x.id===bookingEntry.id))doc.bookings.push(bookingEntry);
  for(const day of doc.days)day.events=day.events.filter(e=>e.id!==oldId&&!removeIds.includes(e.id));
  let target=doc.days.find(d=>d.date===entry.date);if(!target){target={date:entry.date,title:'자유 일정',events:[]};doc.days.push(target);}
  const {date,...payload}=entry;target.events.push(payload);target.events.sort((a,b)=>a.start.localeCompare(b.start));
 },bookingEntry?'예약과 일정을 저장했습니다.':'일정을 저장했습니다.');bookingPendingForEvent=null;activeDate=entry.date;renderSchedule();}
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
 if(kind==='cancel'){bookingPendingForEvent=null;return;}
 if(kind==='adjust'){
  const next=suggestSlot(p.candidate,p.oldId);editingEventId=p.oldId;openEventDialog(p.oldId);
  const f=$('eventForm');f.elements.date.value=p.candidate.date;f.elements.title.value=p.candidate.title;f.elements.place.value=p.candidate.place;f.elements.note.value=p.candidate.note;bookingPendingForEvent=p.booking||null;
  f.elements.start.value=next?.start||p.candidate.start;f.elements.end.value=next?.end||p.candidate.end;
  toast(next?`비어 있는 ${next.start}부터로 조정했어요. 확인 후 저장하세요.`:'오늘은 빈 시간이 부족해요. 시간을 직접 선택해 주세요.');return;
 }
 if(kind==='replace')await saveEvent(p.candidate,p.oldId,p.conflicts.map(e=>e.id),p.booking||null);}
function renderTodos(){const d=activeDoc(),total=d.todos.length,done=d.todos.filter(t=>t.done).length;
 $('todoProgress').textContent=`${done}/${total} 완료`;$('sharedNotes').value=d.notes||'';
 $('todoList').innerHTML=total?d.todos.map(t=>`<div class="list-row"><label class="todo-line"><input type="checkbox" data-check-todo="${esc(t.id)}" ${t.done?'checked':''}><span class="${t.done?'done':''}">${esc(t.title)}</span></label><div class="list-tools"><button class="btn" data-edit-todo="${esc(t.id)}">수정</button><button class="btn" data-remove-todo="${esc(t.id)}">삭제</button></div></div>`).join(''):emptyMessage('추가한 할 일이 없습니다.');
 $('todoList').querySelectorAll('[data-check-todo]').forEach(x=>x.addEventListener('change',()=>void saveTrip(d=>{const todo=d.todos.find(t=>t.id===x.dataset.checkTodo);if(todo)todo.done=x.checked;},'완료 상태를 저장했습니다.')));
 $('todoList').querySelectorAll('[data-edit-todo]').forEach(x=>x.addEventListener('click',()=>{const t=d.todos.find(t=>t.id===x.dataset.editTodo);if(!t)return;const name=prompt('할 일 수정',t.title);if(!name?.trim())return;void saveTrip(x=>{const found=x.todos.find(a=>a.id===t.id);if(found)found.title=name.trim().slice(0,160);},'할 일을 수정했습니다.');}));
 $('todoList').querySelectorAll('[data-remove-todo]').forEach(x=>x.addEventListener('click',()=>{if(!confirm('할 일을 삭제할까요?'))return;void saveTrip(d=>{d.todos=d.todos.filter(t=>t.id!==x.dataset.removeTodo);},'할 일을 삭제했습니다.');}));
 renderFiles();renderLegacyPersonalBox();}
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
function currencyOptions(){const home=itineraryCountries().map(code=>countryInfo(code).currency);return [...new Set([...home,'KRW',...MONEY])];}

// Budget overview: cash I actually paid (shared I paid + my private items) vs equal-share final burden.
// Never add different currencies directly. Exchange rates are daily reference rates, not actual card settlement rates.
function budgetCurrencies(){const d=activeDoc();return [...new Set([...(d.expenses||[]),...(personalExpenses||[])].map(x=>x.currency).filter(Boolean))];}
function budgetNumbers(currency){const d=activeDoc(),shared=(d.expenses||[]).filter(x=>x.currency===currency),personal=(personalExpenses||[]).filter(x=>x.currency===currency);
 const count=Math.max(d.meta?.legacyOitaRoomId?2:1,members.length),paid=shared.filter(x=>legacyExpensePayer(x)===user?.id).reduce((n,x)=>n+Number(x.amount||0),0);
 const total=shared.reduce((n,x)=>n+Number(x.amount||0),0),mine=personal.reduce((n,x)=>n+Number(x.amount||0),0);
 return {cashPaid:paid+mine,finalBurden:mine+total/count,settlement:paid-total/count,paid,personal:mine,sharedTotal:total};}
function updateBudgetKrwOverview(){const box=$('budgetKrwOverview');if(!box||!trip)return;
 const currencies=budgetCurrencies(),missing=currencies.filter(c=>c!=='KRW'&&!(Number(budgetFxRates[c])>0));
 const convert=(v,c)=>c==='KRW'?v:v/Number(budgetFxRates[c]);
 const disclaimer='현재 기준 환율로 계산한 예상 원화입니다. 실제 카드 승인·결제 환율은 다를 수 있어요.';
 if(missing.length){box.innerHTML=`<div class="card budget-overview"><h3>💳 내 여행 지출 한눈에</h3><p class="muted">${esc(budgetFxFetching?'외화 환율을 확인하는 중…':budgetFxError?'환율 조회 실패: '+budgetFxError:'환율 확인이 필요해요: '+missing.join(', '))}</p><p class="tiny">원화와 외화를 임의로 더하지 않으며 아래 통화별 합계는 계속 확인할 수 있어요.</p></div>`;return;}
 const totals=currencies.reduce((out,c)=>{const x=budgetNumbers(c);out.cashPaid+=convert(x.cashPaid,c);out.finalBurden+=convert(x.finalBurden,c);out.settlement+=convert(x.settlement,c);return out;},{cashPaid:0,finalBurden:0,settlement:0});
 const settlementText=totals.settlement>0?'돌려받을 예상 금액':totals.settlement<0?'보내야 할 예상 금액':'공동 정산 차액';
 box.innerHTML=`<div class="budget-overview-head"><h3>💳 내 여행 지출 한눈에</h3><span class="tiny">${esc(budgetFxDate||'원화 기준')} · 환산</span></div><div class="summary-grid"><div class="summary-item budget-highlight"><small>내가 실제 결제한 총액</small><strong>${esc(money(Math.round(totals.cashPaid),'KRW'))}</strong></div><div class="summary-item"><small>내 최종 부담 예상액</small><strong>${esc(money(Math.round(totals.finalBurden),'KRW'))}</strong></div><div class="summary-item"><small>${esc(settlementText)}</small><strong>${esc(money(Math.round(Math.abs(totals.settlement)),'KRW'))}</strong></div></div><p class="tiny">${disclaimer}</p>`;
}
async function ensureBudgetFxRates(){if(!trip||DEMO||budgetFxFetching||Date.now()-budgetFxLast<3600000)return;
 if(budgetCurrencies().every(c=>c==='KRW')){updateBudgetKrwOverview();return;}
 budgetFxFetching=true;budgetFxLast=Date.now();updateBudgetKrwOverview();
 try{const response=await fetch('https://api.frankfurter.dev/v1/latest?base=KRW',{method:'GET',cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);
 const d=await response.json();if(!d||typeof d.rates!=='object')throw new Error('환율 응답 확인 필요');budgetFxRates={KRW:1,...d.rates};budgetFxDate=d.date||'';budgetFxError='';}
 catch(e){budgetFxError=e.message||'네트워크 오류';}finally{budgetFxFetching=false;updateBudgetKrwOverview();}
}
function renderBudget(){const d=activeDoc(),c=currentCountry(),home=c.currency,shared=d.expenses||[],personal=personalExpenses||[],count=Math.max(d.meta?.legacyOitaRoomId?2:1,members.length),uid=user?.id;
 const payerOptions=members.length?members:[{user_id:uid,display_name:'나'}];
 $('expensePayer').innerHTML=payerOptions.map(m=>`<option value="${esc(m.user_id)}">${m.user_id===uid?'나':esc(m.display_name)}</option>`).join('');
 $('expenseCurrency').innerHTML=currencyOptions().map(code=>`<option value="${code}">${code}${code===home?' · 현지 통화':''}</option>`).join('');
 $('expenseCurrency').value=home;$('expenseDate').value=activeDate||trip.start_date;
 const currencies=[...new Set([...shared,...personal].map(x=>x.currency))];for(const code of itineraryCountries()){const currency=BY_COUNTRY[code].currency;if(!currencies.includes(currency))currencies.push(currency);}if(!currencies.includes(home))currencies.unshift(home);
 $('budgetSummary').innerHTML=currencies.map(currency=>{
  const paid=shared.filter(x=>x.currency===currency&&legacyExpensePayer(x)===uid).reduce((a,x)=>a+Number(x.amount),0);
  const total=shared.filter(x=>x.currency===currency).reduce((a,x)=>a+Number(x.amount),0);
  const mine=personal.filter(x=>x.currency===currency).reduce((a,x)=>a+Number(x.amount),0);
  return `<div class="summary-item"><small>${currency} · 내가 결제한 금액 (공동+개인)</small><strong>${esc(money(paid+mine,currency))}</strong></div>
  <div class="summary-item"><small>${currency} · 내 최종 부담액 (${count}명 균등)</small><strong>${esc(money(mine+total/count,currency))}</strong></div>
  <div class="summary-item"><small>${currency} · 공동 지출 총액</small><strong>${esc(money(total,currency))}</strong></div>`;
 }).join('');
 updateBudgetKrwOverview();
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
function decodeMapName(url){try{const u=new URL(url);if(!isGoogleMapLink(url))return '';
 const parts=u.pathname.split('/').filter(Boolean);const ix=parts.indexOf('place');if(ix>=0&&parts[ix+1])return decodeURIComponent(parts[ix+1].replace(/\+/g,' ')).slice(0,160);
 const q=u.searchParams.get('query')||u.searchParams.get('q')||u.searchParams.get('destination');if(q&&q.length>=2)return q.slice(0,160);
 const path=parts.filter(p=>!['maps','search','dir','place'].includes(p)).find(p=>/[가-힣]|[A-Za-z]{3}/.test(p));return path&&!/^[a-zA-Z0-9_-]{12,}$/.test(path)?decodeURIComponent(path.replace(/\+/g,' ')).slice(0,160):'';
 }catch{return '';}}
async function getPlaceCandidate(raw,source='map',hint=''){
 const value=String(raw||'').trim();if(!/^https?:\/\//i.test(value))return {name:value.slice(0,160),mapUrl:mapUrl(value)};
 const url=safeUrl(value);if(!url)throw new Error('올바른 링크를 입력해 주세요.');
 if(source==='map'&&!isGoogleMapLink(url))throw new Error('Google 지도 링크만 장소란에 입력해 주세요.');
 const decoded=source==='map'?decodeMapName(url):'';
 if(decoded)return {name:decoded,mapUrl:url,sourceUrl:url};
 const data=await aiCall('resolve-link',{url,source,hint});
 return {name:String(data.name||'').trim().slice(0,160),mapUrl:isGoogleMapLink(data.mapUrl)?data.mapUrl:(source==='map'?url:mapUrl(data.name||hint)),sourceUrl:url,confidence:data.confidence||'unknown'};
}
function renderPlaces(){const d=activeDoc();$('placeList').innerHTML=d.savedPlaces.length?d.savedPlaces.map(p=>`<div class="list-row"><div><strong>❤️ <a target="_blank" rel="noopener noreferrer" href="${esc(displayMapUrl(p))}">${esc(p.name)}</a></strong><small>${esc(p.countryCode?compactCountry(p.countryCode):'')} · 이름을 누르면 Google 지도</small></div><div class="list-tools"><button class="btn" data-place-add="${esc(p.id)}">＋ 일정 추가</button><button class="btn" data-place-remove="${esc(p.id)}">삭제</button></div></div>`).join(''):emptyMessage('아직 찜한 장소가 없습니다.');
 $('placeList').querySelectorAll('[data-place-add]').forEach(b=>b.addEventListener('click',()=>{const p=d.savedPlaces.find(p=>p.id===b.dataset.placeAdd);if(p)openEventDialog(null,p.name,displayMapUrl(p));}));
 $('placeList').querySelectorAll('[data-place-remove]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('저장 장소를 삭제할까요?'))return;void saveTrip(d=>d.savedPlaces=d.savedPlaces.filter(p=>p.id!==b.dataset.placeRemove));}));
 $('reelList').innerHTML=d.reels.length?d.reels.map(x=>`<div class="list-row"><div><strong>📷 <a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener noreferrer">${esc(x.title)}</a></strong><small>${esc(x.placeName?'❤️ '+x.placeName+' · ':'')}${esc(x.url)}</small></div><button class="btn" data-remove-reel="${esc(x.id)}">삭제</button></div>`).join(''):emptyMessage('아직 저장한 영상 링크가 없습니다.');
 $('reelList').querySelectorAll('[data-remove-reel]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('영상 링크를 삭제할까요?'))return;void saveTrip(d=>d.reels=d.reels.filter(x=>x.id!==b.dataset.removeReel));}));}
async function addPlace(e){e.preventDefault();const f=e.currentTarget,raw=f.elements.name.value.trim();if(raw.length<2)return;const btn=f.querySelector('button[type=submit]');setBusy(btn,true);
 try{const got=await getPlaceCandidate(raw,'map');let name=got.name;
  if(!name||got.confidence==='low'||got.confidence==='unknown'&&/^https?:/i.test(raw))name=prompt('지도에서 확인한 정확한 장소 이름을 입력해 주세요.',name||'')?.trim();
  if(!name)return toast('장소를 저장하지 않았습니다.');
  if(activeDoc().savedPlaces.some(x=>x.name.toLowerCase()===name.toLowerCase())){toast('이미 저장한 장소입니다.');if($('placeOpenSchedule').checked){chooseTab('schedule');openEventDialog(null,name,got.mapUrl);}return;}
  await saveTrip(d=>d.savedPlaces.push({id:uuid(),name,mapUrl:got.mapUrl,sourceUrl:got.sourceUrl||'',countryCode:trip.country_code}),'❤️ 저장 장소에 추가했습니다.');f.reset();$('placeStatus').textContent=`저장 완료: ${name} · Google 지도로 열거나 일정을 추가할 수 있습니다.`;if($('placeOpenSchedule').checked){chooseTab('schedule');openEventDialog(null,name,got.mapUrl);}
 }catch(err){$('placeStatus').textContent='링크 자동 분석 실패: '+err.message;toast('장소 이름을 입력해 다시 시도하세요.');}finally{setBusy(btn,false,'＋ 장소 저장');}}
async function addReel(e){e.preventDefault();const f=e.currentTarget,url=safeUrl(f.elements.url.value.trim()),title=f.elements.title.value.trim(),given=f.elements.place.value.trim();
 if(!url||!['instagram.com','www.instagram.com','tiktok.com','www.tiktok.com','youtube.com','www.youtube.com','m.youtube.com','youtu.be','threads.net','www.threads.net'].includes(new URL(url).hostname))return toast('인스타그램·틱톡·유튜브 등 허용된 영상 링크를 입력하세요.');const btn=f.querySelector('button[type=submit]');setBusy(btn,true);$('reelStatus').textContent='장소 후보를 확인하고 있어요…';
 try{let placeName=given;let inferredTitle=title;let confidence='manual';
  if(!placeName){try{const found=await getPlaceCandidate(url,'reel',title);placeName=found.name;inferredTitle=inferredTitle||found.title||'';confidence=found.confidence||'unknown';}catch(err){console.warn('Reel metadata unavailable:',err.message);}}
  if(placeName&&confidence!=='high'&&confidence!=='manual')placeName=prompt('영상 속 장소가 맞는지 확인하고 이름을 수정해 주세요.',placeName)?.trim()||'';
  if(!placeName)placeName=prompt('릴스에서 장소를 자동 확인하지 못했어요. 장소 이름을 입력하면 함께 저장됩니다. (건너뛰려면 취소)')?.trim()||'';
  if(!inferredTitle)inferredTitle=placeName||'저장한 여행 영상';
  const exists=activeDoc().reels.some(x=>x.url===url);if(exists)return toast('이미 저장한 영상입니다.');
  await saveTrip(d=>{d.reels.push({id:uuid(),url,title:inferredTitle,placeName});if(placeName&&!d.savedPlaces.some(x=>x.name.toLowerCase()===placeName.toLowerCase()))d.savedPlaces.push({id:uuid(),name:placeName,mapUrl:mapUrl(placeName),sourceUrl:url,countryCode:trip.country_code});},placeName?'영상과 ❤️ 저장 장소를 추가했습니다.':'영상만 저장했습니다.');
  $('reelStatus').textContent=placeName?`❤️ ${placeName} → 저장 장소에 등록됨. 이제 일정에 추가할 수 있어요.`:'장소를 찾지 못해 영상만 저장했어요. 나중에 장소 이름을 등록해 주세요.';f.reset();if(placeName&&$('reelOpenSchedule').checked){chooseTab('schedule');openEventDialog(null,placeName,mapUrl(placeName));}
 }catch(err){$('reelStatus').textContent='등록 오류: '+err.message;}finally{setBusy(btn,false,'🔎 영상 저장 · 장소 찾기');}}
function renderBookings(){const d=activeDoc();$('bookingList').innerHTML=d.bookings.length?d.bookings.map(x=>`<div class="list-row"><div><strong>${esc(({항공:'✈️',열차:'🚆',버스:'🚌',렌터카:'🚗',차량:'🚗',숙소:'🏨'})[x.kind]||'🧾')} ${esc(x.kind)} · ${esc(x.title)}</strong><small>${esc(x.date||'')} ${esc(x.time||'')} → ${esc(x.arrivalDate||x.date||'')} ${esc(x.arrivalTime||'')} · ${esc(x.origin||'')} ${x.destination?'→ '+esc(x.destination):''}</small><small>${esc(x.note||'')}${x.fileId?' · 📎 비공개 예약서 보관됨':''}</small></div><button class="btn" data-booking-delete="${esc(x.id)}">삭제</button></div>`).join(''):emptyMessage('아직 등록한 교통·숙소 예약이 없습니다.');
 $('bookingDate').value=activeDate||trip.start_date;$('bookingArrivalDate').value=activeDate||trip.start_date;
 $('bookingList').querySelectorAll('[data-booking-delete]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('예약 정보를 삭제할까요? 해당 일정도 함께 삭제할까요?'))return;void saveTrip(d=>{d.bookings=d.bookings.filter(x=>x.id!==b.dataset.bookingDelete);for(const day of d.days)day.events=day.events.filter(x=>x.bookingId!==b.dataset.bookingDelete);},'예약과 연결된 일정을 삭제했습니다.');}));}
function selectedBookingFilename(){return selectedBookingFile?`${selectedBookingFile.name} · ${(selectedBookingFile.size/1048576).toFixed(1)}MB`:'파일 미선택 · 분석은 4MB 이하';}
function bookingFileChanged(e){selectedBookingFile=e.target.files?.[0]||null;$('bookingFileLabel').textContent=selectedBookingFilename();$('bookingAnalyzeStatus').textContent=selectedBookingFile?'AI 추출 버튼을 누르면 문서가 Gemini에 전송됩니다.':'파일을 선택해 주세요.';}
async function toBase64(file){const buf=await file.arrayBuffer();let binary='';const a=new Uint8Array(buf);for(let i=0;i<a.length;i+=32768)binary+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(binary);}
async function analyzeBooking(){if(!selectedBookingFile)return toast('예약 사진 또는 PDF를 먼저 선택해 주세요.');
 const file=selectedBookingFile,types=['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'];let mime=file.type||({'pdf':'application/pdf','jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','webp':'image/webp','heic':'image/heic','heif':'image/heif'})[file.name.split('.').at(-1).toLowerCase()];
 if(!types.includes(mime)||file.size>4*1024*1024||file.size<1)return toast('분석은 PDF/JPG/PNG/WEBP/HEIC/HEIF 4MB 이하만 지원합니다.');
 if(!confirm('예약 이미지·PDF를 Gemini AI에 전송하여 교통편 정보만 추출할까요? 예약번호 등 민감한 내용이 포함될 수 있습니다.'))return;
 const btn=$('bookingAnalyze');setBusy(btn,true);$('bookingAnalyzeStatus').textContent='🔎 예약 문서에서 출발·도착 정보를 읽는 중…';
 try{const base64=await toBase64(file);const data=await aiCall('extract-booking',{fileBase64:base64,mimeType:mime});
  const f=$('bookingForm');for(const key of ['kind','title','date','time','arrivalDate','arrivalTime','origin','destination','note'])if(data[key]&&f.elements[key])f.elements[key].value=data[key];
  $('bookingAnalyzeStatus').textContent=`추출 완료 · ${data.confidence==='low'?'정확도가 낮으니 반드시 확인하세요.':'날짜·현지 시각을 확인하고 저장하세요.'} 개인정보나 예약번호는 입력칸에 옮기지 않았습니다.`;
 }catch(err){$('bookingAnalyzeStatus').textContent='추출 실패: '+err.message+' · 직접 입력해 주세요.';}finally{setBusy(btn,false,'✨ 선택 파일 분석');}}
async function saveBookingFile(file){if(DEMO||!file||!user)return null;const ext=file.name.split('.').at(-1).toLowerCase();const mimes={'pdf':'application/pdf','jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','webp':'image/webp','heic':'image/heic','heif':'image/heif'};
 if(!mimes[ext]||file.size>15728640)return null;
 const path=`${user.id}/${trip.id}/${uuid()}.${ext}`;const {error:up}=await client.storage.from('tripkku-next-files').upload(path,file,{contentType:mimes[ext],upsert:false});if(up)throw up;
 const {data,error}=await client.from('tripkku_private_files').insert({trip_id:trip.id,user_id:user.id,path,display_name:file.name.slice(0,160),mime_type:mimes[ext],size_bytes:file.size}).select('*').single();if(error){await client.storage.from('tripkku-next-files').remove([path]);throw error;}
 privateFiles.unshift(data);renderFiles();return data.id;}
async function addBooking(e){e.preventDefault();const f=e.currentTarget,d=new FormData(f);const entry={id:uuid(),kind:String(d.get('kind')),title:String(d.get('title')||'').trim().slice(0,120),date:String(d.get('date')),time:String(d.get('time')),arrivalDate:String(d.get('arrivalDate')),arrivalTime:String(d.get('arrivalTime')),origin:String(d.get('origin')||'').trim().slice(0,160),destination:String(d.get('destination')||'').trim().slice(0,160),note:String(d.get('note')||'').slice(0,300)};
 if(!entry.title||!dateRE.test(entry.date)||!dateRE.test(entry.arrivalDate)||!timeRE.test(entry.time)||!timeRE.test(entry.arrivalTime)||entry.arrivalDate<entry.date)return toast('예약 날짜와 출발·도착 시각을 확인해 주세요.');
 if(entry.arrivalDate===entry.date&&entry.arrivalTime<=entry.time)return toast('같은 날짜라면 도착 시각은 출발보다 늦어야 합니다. 시차 또는 날짜를 다시 확인해 주세요.');
 const button=f.querySelector('button[type=submit]');setBusy(button,true);
 try{if(selectedBookingFile&&$('bookingKeepFile').checked){try{entry.fileId=await saveBookingFile(selectedBookingFile);}catch(err){toast('예약 원본 파일 업로드 실패: '+err.message+' · 예약 정보는 계속 저장합니다.');}}
 const auto=$('bookingAutoSchedule').checked,within=tripDates().includes(entry.date);
 if(!auto||!within){await saveTrip(x=>x.bookings.push(entry),within?'예약을 저장했습니다.':'여행 기간 밖 예약으로 기록만 저장했어요.');f.reset();selectedBookingFile=null;$('bookingFileLabel').textContent=selectedBookingFilename();return;}
 const isMultiDay=entry.arrivalDate!==entry.date;const end=isMultiDay?'23:59':entry.arrivalTime;
 const note=[entry.origin&&entry.destination?`${entry.origin} → ${entry.destination}`:'',isMultiDay?`도착 ${entry.arrivalDate} ${entry.arrivalTime} (현지 시간)`:'',entry.note].filter(Boolean).join(' · ');
 const candidate={id:uuid(),date:entry.date,start:entry.time,end,title:entry.title,place:entry.origin||entry.destination||'',note,kind:entry.kind==='항공'?'flight':'move',bookingId:entry.id,emoji:({항공:'✈️',열차:'🚆',버스:'🚌',렌터카:'🚗',차량:'🚗',숙소:'🏨'})[entry.kind]||'🧾'};
 const overlaps=conflictsFor(candidate,null);if(overlaps.length){pendingConflict={candidate,oldId:null,conflicts:overlaps,booking:entry};$('conflictDetails').textContent=overlaps.map(x=>`${x.start}~${x.end} · ${x.title}`).join('\n');$('conflictDialog').showModal();}
 else await saveEvent(candidate,null,[],entry);
 if(!overlaps){f.reset();selectedBookingFile=null;$('bookingFileLabel').textContent=selectedBookingFilename();}
 }catch(err){toast('예약 저장 실패: '+err.message);}finally{setBusy(button,false,'＋ 예약 및 일정 저장');}}

function localeForLanguage(code){return LANGUAGES[code]?.[1]||'en-US';}
function renderTranslatorConfig(){if(!trip)return;const c=currentCountry();const d=activeDoc(); const chosen=d.meta?.translatorOverride?d.meta.language:c.language;
 const box=$('localLanguage'),before=box.value;
 const visits=itineraryCountries().flatMap(code=>countryInfo(code).languages);
 const choices=[...new Set([...visits,...Object.keys(LANGUAGES)])];
 box.innerHTML=choices.map(l=>`<option value="${esc(l)}">${esc(languageLabel(l))}${visits.includes(l)?' · 방문 국가':''}</option>`).join('');
 box.value=LANGUAGES[chosen]?chosen:c.language;
 $('translationTitle').textContent=`🌏 한국어 ↔ ${languageLabel(box.value)} 바로 번역`;
 $('translateCountryHint').textContent=`방문 국가: ${countriesText()} · 필요하면 번역 언어를 변경하세요.`;
 $('translateExternal').href=translateExternalUrl();updateTranslationSwapLabel();$('papagoExternal').hidden=!['ja','en','zh-CN','zh-TW','vi','th'].includes(box.value);
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
function updateTranslationSwapLabel(){
 const select=$('translationDirection'),button=$('translateSwitch');if(!select||!button)return;
 const current=select.value;
 const guide=current==='to-ko'?'\u21c4 '+languageLabel($('localLanguage').value)+' \u2192 \ud55c\uad6d\uc5b4':current==='to-local'?'\u21c4 \ud55c\uad6d\uc5b4 \u2192 '+languageLabel($('localLanguage').value):'\u21c4 \ubc88\uc5ed \ubc29\ud5a5 \ubc14\uafb8\uae30';
 button.textContent=guide;button.setAttribute('aria-label','\ubc88\uc5ed \ubc29\ud5a5 \ubc14\uafb8\uae30: '+guide);
}
function swapTranslate(){
 const direction=$('translationDirection'),before=$('translateInput').value,after=$('translateOutput').value;
 if(after&&lastTranslatedLang){direction.value=lastTranslatedLang==='ko'?'to-local':'to-ko';}
 else if(direction.value==='auto'){direction.value=/[\uac00-\ud7a3]/.test(before)?'to-ko':'to-local';}
 else{direction.value=direction.value==='to-ko'?'to-local':'to-ko';}
 if(after){$('translateInput').value=after;$('translateOutput').value=before;}else{$('translateOutput').value='';}
 lastTranslatedLang='';$('translateExternal').href=translateExternalUrl();updateTranslationSwapLabel();
 setTranslateStatus('\ubc88\uc5ed \ubc29\ud5a5\uc744 \ubc14\uafb8\uc5c8\uc5b4\uc694. \ubc88\uc5ed\ud558\uae30\ub97c \ub20c\ub7ec \ub2e4\uc2dc \ud655\uc778\ud574 \uc8fc\uc138\uc694.');
}
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
function setLegacyAdminVisibility(allowed){
 $('adminLegacyPanel').hidden=!allowed;$('adminOitaImportPanel').hidden=!allowed;
 if(!allowed){legacyRooms=[];$('oitaImportList').innerHTML='';}
}

// Administrator travel oversight: never renders editing controls and never calls tripkku_save_trip.
// Data is protected by SQL RLS and the admin-only summary RPC, not by hidden DOM elements.
async function loadAdminTripIndex(){if(!isBetaAdmin||DEMO||!user)return;
 const list=$('adminTripList');if(!list)return;list.innerHTML='<p class="muted">다른 사용자의 여행을 불러오는 중…</p>';
 const {data,error}=await client.rpc('tripkku_admin_trip_index');
 if(error){adminTripIndex=[];list.innerHTML=emptyMessage('관리자 여행 목록을 읽을 수 없어요. 관리자 조회 SQL 적용 여부를 확인해 주세요. ('+esc(error.message)+')');return;}
 adminTripIndex=(data||[]).filter(x=>x.owner_id!==user.id);renderAdminTripList();}
function renderAdminTripList(){const list=$('adminTripList');if(!list)return;
 list.innerHTML=adminTripIndex.length?adminTripIndex.map(t=>`<div class="trip-card"><div><strong>🧳 ${esc(t.owner_name||'사용자')}의 여행 · ${esc(t.title)}</strong><small>${esc(t.destination)} · ${esc(t.start_date)} ~ ${esc(t.end_date)}</small></div><button class="btn small" type="button" data-admin-view-trip="${esc(t.id)}">👁 읽기 전용 보기</button></div>`).join(''):emptyMessage('현재 다른 사용자의 여행이 없습니다.');}
async function openAdminTripPreview(id){if(!user||!isBetaAdmin||DEMO)return;
 const item=adminTripIndex.find(t=>t.id===id),box=$('adminTripPreview');if(!item||!box)return;
 box.hidden=false;box.innerHTML='<p class="muted">여행 일정 불러오는 중…</p>';
 const {data,error}=await client.from('tripkku_trips').select('id,owner_id,title,destination,start_date,end_date,data').eq('id',id).maybeSingle();
 if(error||!data){box.innerHTML=emptyMessage('조회 권한이나 여행 데이터 확인이 필요합니다. '+esc(error?.message||''));return;}
 if(data.owner_id===user.id){box.innerHTML=emptyMessage('본인 여행은 내 여행 목록에서 편집할 수 있어요.');return;}
 const doc=data.data||{},days=Array.isArray(doc.days)?doc.days:[];
 const dayHtml=days.map((d,i)=>{const events=Array.isArray(d.events)?[...d.events].sort((a,b)=>String(a.start||'').localeCompare(String(b.start||''))):[];
  return `<div class="admin-day"><h4>📅 ${esc(d.date||'')} · ${i+1}일 차</h4>${events.length?events.map(e=>`<div class="admin-event"><span>${esc((e.start||'')+'~'+(e.end||''))}</span><strong>${esc(eventEmoji(e)+' '+(e.title||'일정'))}</strong><small>${esc(e.place||'')}${e.note?' · '+esc(String(e.note).slice(0,240)):''}</small></div>`).join(''):'<p class="tiny">등록된 일정 없음</p>'}</div>`;}).join('');
 const expenses=Array.isArray(doc.expenses)?doc.expenses:[];
 const totals=[...new Set(expenses.map(e=>e.currency).filter(Boolean))].map(currency=>`${currency} ${money(expenses.filter(e=>e.currency===currency).reduce((sum,e)=>sum+Number(e.amount||0),0),currency)}`).join(' · ');
 box.innerHTML=`<div class="admin-preview-header"><div><h3>👁 ${esc(item.owner_name||'사용자')}의 여행 · ${esc(data.title)}</h3><p class="muted">${esc(data.destination)} · ${esc(data.start_date)} ~ ${esc(data.end_date)}</p></div><span class="tag">읽기 전용</span></div><p class="tiny">관리자 조회 화면에서는 일정·메모·예산을 변경할 수 없습니다. 개인 예약 PDF·QR과 개인 지출은 표시하지 않습니다.</p><h4>일정</h4>${dayHtml||'<p class="tiny">일정 없음</p>'}<h4>공동 예산</h4><p>${esc(totals||'등록된 지출 없음')}</p><h4>공용 메모</h4><p class="admin-shared-note">${esc(String(doc.notes||'없음').slice(0,3000))}</p>`;
 box.scrollIntoView({behavior:'smooth',block:'start'});
}
async function refreshBetaAdminRole(){
 if(DEMO||!user){isBetaAdmin=false;$('adminFeedbackBtn').hidden=true;$('adminTripPanel').hidden=true;setLegacyAdminVisibility(false);return;}
 const {data,error}=await client.from('tripkku_beta_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 isBetaAdmin=!error&&!!data;$('adminFeedbackBtn').hidden=!isBetaAdmin;$('adminTripPanel').hidden=!isBetaAdmin;
 setLegacyAdminVisibility(isBetaAdmin);
 if(error)console.warn('TRIPKKU admin role could not be verified:',error.message);
 if(isBetaAdmin)await loadLegacyRooms();
}
function feedbackFormTrips(){const select=$('feedbackTripSelect');const selected=select.value;
 select.innerHTML='<option value="">전체 서비스</option>'+trips.map(t=>`<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('');
 select.value=(trip?.id||selected||'');if(!select.value)select.selectedIndex=0;
}
async function openFeedback(admin=false){
 if(!user)return toast('피드백은 로그인 후 사용할 수 있습니다.');
 feedbackReturnScreen=trip?'trip':'home';showScreen('feedback');feedbackFormTrips();
 $('feedbackAdminPanel').hidden=!isBetaAdmin;$('adminTripPanel').hidden=!isBetaAdmin;
 if(isBetaAdmin)await loadAdminTripIndex();
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
// Admin-only legacy navigation and COPY into a new NEXT travel plan.
// Admin flag comes solely from Supabase RLS-verified tripkku_beta_admins (not localStorage or account email).
async function loadLegacyRooms(){
 if(DEMO||!user||!isBetaAdmin)return;
 const list=$('oitaImportList');list.innerHTML='<p class="tiny">오이타 여행방을 불러오는 중…</p>';
 const {data,error}=await client.from('oita_rooms').select('id,owner_id,data,revision,updated_at').order('updated_at',{ascending:false}).limit(20);
 if(error){legacyRooms=[];list.innerHTML=emptyMessage('오이타 여행방을 조회하지 못했어요. 기존 오이타 여행에 사용하던 같은 로그인 계정인지 확인해 주세요. ('+error.message+')');return;}
 legacyRooms=data||[];
 if(!legacyRooms.length){list.innerHTML=emptyMessage('접근할 수 있는 기존 오이타 여행방이 없습니다. 이전 오이타 앱과 같은 Supabase 계정으로 로그인해 주세요.');return;}
 list.innerHTML=legacyRooms.map(r=>{
  const existing=trips.find(t=>t.data?.meta?.legacyOitaRoomId===r.id);
  const title=r.data?.title||'우리 오이타 여행';
  const last=r.updated_at?new Date(r.updated_at).toLocaleDateString('ko-KR'):'';
  return `<div class="legacy-import-row"><div><b>🌸 ${esc(title)}</b><small>오이타 · ${last} 저장 · 원본 유지</small></div>${existing?
   `<button class="btn small" type="button" data-open-oita-trip="${esc(existing.id)}">이미 가져온 여행 열기</button>`:
   `<button class="btn primary small" type="button" data-import-oita="${esc(r.id)}">이 여행을 NEXT로 복사</button>`}</div>`;
 }).join('');
}
async function oldRoomMembers(id){
 const {data,error}=await client.from('oita_room_members').select('user_id').eq('room_id',id).limit(5);
 if(error){console.warn('Legacy room member lookup limited by RLS:',error.message);return [];}
 return data||[];
}
async function importOitaRoom(sourceId){
 if(!isBetaAdmin||DEMO||!user)return toast('관리자 계정만 오이타 여행을 가져올 수 있습니다.');
 const already=trips.find(x=>x.data?.meta?.legacyOitaRoomId===sourceId);
 if(already){toast('이미 가져온 여행을 엽니다.');return openTrip(already.id);}
 if(!confirm('기존 오이타 여행방을 NEXT에 새 여행 하나로 복사할까요? 원본 일정·정산·메모는 변경되지 않습니다.'))return;
 const btn=$(`[data-import-oita="${sourceId}"]`);setBusy(btn,true);
 const privateOpt=$('oitaCopyPrivate').checked;let createdId=null;
 $('oitaImportStatus').textContent='📥 실제 오이타 데이터 읽는 중…';
 try{
  const {data:source,error}=await client.from('oita_rooms').select('id,owner_id,data,revision,updated_at').eq('id',sourceId).single();
  if(error||!source)throw new Error('기존 오이타 여행방 읽기 실패: '+(error?.message||'방을 찾지 못했습니다.'));
  const imported=convertOitaRoom(source,OITA_DEFAULTS,await oldRoomMembers(sourceId));
  const serialized=JSON.stringify(imported.doc);
  if(serialized.length>320000)throw new Error('오이타 여행 데이터 크기가 NEXT의 저장 제한을 초과합니다. 개인 자료를 분리한 후 다시 시도해 주세요.');
  $('oitaImportStatus').textContent='🧳 새 여행 생성 및 일정·2일차 4안 복사 중…';
  const large=serialized.length>75000;
  const {data:id,error:createError}=await client.rpc('tripkku_create_trip',{
   p_title:imported.title,p_country:'JP',p_destination:imported.destination,p_start:imported.startDate,p_end:imported.endDate,
   p_data:large?newDoc(imported.doc.meta):imported.doc
  });
  if(createError||!id)throw new Error('NEXT 여행 생성 실패: '+(createError?.message||'서버 응답 없음'));
  createdId=id;
  if(large){
   const {error:saveError}=await client.rpc('tripkku_save_trip',{p_id:id,p_data:imported.doc,p_revision:0});
   if(saveError)throw new Error('여행은 생성됐으나 일정 복사가 완료되지 않았습니다. '+saveError.message);
  }
  await loadTrips();await openTrip(id);
  activeDate='2026-10-31';renderSchedule();
  const {counts}=imported;
  let message=`✅ 오이타 새 여행 생성: 3일 일정 · 2일차 4안 · 할 일 ${counts.todos}개 · 공용 지출 ${counts.expenses}건 · 장소 ${counts.places}곳 · 릴스 ${counts.reels}개`;
  if(privateOpt){const result=await copyMyLegacyPersonalData(true);message+=` · 내 개인자료: ${result||'확인 필요'}`;}
  $('oitaImportStatus').textContent=message;toast('오이타 여행을 NEXT로 가져왔습니다. 기존 오이타 앱은 그대로예요.');
 }catch(e){
  console.error('Oita import failed',e);
  const note=createdId?`생성된 여행 ID: ${createdId}. 목록에 보이는 여행을 확인하세요. 다시 가져오기를 누르면 중복될 수 있습니다. `:'';
  $('oitaImportStatus').textContent='가져오기 오류: '+note+e.message;
  toast('오이타 가져오기 오류: '+e.message);
 }finally{setBusy(btn,false,'이 여행을 NEXT로 복사');}
}
function renderOitaVariants(){
 const box=$('oitaVariantBar'),meta=activeDoc().meta||{};
 if(!meta.legacyOitaRoomId||activeDate!=='2026-11-01'||!meta.legacyOitaVariants){box.hidden=true;return;}
 box.hidden=false;
 const active=meta.legacyOitaMode||'main';
 const labels={main:'1안 · 기본',backup:'2안 · 우천',third:'3안 · 온천마을',fourth:'4안 · 관광 확대'};
 box.innerHTML=`<strong>🌸 오이타 · 11월 1일 일정 선택 (원본은 그대로)</strong><div class="legacy-variant-buttons">${Object.entries(labels).map(([key,label])=>
  `<button type="button" data-oita-variant="${key}" class="${active===key?'selected':''}" aria-pressed="${active===key}">${esc(label)}</button>`).join('')}</div>`;
}
async function switchOitaVariant(next){
 const meta=activeDoc().meta||{};if(!meta.legacyOitaRoomId||!['main','backup','third','fourth'].includes(next)||next===meta.legacyOitaMode)return;
 if(!meta.legacyOitaVariants?.[next])return toast('해당 2일차 일정안이 없습니다.');
 if(!confirm('2일차 일정을 선택한 안으로 바꿀까요? 현재 안에서 NEXT로 수정한 내용도 별도로 보관됩니다.'))return;
 await saveTrip(d=>{
  const current=d.days.find(x=>x.date==='2026-11-01');
  const variants=d.meta.legacyOitaVariants;
  if(!current||!variants?.[next])throw new Error('오이타 2일차 일정이 없습니다.');
  const old=d.meta.legacyOitaMode||'main';
  if(variants[old])variants[old]={title:current.title,events:clone(current.events)};
  current.title=variants[next].title;current.events=clone(variants[next].events);
  d.meta.legacyOitaMode=next;
 },'오이타 2일차 '+({main:'1안',backup:'2안',third:'3안',fourth:'4안'})[next]+'으로 전환했습니다.');
}
function renderLegacyPersonalBox(){
 $('legacyPrivateBox').hidden=DEMO||!activeDoc().meta?.legacyOitaRoomId;
 $('legacyPrivateStatus').textContent='';
}
const OLD_PRIVATE_BUCKET='tripkku-private-files';
const NEW_PRIVATE_BUCKET='tripkku-next-files';
const OLD_FILE_TYPES={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif'};
function oldFileDisplayName(key){
 if(!/^[0-9a-f-]{36}--[A-Za-z0-9_-]+$/.test(key))return '';
 try{const raw=key.slice(38).replace(/-/g,'+').replace(/_/g,'/');const padded=raw+'='.repeat((4-raw.length%4)%4);const bytes=Uint8Array.from(atob(padded),c=>c.charCodeAt(0));return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{return '';}
}
async function stableLegacyUuid(text){
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
 hash[6]=(hash[6]&15)|64;hash[8]=(hash[8]&63)|128;
 return [...hash.subarray(0,16)].map(x=>x.toString(16).padStart(2,'0')).join('').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}
async function legacyPersonalExpensesToNext(source,newTripId){
 const meta=convertOitaRoom(source,OITA_DEFAULTS,await oldRoomMembers(source.id));
 const own=source.owner_id===user.id?'a':'b';let added=0,skipped=0;
 for(const e of meta.privateExpenses.filter(x=>x.originalPayer===own)){
  const id=await stableLegacyUuid(`${user.id}/${newTripId}/${source.id}/${e.id}`);
  const {data:exists,error:findError}=await client.from('tripkku_private_expenses').select('id').eq('id',id).maybeSingle();
  if(findError)throw findError;if(exists){skipped++;continue;}
  const {error}=await client.from('tripkku_private_expenses').insert({id,trip_id:newTripId,user_id:user.id,title:e.title,amount:e.amount,currency:e.currency,category:e.category,expense_date:e.date});
  if(error)throw error;added++;
 }
 return {added,skipped};
}
async function listOldFiles(scope){
 const out=[];
 for(let offset=0;offset<=500;offset+=100){
  const {data,error}=await client.storage.from(OLD_PRIVATE_BUCKET).list(scope,{limit:100,offset});
  if(error)throw error;
  out.push(...(data||[]).filter(x=>x.id));
  if((data||[]).length<100)return out;
 }
 throw new Error('오이타 개인 파일이 500개를 초과합니다. 관리자에게 알려 주세요.');
}
async function migratePrivateFiles(source,newTripId){
 const scope=`${user.id}/${source.id}`;
 const found=await listOldFiles(scope);let copied=0,skipped=0,failed=0;
 for(const item of found){
  const displayName=oldFileDisplayName(item.name);
  const ext=displayName.split('.').pop().toLowerCase();
  if(!displayName||!OLD_FILE_TYPES[ext]){skipped++;continue;}
  const deterministic=await stableLegacyUuid(`${user.id}/${newTripId}/${source.id}/${item.name}`);
  const target=`${user.id}/${newTripId}/oita-${deterministic}.${ext}`;
  const {data:existing,error:findError}=await client.from('tripkku_private_files').select('id').eq('path',target).maybeSingle();
  if(findError)throw findError;if(existing){skipped++;continue;}
  let uploaded=false;
  try{
   const {data:blob,error:downloadError}=await client.storage.from(OLD_PRIVATE_BUCKET).download(`${scope}/${item.name}`);
   if(downloadError||!blob)throw downloadError||Error('다운로드 실패');
   if(blob.size<1||blob.size>15728640){skipped++;continue;}
   const {error:uploadError}=await client.storage.from(NEW_PRIVATE_BUCKET).upload(target,blob,{contentType:OLD_FILE_TYPES[ext],upsert:false});
   if(uploadError)throw uploadError;uploaded=true;
   const {error:dbError}=await client.from('tripkku_private_files').insert({trip_id:newTripId,user_id:user.id,path:target,display_name:displayName.slice(0,160),mime_type:OLD_FILE_TYPES[ext],size_bytes:blob.size});
   if(dbError)throw dbError;
   copied++;
  }catch(e){console.warn('Private Oita file migration failed',displayName,e.message);failed++;if(uploaded)await client.storage.from(NEW_PRIVATE_BUCKET).remove([target]);}
 }
 return {copied,skipped,failed};
}
async function copyMyLegacyPersonalData(silent=false){
 if(DEMO||!trip||!user||!activeDoc().meta?.legacyOitaRoomId)return '';
 if(!silent&&!confirm('기존 오이타 여행에서 이 로그인 계정 소유의 개인 지출·예약 PDF·QR을 NEXT로 복사할까요? 원본 파일은 삭제하지 않습니다.'))return '';
 const btn=$('copyOldPrivate');setBusy(btn,true);
 const notice=$('legacyPrivateStatus');notice.textContent='개인자료 복사를 시작합니다…';
 try{
  const sourceId=activeDoc().meta.legacyOitaRoomId;
  const {data:source,error}=await client.from('oita_rooms').select('id,owner_id,data').eq('id',sourceId).single();
  if(error||!source)throw new Error('원본 여행방을 조회할 수 없습니다. 원본과 같은 계정으로 로그인했는지 확인하세요.');
  const exp=await legacyPersonalExpensesToNext(source,trip.id);
  let files={copied:0,skipped:0,failed:0},fileError='';
  try{files=await migratePrivateFiles(source,trip.id);}catch(e){fileError=e.message;console.warn('Old file copy failed:',e.message);}
  const {data:added}=await client.from('tripkku_private_expenses').select('*').eq('trip_id',trip.id).order('created_at',{ascending:false});
  const {data:attached}=await client.from('tripkku_private_files').select('*').eq('trip_id',trip.id).order('created_at',{ascending:false});
  personalExpenses=added||[];privateFiles=attached||[];renderFiles();renderBudget();
  const status=`개인지출 ${exp.added}건 · 개인파일 ${files.copied}개 복사 · 이미 복사/지원하지 않는 파일 ${files.skipped}개${files.failed?' · 실패 '+files.failed+'개':''}${fileError?' · 파일 복사 확인 필요: '+fileError:''}`;
  notice.textContent=status;if(!silent)toast(status);return status;
 }catch(e){notice.textContent='개인자료 복사 실패: '+e.message;console.error(e);if(!silent)toast(notice.textContent);return '';}
 finally{setBusy(btn,false,'📎 오이타 내 개인자료 가져오기');}
}
function legacyExpensePayer(entry){
 if(entry.payer!=='legacy-oita-friend')return entry.payer;
 const oldOwner=activeDoc().meta?.legacyOitaOwnerId;
 return members.find(x=>x.user_id!==oldOwner)?.user_id||entry.payer;
}

function bindHandlers(){
 $('goHome').addEventListener('click',goHome);$('backHome').addEventListener('click',goHome);
 $('themeToggle').addEventListener('click',()=>{localStorage.setItem('tripkku-next-night',document.body.classList.contains('night')?'no':'yes');applyTheme();});
 $('moodToggle').addEventListener('click',()=>{const old=localStorage.getItem('tripkku-next-mood')||'happy';const next=MOODS[(MOODS.findIndex(x=>x[0]===old)+1)%MOODS.length][0];localStorage.setItem('tripkku-next-mood',next);applyTheme();});
 $('loginBtn').addEventListener('click',()=>void login('google'));$('kakaoLoginBtn').addEventListener('click',()=>void login('kakao'));$('logoutBtn').addEventListener('click',async()=>{if(DEMO){goHome();return;}await client.auth.signOut();user=null;trip=null;isBetaAdmin=false;$('feedbackTop').hidden=true;$('adminFeedbackBtn').hidden=true;$('adminTripPanel').hidden=true;setLegacyAdminVisibility(false);showScreen('auth');});
 $('newTripForm').addEventListener('submit',e=>void createTripFromForm(e));$('refreshTrips').addEventListener('click',()=>void loadTrips());
 $('joinBtn').addEventListener('click',()=>void joinTrip($('joinCode').value));$('inviteTop').addEventListener('click',()=>void copyInvite());
 $('copyMyInviteId').addEventListener('click',async()=>{if(!user||DEMO)return toast('로그인 후 사용할 수 있어요.');await copyTextSafe(user.id);toast('내 계정 ID를 복사했어요. 이 ID만으로는 여행을 볼 수 없습니다.');});
 $('inviteDialogClose').addEventListener('click',()=>$('inviteDialog').close());$('inviteEmailForm').addEventListener('submit',e=>void createEmailInvite(e));
 $('inviteLinkCopyBtn').addEventListener('click',()=>void copyTextSafe($('inviteCreatedLink').value));
 $('inviteMemberList').addEventListener('click',e=>{const b=e.target.closest('[data-remove-member]');if(b)void removeTripMember(b.dataset.removeMember);});
 $('adminTripRefresh').addEventListener('click',()=>void loadAdminTripIndex());
 $('adminTripList').addEventListener('click',e=>{const b=e.target.closest('[data-admin-view-trip]');if(b)void openAdminTripPreview(b.dataset.adminViewTrip);});
 $('oitaImportRefresh').addEventListener('click',()=>void loadLegacyRooms());
 $('oitaImportList').addEventListener('click',e=>{const btn=e.target.closest('[data-import-oita]');if(btn)void importOitaRoom(btn.dataset.importOita);const existing=e.target.closest('[data-open-oita-trip]');if(existing)void openTrip(existing.dataset.openOitaTrip);});
 $('oitaVariantBar').addEventListener('click',e=>{const btn=e.target.closest('[data-oita-variant]');if(btn)void switchOitaVariant(btn.dataset.oitaVariant);});
 $('copyOldPrivate').addEventListener('click',()=>void copyMyLegacyPersonalData());
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
 $('bookingForm').addEventListener('submit',e=>void addBooking(e));$('bookingUpload').addEventListener('change',bookingFileChanged);$('bookingAnalyze').addEventListener('click',()=>void analyzeBooking());
 $('localLanguage').addEventListener('change',()=>{
  const lang=$('localLanguage').value;void saveTrip(d=>{d.meta.language=lang;d.meta.translatorOverride=true;},languageLabel(lang)+' 번역 언어로 변경했습니다.');
 });
 $('translationDirection').addEventListener('change',()=>{$('translateExternal').href=translateExternalUrl();updateTranslationSwapLabel();});
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
 window.addEventListener('focus',()=>{if(trip&&!DEMO)void refreshTripFromCloud();});
 setInterval(()=>{if(trip&&!DEMO&&!document.hidden)void refreshTripFromCloud();},120000);
}
void init();
