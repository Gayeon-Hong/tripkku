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
for(const f of ['app.js','journey.js','journey3d.js','countries.js','earth-controls.js','style.css'])writeFileSync(join(here,f),fix(readFileSync(join(web,f),'utf8')));
let html=fix(readFileSync(join(web,'index.html'),'utf8')).replace('../travel-status.js','./travel-status.js')
 .replace(/<link rel="modulepreload"[^>]*>/,'').replace(/<link rel="preconnect" href="https:\/\/(?:cdn\.jsdelivr\.net|[a-z]+\.supabase\.co)"[^>]*>/g,'')
 // 토스 안에서는 토스 로그인만 허용된다. 서버 연동 전까지는 로그인 없이 이 기기에만 저장하는 모드로 연다.
 .replace('<script defer src="./travel-status.js','<script>window.TRIPKKU_LOCAL_ONLY=true;window.TRIPKKU_PLATFORM="toss";</script><script defer src="./travel-status.js');
writeFileSync(join(here,'index.html'),html);
mkdirSync(join(pub,'assets'),{recursive:true});
cpSync(join(root,'assets'),join(pub,'assets'),{recursive:true});
if(existsSync(join(web,'assets')))cpSync(join(web,'assets'),join(pub,'assets'),{recursive:true});
writeFileSync(join(pub,'travel-status.js'),readFileSync(join(root,'travel-status.js'),'utf8'));
writeFileSync(join(pub,'manifest.webmanifest'),fix(readFileSync(join(web,'manifest.webmanifest'),'utf8')));
writeFileSync(join(pub,'sw.js'),fix(readFileSync(join(web,'sw.js'),'utf8')));
console.log('토스 미니앱 폴더를 웹앱과 맞췄어요:',readdirSync(here).filter(f=>/\.(js|css|html)$/.test(f)).join(', '));
