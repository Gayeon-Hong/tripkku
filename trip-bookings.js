import {Collaboration} from './collab.js';
import {CONFIG} from './config.js';
// Screenshot extraction is suggestion-only. DB writes occur only after explicit approval.
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const repo=new Collaboration(CONFIG);
let currentTripId=null, pending=null;
const status=s=>{if($('bookingStatus'))$('bookingStatus').textContent=s;};
function getTripId(){
  // Active trip is selected in the existing UI. Don't trust DOM for authorization; RLS is enforced server-side.
  const selector=document.getElementById('tripSelect');
  return selector?.value||document.querySelector('#sidebarTripList [data-trip].active')?.dataset.trip||null;
}
function formValues(){return {kind:$('bookingType').value,provider:$('bookingProvider').value.trim(),start_date:$('bookingStart').value.trim(),end_date:$('bookingEnd').value.trim(),time_info:$('bookingTime').value.trim(),route_info:$('bookingRoute').value.trim(),price_info:$('bookingPrice').value.trim(),notes:$('bookingMemo').value.trim()};}
function setForm(r){$('bookingType').value=r.kind==='hotel'?'hotel':'flight';for(const [id,key] of [['bookingProvider','provider'],['bookingStart','start_date'],['bookingEnd','end_date'],['bookingTime','time_info'],['bookingRoute','route_info'],['bookingPrice','price_info'],['bookingMemo','notes']])$(id).value=String(r[key]??'');$('bookingReview').hidden=false;}
async function refresh(){
  currentTripId=getTripId();if(!repo.user||!currentTripId){$('bookingSavedList').textContent='여행을 선택하고 로그인하면 저장된 예약 정보를 볼 수 있습니다.';return;}
  const {data,error}=await repo.client.from('trip_reservations').select('id,kind,provider,start_date,end_date,time_info,route_info,price_info,notes').eq('trip_id',currentTripId).order('created_at',{ascending:false}).limit(40);
  if(error){$('bookingSavedList').textContent='예약 정보 테이블이 아직 준비되지 않았습니다. SQL 파일을 먼저 실행하세요.';return;}
  $('bookingSavedList').innerHTML=(data||[]).map(r=>`<article class="td-card"><h4>${r.kind==='flight'?'✈️':'🛏️'} ${esc(r.provider)}</h4><p>${esc(r.start_date)} ~ ${esc(r.end_date)}<br>${esc(r.time_info)}<br>${esc(r.route_info)}<br>${esc(r.price_info)}<br>${esc(r.notes)}</p><button data-booking-delete="${esc(r.id)}" type="button">이 예약 기록 삭제</button></article>`).join('')||'이 여행에 저장된 예약 기록이 없습니다.';
}
$('bookingAnalyze')?.addEventListener('click',async()=>{
  const file=$('bookingImage').files?.[0];if(!file)return status('사진 파일을 선택해 주세요.');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024)return status('JPEG/PNG/WebP, 3MB 이하만 가능합니다.');
  if(!repo.user||!getTripId())return status('먼저 로그인하고 저장할 여행을 선택하세요.');
  $('bookingAnalyze').disabled=true;status('사진 내용을 분석하는 중입니다...');
  try{
    const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
    const {data,error}=await repo.client.functions.invoke('trip-booking-ocr',{body:{tripId:getTripId(),imageBase64:base64,mimeType:file.type}});
    if(error){let detail='';try{detail=(await error.context?.json())?.error||'';}catch{}throw Error(detail||error.message);}
    if(!data?.proposal)throw Error('분석 결과가 없습니다.');pending=data.proposal;setForm(pending);status('추출된 정보를 검토하고 잘못된 항목은 직접 수정하세요. 저장 전에는 DB가 변경되지 않습니다.');
  }catch(e){status('분석 실패: '+e.message);}finally{$('bookingAnalyze').disabled=false;}
});
$('bookingSave')?.addEventListener('click',async()=>{
  if(!pending)return;const tripId=getTripId();if(!tripId||!repo.user)return status('로그인과 여행 선택이 필요합니다.');
  const r=formValues();if(!r.provider)return status('예약명 또는 숙소명을 입력하세요.');
  $('bookingSave').disabled=true;
  try{const {error}=await repo.client.from('trip_reservations').insert({...r,trip_id:tripId,created_by:repo.user.id});if(error)throw error;pending=null;$('bookingReview').hidden=true;$('bookingImage').value='';status('예약 정보가 저장되었습니다.');await refresh();}
  catch(e){status('저장 실패: '+e.message);}finally{$('bookingSave').disabled=false;}
});
$('bookingCancel')?.addEventListener('click',()=>{pending=null;$('bookingReview').hidden=true;status('저장하지 않고 취소했습니다.');});
$('bookingSavedList')?.addEventListener('click',async e=>{
  const id=e.target.closest('[data-booking-delete]')?.dataset.bookingDelete;if(!id||!confirm('이 예약 기록을 삭제할까요?'))return;
  const {error}=await repo.client.from('trip_reservations').delete().eq('id',id).eq('trip_id',getTripId());if(error)status('삭제 실패: '+error.message);else await refresh();
});
try{await repo.init();await refresh();}catch(e){status("Supabase 연결 확인 필요: "+e.message);}
document.getElementById('tripSelect')?.addEventListener('change',()=>setTimeout(refresh,200));
document.getElementById('sidebarTripList')?.addEventListener('click',()=>setTimeout(refresh,500));
