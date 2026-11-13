// 웹앱(next/)을 토스 미니앱 폴더로 그대로 옮긴다. `npm run build` 앞에 자동으로 실행된다.
// 웹앱을 고친 뒤에는 이 스크립트(또는 빌드)만 다시 돌리면 토스판도 같은 화면이 된다. 이 폴더의 index.html·*.js·style.css 는 직접 고치지 말 것.
import {readFileSync,writeFileSync,mkdirSync,cpSync,rmSync,existsSync,readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=join(here,'..'),web=join(root,'next'),pub=join(here,'public');
const fix=s=>s.replaceAll('../assets/','./assets/').replace(/(\.(?:js|css))\?v=[A-Za-z0-9_]+/g,'$1')
 .replaceAll('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm','@supabase/supabase-js')
 .replaceAll('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js','three')
 .replaceAll('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/+esm','mp4-muxer');
// 예전 로컬 데모 파일 정리
for(const f of ['ai.js','collab.js','destination-map.js','earth-avatar.js','i18n.js','presets.js','world-coasts.js','config.js'])rmSync(join(here,f),{force:true});
// 앱인토스 검수: 미니앱 번들에는 토스페이·인앱 결제 외의 결제 SDK(js.tosspayments.com 등)가 들어 있으면 안 된다.
// app.js 의 PAY-START ~ PAY-END 구간(토스페이먼츠 결제창)을 빈 함수로 바꾼다.
const noPay=src=>{const a=src.indexOf('/*PAY-START'),b=src.indexOf('/*PAY-END*/');if(a<0||b<a)throw new Error('app.js 에 PAY-START/PAY-END 표시가 없어 결제 코드를 뺄 수 없어요.');
 return src.slice(0,a)+'// (토스 미니앱: 외부 결제 기능 없음)\ncoupon.canBuy=()=>false;coupon.buy=async()=>{};async function handlePayReturn(){}\n'+src.slice(b+'/*PAY-END*/'.length);};
for(const f of ['app.js','journey.js','journey3d.js','vtile.js','countries.js','earth-controls.js','style.css'])writeFileSync(join(here,f),fix(f==='app.js'?noPay(readFileSync(join(web,f),'utf8')):readFileSync(join(web,f),'utf8')));
let html=fix(readFileSync(join(web,'index.html'),'utf8')).replace('../travel-status.js','./travel-status.js')
 .replace(/<link rel="modulepreload"[^>]*>/,'').replace(/<link rel="preconnect" href="https:\/\/(?:cdn\.jsdelivr\.net|[a-z]+\.supabase\.co)"[^>]*>/g,'')
 // 토스 안에서는 토스 로그인만 허용된다. 서버 연동 전까지는 로그인 없이 이 기기에만 저장하는 모드로 연다.
 .replace('<script defer src="./travel-status.js','<script>window.TRIPKKU_LOCAL_ONLY=true;window.TRIPKKU_PLATFORM="toss";document.documentElement.classList.add("toss");</script><script defer src="./travel-status.js')
 // 토스 전용 보상형 광고(toss-ads.js, 이 폴더에만 있음). 앱 코드보다 먼저 불러 window.TRIPKKU_ADS 를 만든다.
 .replace('<script type="module" src="./app.js">','<script type="module" src="./toss-ads.js"></script><script type="module" src="./app.js">');
writeFileSync(join(here,'index.html'),html);
mkdirSync(join(pub,'assets'),{recursive:true});
cpSync(join(root,'assets'),join(pub,'assets'),{recursive:true});
if(existsSync(join(web,'assets')))cpSync(join(web,'assets'),join(pub,'assets'),{recursive:true});
writeFileSync(join(pub,'travel-status.js'),readFileSync(join(root,'travel-status.js'),'utf8'));
writeFileSync(join(pub,'manifest.webmanifest'),fix(readFileSync(join(web,'manifest.webmanifest'),'utf8')));
writeFileSync(join(pub,'sw.js'),fix(readFileSync(join(web,'sw.js'),'utf8')));
for(const f of readdirSync(here).filter(f=>/\.(js|html|css)$/.test(f)&&f!=='sync-from-web.mjs')){if(/tosspayments\.com/.test(readFileSync(join(here,f),'utf8')))throw new Error(f+' 에 외부 결제 SDK 주소가 남아 있어요(앱인토스 검수 반려 사유).');}
console.log('토스 미니앱 폴더를 웹앱과 맞췄어요:',readdirSync(here).filter(f=>/\.(js|css|html)$/.test(f)).join(', '));
