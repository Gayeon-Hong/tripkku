// Pure, privacy-aware conversion from an RLS-readable Oita room into NEXT's trip document.
// The original room is never modified. Private files are deliberately not included in shared JSON.
const DAYS=['2026-10-31','2026-11-01','2026-11-02'];
const OPTIONS=['main','backup','third','fourth'];
const TITLES={main:'1안 · 기본 일정',backup:'2안 · 우천·지연',third:'3안 · 온천마을',fourth:'4안 · 일찍 출발'};
const kind=k=>['food','hotel','visit','move','flight','other'].includes(k)?k:'visit';
const short=(v,n)=>String(v??'').slice(0,n);
const unique=(values)=>[...new Set(values)];
const num=v=>Number(v);
const normalTime=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(t||''));
const daily=(src,date,key)=>({date,title:short(src?.title||'여행 일정',120),countryCode:'JP',events:(Array.isArray(src?.events)?src.events:[]).filter(e=>normalTime(e?.start)&&normalTime(e?.end)&&e.start<e.end).map((e,i)=>({
  id:`oita-${key}-${short(e.id||i,70)}`,start:e.start,end:e.end,title:short(e.title||'일정',120),note:short(e.note,500),place:short(e.place,180),kind:kind(e.kind)
 }))});
function checkSource(source){if(!source?.id||!source?.owner_id||!source?.data||!Array.isArray(source.data.days))throw new Error('기존 오이타 여행방 형식을 확인할 수 없습니다.');}
export function convertOitaRoom(source,defaults,oldMembers=[]){
 checkSource(source);
 const d=source.data,original=defaults.primary;
 const names=['오이타 · 첫날','벳푸·유후인 · 둘째 날','유후인 · 귀국'];
 const legacyMain=d.days.find(x=>Number(x.day)===2)||original.days[1];
 const variants={};
 for(const key of OPTIONS){
  const from=key==='main'?legacyMain:key==='backup'?d.backupDay2:key==='third'?d.thirdDay2:d.fourthDay2;
  const raw=from?.events?.length?from:defaults.variants[key];
  variants[key]={title:short(raw?.title||TITLES[key],120),events:daily(raw,DAYS[1],key).events};
 }
 const selected=OPTIONS.includes(d.planMode)?d.planMode:'main';
 const getDay=(day)=>daily(d.days.find(x=>Number(x.day)===day)||original.days.find(x=>Number(x.day)===day),DAYS[day-1],`day${day}`);
 const days=[getDay(1),{date:DAYS[1],title:variants[selected].title,countryCode:'JP',events:structuredClone(variants[selected].events)},getDay(3)];
 const rawTodos=Array.isArray(d.todoItems)?d.todoItems:Array.isArray(original.todoItems)?original.todoItems:[];
 const todos=rawTodos.filter(t=>t&&typeof t.title==='string'&&t.title.trim()).map((t,i)=>({id:`oita-todo-${short(t.id||i,70)}`,title:short(t.title,160),done:Boolean(t.done??d.checklist?.[i]??false)}));
 const savedPlaces=(Array.isArray(d.savedPlaces)?d.savedPlaces:[]).filter(p=>p?.name).map((p,i)=>({id:`oita-place-${short(p.id||i,70)}`,name:short(p.name,160),area:short(p.area||'other',30),mapUrl:short(p.mapUrl||'',1200),sourceUrl:short(p.sourceUrl||'',1200),countryCode:'JP',createdBy:p.createdBy||source.owner_id}));
 const reels=(Array.isArray(d.reels)?d.reels:[]).filter(x=>x?.url).map((r,i)=>({id:`oita-reel-${short(r.id||i,70)}`,url:short(r.url,1200),title:short(r.title||'저장한 영상',160),placeName:short(r.placeName||r.place,180),note:short(r.note,500),category:short(r.category,40)}));
 const oldFriend=oldMembers.map(x=>x.user_id).find(id=>id&&id!==source.owner_id)||null;
 const expenses=[],privateExpenses=[];
 for(const [i,e] of (Array.isArray(d.expenses)?d.expenses:[]).entries()){
  if(!e?.title||!Number.isFinite(num(e.amount))||num(e.amount)<=0)continue;
  const payer=e.payer==='b'?(oldFriend||'legacy-oita-friend'):source.owner_id;
  const day=[1,2,3].includes(Number(e.day))?Number(e.day):1;
  const entry={id:`oita-exp-${short(e.id||i,70)}`,title:short(e.title,100),amount:num(e.amount),currency:['KRW','JPY','USD','EUR'].includes(e.currency)?e.currency:'KRW',category:short(e.category||'기타',40),date:DAYS[day-1],payer};
  if(e.scope==='personal')privateExpenses.push({...entry,originalPayer:e.payer});
  else expenses.push(entry);
 }
 const bookings=(Array.isArray(d.hotels)?d.hotels:[]).filter(h=>h?.name).map((h,i)=>{
  const day=[1,2,3].includes(Number(h.day))?Number(h.day):1;
  return {id:`oita-hotel-${i}`,kind:'숙소',title:short(h.name,120),date:DAYS[day-1],time:'',arrivalDate:DAYS[Math.min(day,2)],arrivalTime:'',origin:'',destination:short(h.place||h.name,160),note:short(`${h.info||''}${h.price?' · 예약 숙박비 '+Number(h.price).toLocaleString('ko-KR')+'원':''}`,300),legacyImported:true};
 });
 const meta={countryCode:'JP',countries:['JP'],destination:'오이타 · 벳푸 · 유후인',startDate:DAYS[0],endDate:DAYS[2],travelers:2,
  travelRoute:'오이타 → 벳푸 → 유후인',style:'balanced',pace:'normal',budget:'',mustVisit:unique(savedPlaces.map(x=>x.name)).slice(0,20).join(', ').slice(0,900),
  constraints:'기존 오이타 여행의 확정 예약과 17:30 셔틀 및 2일차 1~4안을 우선 유지.',language:'ja',
  legacyOitaRoomId:source.id,legacyOitaOwnerId:source.owner_id,legacyOitaMode:selected,legacyOitaVariants:variants,
  legacyOitaSettings:{walkMode:short(d.walkMode,25),nightMode:short(d.nightMode,25),luggagePlan:d.luggagePlan||null},
  legacyImportedAt:new Date().toISOString()};
 const doc={meta,days,todos,notes:short(d.notes||d.memo,9000),savedPlaces,reels,expenses,bookings};
 return {title:'오이타 2박 3일 · 가져온 여행',destination:meta.destination,startDate:DAYS[0],endDate:DAYS[2],countryCode:'JP',doc,
  privateExpenses,counts:{days:days.length,variants:4,todos:todos.length,expenses:expenses.length,personal:privateExpenses.length,places:savedPlaces.length,reels:reels.length,bookings:bookings.length}};
}
