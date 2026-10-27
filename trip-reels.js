import {CONFIG} from './config.js';
const $=id=>document.getElementById(id);
let client=null,tripId=null,items=[],busy=false;
function status(msg){if($('reelStatus'))$('reelStatus').textContent=msg;}
function safeUrl(raw,kind='reel'){
 try{const u=new URL(raw);if(u.protocol!=='https:')return null;
 if(kind==='reel'&&!(/(^|\.)(instagram\.com|youtube\.com|youtu\.be|tiktok\.com)$/i.test(u.hostname)))return null;
 return u.href;}catch{return null;}
}
function mapUrl(place){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place);}
function txt(v){return String(v??'');}
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=txt(text);return n;}
function link(text,url){const a=node('a','',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function render(){
 const root=$('reelList');if(!root)return;root.replaceChildren();
 if(!tripId){root.append(node('p','tinycopy','샘플 미리보기에서는 저장할 수 없습니다. 로그인 후 여행을 선택하세요.'));return;}
 if(!items.length){root.append(node('p','tinycopy','아직 저장한 영상이나 음식 목록이 없어요. 링크를 추가해 보세요.'));return;}
 for(const item of items){
   const card=node('article','reel-card'+(item.done?' reel-done':''));const visual=node('div','reel-image');
   const thumb=safeUrl(item.thumbnail_url,'image');
   if(thumb){const img=node('img');img.src=thumb;img.alt='사용자가 추가한 썸네일';img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>visual.replaceChildren(node('span','','🎬')));visual.append(img);}else visual.textContent=item.category==='food'?'🍜':item.category==='place'?'📍':'🎬';
   const body=node('div','reel-card-body');body.append(node('strong','',item.title||'저장한 링크'));
   if(item.place_name)body.append(node('small','',item.place_name));
   if(item.category==='food'){const label=node('label','reel-check');const input=node('input');input.type='checkbox';input.checked=!!item.done;input.addEventListener('change',()=>updateDone(item.id,input.checked));label.append(input,node('span','',item.done?'먹기 완료 ✓':'꼭 먹어야 할 것'));body.append(label);}
   const actions=node('div','reel-actions');actions.append(link('🎬 영상 열기',item.url));
   if(item.place_name)actions.append(link('🗺️ 지도·길찾기',mapUrl(item.place_name)));
   const del=node('button','','🗑 삭제');del.type='button';del.addEventListener('click',()=>removeItem(item.id,item.title));actions.append(del);body.append(actions);card.append(visual,body);root.append(card);
 }
}
async function connect(){if(client)return client;if(!CONFIG.supabaseUrl||!CONFIG.supabasePublishableKey)throw Error('Supabase 설정이 필요합니다.');const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2?bundle');client=createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client;}
async function load(){if(!tripId){items=[];render();return;}const id=tripId;
 try{const sup=await connect();const {data,error}=await sup.from('trip_reels').select('id,url,title,place_name,category,thumbnail_url,done,created_at').eq('trip_id',id).order('created_at',{ascending:false});if(error)throw error;if(id!==tripId)return;items=data||[];render();}catch(e){status('목록 조회 실패: '+e.message+' (SQL 설치 여부 확인)');}}
async function updateDone(id,done){try{const sup=await connect();const {error}=await sup.from('trip_reels').update({done}).eq('id',id).eq('trip_id',tripId);if(error)throw error;await load();}catch(e){status('체크 상태 저장 실패: '+e.message);await load();}}
async function removeItem(id,title){if(!confirm('"'+title+'" 항목을 삭제할까요?'))return;try{const sup=await connect();const {error}=await sup.from('trip_reels').delete().eq('id',id).eq('trip_id',tripId);if(error)throw error;status('삭제했습니다.');await load();}catch(e){status('삭제 실패: '+e.message);}}
async function save(){if(busy)return;if(!tripId){status('로그인 후 저장할 여행을 먼저 선택하세요.');return;}const url=safeUrl($('reelUrl').value);if(!url){status('인스타그램, 유튜브 또는 틱톡 HTTPS 링크를 입력하세요.');return;}
 const title=$('reelTitle').value.trim(),place=$('reelPlace').value.trim();if(!title){status('음식이나 장소 이름을 입력하세요.');return;}
 const thumb=$('reelThumb').value.trim();if(thumb&&!safeUrl(thumb,'image')){status('썸네일은 HTTPS 이미지 URL만 사용할 수 있습니다.');return;}
 busy=true;try{const sup=await connect();const {data:{user}}=await sup.auth.getUser();if(!user)throw Error('로그인이 필요합니다.');const {error}=await sup.from('trip_reels').insert({trip_id:tripId,created_by:user.id,url,title,place_name:place,category:$('reelCategory').value,thumbnail_url:thumb||null,caption:$('reelCaption').value.slice(0,2500),done:false});if(error)throw error;for(const id of ['reelUrl','reelTitle','reelPlace','reelThumb','reelCaption'])$(id).value='';status('여행에 저장했습니다.');await load();}catch(e){status('저장 실패: '+e.message);}finally{busy=false;}}
async function analyze(){const caption=$('reelCaption').value.trim();if(!caption){status('인스타 릴스는 본문을 자동으로 가져오기 어려울 수 있어요. 영상 설명/캡션을 붙여넣어 주세요.');return;}if(busy)return;busy=true;status('Gemini가 설명에서 음식과 장소를 찾는 중입니다…');try{const sup=await connect();const {data,error}=await sup.functions.invoke('trip-reel-analyze',{body:{caption}});if(error)throw error;if(data?.error)throw Error(data.error);if(data.title)$('reelTitle').value=data.title;if(data.place)$('reelPlace').value=data.place;if(['food','place','other'].includes(data.category))$('reelCategory').value=data.category;status('추출된 이름과 장소를 확인한 뒤 [내 여행에 저장]을 누르세요.');}catch(e){status('AI 분석 실패: '+e.message+' · trip-reel-analyze 배포/Secret을 확인하세요.');}finally{busy=false;}}
$('reelSave')?.addEventListener('click',save);$('reelAnalyze')?.addEventListener('click',analyze);
document.addEventListener('tripkku-trip-changed',e=>{const next=e.detail?.tripId||null;if(next===tripId)return;tripId=next;items=[];render();void load();});
// Restore selected trip when the app finished rendering before this module loaded.
if(document.body.dataset.tripId){tripId=document.body.dataset.tripId;void load();}
