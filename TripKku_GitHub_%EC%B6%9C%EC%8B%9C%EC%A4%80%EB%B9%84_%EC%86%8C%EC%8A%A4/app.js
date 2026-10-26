import {CONFIG} from './config.js';
import {PRESETS,clonePreset,money,safeNum,googleDirections} from './presets.js';
import {Collaboration} from './collab.js';

const $=selector=>document.querySelector(selector);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE='tripkku-demo-v1:';
const PREF='tripkku-preset';
const THEME='tripkku-theme';
const isToss=CONFIG.platform==='toss';
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
  return {over,html:over>0?`🚨 목표 초과 <strong>+${money(over)}</strong>`:`✓ 목표 금액 이내 · ${money(target-spent)} 남았어`};
}
function totalShared(){const {trip,expenses}=data;const ns=trip.active_plan==='A'?trip.nights_a:trip.nights_b;
  return safeNum(ns[0])+safeNum(ns[1])+expenses.reduce((sum,x)=>sum+safeNum(x.amount),0);
}
function currentPlanNights(){return data.trip.active_plan==='A'?data.trip.nights_a:data.trip.nights_b;}
function peopleCount(){return Math.max(1,data.members.length);}
function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),3000);}
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
function renderPresetPicker(){
  $('#presetGrid').innerHTML=Object.values(PRESETS).map(p=>`<button class="preset ${data.trip.preset===p.key?'selected':''}" data-preset="${esc(p.key)}">
    <span class="emoji">${p.flag}</span><strong>${esc(p.title)}</strong><small>${esc(p.description)}</small></button>`).join('');
  const sel=$('#tripSelectArea');sel.hidden=!repo.user||!tripList.length;
  if(!sel.hidden){$('#tripSelect').innerHTML=tripList.map(t=>`<option value="${esc(t.id)}" ${mode==='remote'&&data.trip.id===t.id?'selected':''}>${esc(t.title)}</option>`).join('');}
  [...document.querySelectorAll('button[data-theme]')].forEach(b=>b.classList.toggle('selected',b.dataset.theme===document.body.dataset.theme));
}
function renderPlans(){
  $('#tripTitle').textContent=data.trip.title;
  $('#tripSubtitle').textContent=data.trip.description||data.trip.city;
  $('#tripDates').textContent=data.trip.dates;
  const isOita=data.trip.preset==='oita';
  $('#flightNote').hidden=!isOita;
  $('#planALabel').textContent=isOita?'🛏️ 벳푸 일반 호텔 2박':'🛏️ 가성비 일반 호텔 연박';
  $('#planADesc').textContent=isOita?'한 호텔에서 연박 · 짐 이동 0회':'숙소 이동 최소화 · 관광/식비 우선';
  $('#planBLabel').textContent=isOita?'✨ 일반 호텔 1박 + 료칸 1박':'✨ 일반 호텔 + 특별 숙박';
  $('#planBDesc').textContent=isOita?'벳푸 안에서 1회 이동 · 료칸 객실 40만원 미만 목표':'둘째 날 다른 숙소에서 특별한 하루';
  for(const p of ['A','B'])$('#plan'+p).classList.toggle('active',data.trip.active_plan===p);
  const days=[1,2,3];const entries=data.items.filter(x=>x.plan_key===data.trip.active_plan);
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
    repo.configured?'로그인하면 친구 초대와 공동 편집을 사용할 수 있어요.':'Supabase 미연결: SNS 로그인·초대·공동 편집은 사용 전 설정이 필요합니다.';
  document.querySelectorAll('[data-login]').forEach(b=>{b.hidden=Boolean(repo.user)||isToss;b.disabled=!repo.configured;});
  $('#logout').hidden=!repo.user;
  $('#authHelp').textContent=isToss?'토스 미니앱은 토스 로그인만 허용됩니다. 서버 검증 연동 전이라 로그인이 비활성화되었습니다.':
    repo.configured?'로그인이 안 되면 Supabase Authentication > URL Configuration / Providers를 확인하세요.':'실제 로그인 사용: README대로 Supabase 프로젝트 생성 → schema.sql 실행 → OAuth 설정 → config.js 입력';
  $('#inviteButton').disabled=!(connected&&mode==='remote');
  $('#inviteButton').textContent=connected&&mode==='remote'?'🔗 7일 유효 초대 링크 만들기':'🔒 연결 후 초대 링크 사용 가능';
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
  renderPresetPicker();renderPlans();renderBudget();renderPlaces();renderAccount();renderPhrases();
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
}

function pendingInvite(){const url=new URL(location.href),token=url.searchParams.get('invite');if(token){
  sessionStorage.setItem('tripkku-invite',token);url.searchParams.delete('invite');history.replaceState({},'',url.toString());
}}
async function initAccount(){
  if(!repo.client)return;
  tripList=repo.user?await repo.trips():[];
  if(!repo.user){loadDemo(activePreset);return;}
  const token=sessionStorage.getItem('tripkku-invite');
  if(token){try{const id=await repo.join(token);sessionStorage.removeItem('tripkku-invite');
      await selectRemote(id);toast('친구 여행에 합류했어! 🎉');return;}catch(e){fail(Error('초대 링크 사용 실패: '+e.message));}}
  if(tripList.length){await selectRemote(tripList[0].id);}else{loadDemo(activePreset);toast('로그인 성공! 샘플을 보고 "새 여행 만들기"를 눌러줘.');}
}
async function selectRemote(id){
  const remote=await repo.readTrip(id);mode='remote';data=remote;
  activePreset=data.trip.preset||'oita';repo.subscribe(id);
  tripList=await repo.trips();render();
}
async function createTrip(){
  let key=data.trip.preset;
  if(!repo.user){toast('로컬 샘플은 자유롭게 수정할 수 있어. 공동 여행 생성은 로그인 후 가능해.');return;}
  const name=prompt('새 여행 이름',PRESETS[key]?.title||'우리 여행');if(name===null)return;
  const p=clonePreset(key);p.title=name.trim()||p.title;
  const id=await repo.createTrip(p);await selectRemote(id);toast('공동 여행방을 만들었어! 👭');
}
async function createInvite(){
  if(!(repo.user&&mode==='remote')){toast('먼저 SNS 로그인과 Supabase 연결이 필요해!');return;}
  const token=await repo.invite(data.trip.id);
  const url=new URL(location.href);url.searchParams.set('invite',token);
  $('#inviteURL').value=url.toString();$('#inviteLinkBox').hidden=false;
  toast('7일 유효한 초대장 준비 완료!');
}
function appendChat(who,text){const div=document.createElement('div');div.className='bubble '+who;div.textContent=text;$('#chatMessages').append(div);$('#chatMessages').scrollTop=$('#chatMessages').scrollHeight;}
async function processCommand(input){
  const tx=input.trim();const p=tx.toUpperCase();
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
function speak(index){const lang=data.trip.language||'ja-JP';const p=(lang.startsWith('ja')?phrases['ja-JP']:phrases.en)[index];if(!p)return;
  if(!('speechSynthesis' in window)){toast('이 브라우저는 음성을 지원하지 않아.');return;}
  speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(p[1]);utterance.lang=lang;utterance.rate=.85;speechSynthesis.speak(utterance);
}
async function clickHandler(ev){
  const b=ev.target.closest('button');if(!b)return;
  try{
    if(b.dataset.go){document.getElementById(b.dataset.go)?.scrollIntoView({behavior:'smooth'});return;}
    if(b.dataset.theme){document.body.dataset.theme=b.dataset.theme;localStorage.setItem(THEME,b.dataset.theme);renderPresetPicker();toast('테마를 바꿨어 🎨');return;}
    if(b.dataset.preset){
      if(mode==='remote'&&repo.user){const ok=confirm('이 샘플로 별도 공동 여행을 새로 만들까요? (기존 여행 유지)');if(!ok)return;
        const id=await repo.createTrip(clonePreset(b.dataset.preset));await selectRemote(id);toast('새 공동 여행을 만들었어!');}
      else loadDemo(b.dataset.preset);return;
    }
    if(b.dataset.plan){await persistTrip({active_plan:b.dataset.plan});toast(b.dataset.plan+'안 적용 완료');return;}
    if(b.id==='makeTrip'){await createTrip();return;}
    if(b.id==='editTripInfo'){
      const title=prompt('여행 이름',data.trip.title);if(title===null)return;
      const dates=prompt('여행 날짜 (예: 2026.10.31 ~ 11.02)',data.trip.dates);if(dates===null)return;
      await persistTrip({title:title.trim()||data.trip.title,dates:dates.trim()||data.trip.dates});toast('여행 정보 수정했어!');return;
    }
    if(b.dataset.login){await repo.signIn(b.dataset.login);return;}
    if(b.id==='logout'){await repo.signOut();await initAccount();toast('로그아웃했어.');return;}
    if(b.id==='inviteButton'){await createInvite();return;}
    if(b.id==='copyInvite'){await navigator.clipboard.writeText($('#inviteURL').value);toast('초대 링크 복사 완료!');return;}
    if(b.id==='addExpense'){
      const title=prompt('함께 쓰는 경비 이름 (예: 이자카야)', '카페/간식');if(!title?.trim())return;
      const amt=prompt('2명 합산 비용 (원)', '30000');if(amt===null)return;
      await addExpense({category:'기타',title:title.trim(),amount:safeNum(amt)});toast('공동 경비 추가 완료');return;
    }
    if(b.dataset.removeExpense){if(confirm('공동 경비를 삭제할까?'))await removeExpense(b.dataset.removeExpense);return;}
    if(b.id==='addEvent'){
      const day=Number(prompt('몇 일차? (1~3)', '2'));if(!Number.isInteger(day)||day<1||day>3)return;
      const title=prompt('일정 제목','☕ 카페 방문');if(!title?.trim())return;
      const time=prompt('시간','15:00');if(time===null)return;
      await addEvent({plan_key:data.trip.active_plan,day_number:day,time_label:time.trim(),title:title.trim(),note:'직접 추가한 일정'});toast('공동 일정 추가 완료');return;
    }
    if(b.dataset.editEvent){const event=data.items.find(i=>i.id===b.dataset.editEvent);if(!event)return;
      const title=prompt('일정 제목',event.title);if(title===null)return;
      const time=prompt('시간',event.time_label);if(time===null)return;
      const note=prompt('메모',event.note);if(note===null)return;
      await editEvent(event.id,{title,time_label:time,note});toast('일정 수정 완료');return;
    }
    if(b.dataset.removeEvent){if(confirm('이 일정을 삭제할까?'))await removeEvent(b.dataset.removeEvent);return;}
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
  pendingInvite();document.body.dataset.theme=localStorage.getItem(THEME)||'forest';loadDemo(activePreset);
  document.addEventListener('click',clickHandler);
  document.addEventListener('change',inputChanged);
  document.addEventListener('input',e=>{
    if(['sharedTarget','night1','night2','personalTarget','airfare','personalExtra'].includes(e.target.id))previewBudgetWhileTyping();
  });
  $('#chatForm').addEventListener('submit',async e=>{
    e.preventDefault();const val=$('#chatInput').value.trim();if(!val)return;$('#chatInput').value='';appendChat('me',val);
    try{appendChat('ai',await processCommand(val));}catch(err){appendChat('ai','반영하지 못했어: '+(err.message||err));}
  });
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
  if(isToss){toast('앱인토스 모드는 정식 토스 로그인 서버 연동 전이라 데모만 제공해.');return;}
  if(repo.configured){
    try{await repo.init();await initAccount();}catch(e){fail(Error('온라인 연결 실패: '+e.message));}
  }
}
boot();
