// 토스 미니앱 전용: 앱인토스 보상형 광고. 웹앱(next/)에는 없는 파일이라 sync-from-web.mjs 가 덮어쓰지 않는다.
// 영상을 파일로 저장하기 전에 광고를 한 번 보여 주고, 끝까지 봤을 때(userEarnedReward)만 저장을 진행한다.
// 광고를 쓸 수 없는 환경(샌드박스, 오래된 토스 앱, 광고 없음)에서는 막지 않고 그대로 저장하게 둔다.
import {loadFullScreenAd,showFullScreenAd,graniteEvent,closeView} from '@apps-in-toss/web-framework';

// 광고 그룹 ID. 지금은 앱인토스가 제공하는 "테스트용 보상형" ID 다(수익 없음).
// 출시 전에 앱인토스 콘솔 > 인앱 광고에서 발급받은 보상형 광고 그룹 ID 로 바꿀 것. 개발·QR 테스트 중에는 반드시 테스트 ID 를 쓴다(실제 ID 로 테스트하면 정책 위반).
const AD_GROUP_ID='ait-ad-test-rewarded-id';

let loaded=false,loading=false,waiters=[];
const supported=()=>{try{return !!AD_GROUP_ID&&loadFullScreenAd.isSupported()&&showFullScreenAd.isSupported();}catch{return false;}};
const settle=ok=>{loading=false;loaded=ok;const w=waiters;waiters=[];w.forEach(f=>f(ok));};
function load(){if(loaded||loading||!supported())return;loading=true;let off=null,done=false;
 const end=ok=>{if(done)return;done=true;try{off?.();}catch{}settle(ok);};
 try{off=loadFullScreenAd({options:{adGroupId:AD_GROUP_ID},onEvent:e=>{if(e?.type==='loaded')end(true);},onError:()=>end(false)});}catch{end(false);}
 setTimeout(()=>end(false),15000);}
const whenLoaded=ms=>loaded?Promise.resolve(true):new Promise(ok=>{let fin=false;const f=v=>{if(fin)return;fin=true;ok(v);};waiters.push(f);load();setTimeout(()=>f(false),ms);});

// 결과: 'rewarded'(끝까지 봄) | 'skipped'(중간에 닫음) | 'unavailable'(광고 없음·미지원) | 'error'
async function reward(){if(!supported())return 'unavailable';
 if(!await whenLoaded(7000))return 'unavailable';
 return new Promise(ok=>{let earned=false,done=false,off=null;
  const end=r=>{if(done)return;done=true;try{off?.();}catch{}loaded=false;setTimeout(load,500);ok(r);};
  try{off=showFullScreenAd({options:{adGroupId:AD_GROUP_ID},onEvent:e=>{const t=e?.type;
    if(t==='userEarnedReward'){earned=true;setTimeout(()=>end('rewarded'),30000);} // 일부 안드로이드 버전은 dismissed 가 안 온다
    else if(t==='dismissed')end(earned?'rewarded':'skipped');
    else if(t==='failedToShow')end('unavailable');},onError:()=>end(earned?'rewarded':'error')});}catch{end('error');}
  setTimeout(()=>end(earned?'rewarded':'error'),180000);});}

window.TRIPKKU_ADS={ready:()=>{const ok=supported();if(ok)load();return ok;},reward};
if(supported())load();

// 토스 상단바의 뒤로가기(안드로이드 뒤로가기 포함): 앱 안에서 한 단계 돌아가고, 더 돌아갈 곳이 없으면(홈) 미니앱을 닫는다.
// 앱 자체 상단바와 뒤로가기 버튼은 토스판에서 숨긴다(style.css 의 html.toss) — 검수에서 중복 버튼으로 반려됐다.
try{graniteEvent.addEventListener('backEvent',{onEvent:()=>{let done=false;try{done=!!window.__tripkkuBack?.();}catch{}if(!done)closeView().catch(()=>{});},onError:()=>{}});}catch{}
