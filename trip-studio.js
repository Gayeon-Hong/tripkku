const el=id=>document.getElementById(id);
const status=t=>{if(el('startGenerationStatus'))el('startGenerationStatus').textContent=t;};
const won=n=>Number(n||0).toLocaleString('ko-KR')+'원';
function budgetPreview(){
  const people=Number(el('startPeople')?.value||0);
  const budget=Number(el('startBudget')?.value||0);
  const preview=el('startBudgetPerPerson');if(!preview)return;
  preview.textContent=Number.isInteger(people)&&people>0&&budget>=10000
    ?`일행 전체 ${won(budget)} · 1인당 약 ${won(Math.round(budget/people))}`
    :'전체 여행 예산을 입력하면 1인당 예상 예산도 보여드려요.';
}
['startBudget','startPeople'].forEach(id=>el(id)?.addEventListener('input',budgetPreview));
budgetPreview();
window.addEventListener('tripkku-start-create',async e=>{
  const createTrip=e.detail?.createTrip;
  const country=el('startCountry')?.value.trim(),city=el('startCity')?.value.trim();
  const start=el('startDate')?.value,end=el('endDate')?.value;
  const people=Number(el('startPeople')?.value),budget=Number(el('startBudget')?.value);
  if(!country||!city||!start||!end||end<start||!Number.isInteger(people)||people<1||people>30||!Number.isFinite(budget)||budget<10000||budget>100000000){
    status('나라·도시·날짜·인원(1~30명)·전체 예산을 확인해 주세요.');
    document.body.dataset.view='home';return;
  }
  const btn=el('startGenerateTrip');if(btn?.disabled)return;
  btn.disabled=true;
  try{
    status('새 여행을 저장하고 Gemini 여행 초안을 요청합니다…');
    const id=await createTrip({blank:true,name:country+' '+city+' 여행',city:country+' '+city,dates:start+' ~ '+end,budget});
    if(!id){status('로그인 후 새 여행을 만들 수 있습니다.');return;}
    // The recommendation module owns the tripId state; explicitly pass the new ID.
    document.dispatchEvent(new CustomEvent('tripkku-initial-guide-request',{detail:{tripId:id,city:country+' '+city,budget,taste:el('startTaste')?.value||'balanced',people,startDate:start,endDate:end}}));
    status('여행이 생성되었습니다. Gemini 추천을 만드는 중입니다. 여행 상세의 AI 추천 영역에서 결과를 확인하세요.');
  }catch(err){status('여행 생성 실패: '+(err?.message||err));}
  finally{btn.disabled=false;}
});
document.addEventListener('tripkku-initial-guide-result',e=>{
  status(e.detail?.ok
    ?'Gemini 초안이 생성되었습니다. 여행 상세의 추천을 확인하고 저장할 일정을 선택하세요.'
    :'여행은 저장됐지만 AI 초안은 생성되지 않았습니다. 여행 상세에서 다시 추천을 눌러주세요.');
});
for(const [id,target] of [['tripCoverUpload','tripCoverPreview'],['tripPersonA','couplePreview'],['tripPersonB','couplePreview']]){el(id)?.addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>5*1024*1024){alert('JPG, PNG, WEBP 5MB 이하만 선택하세요.');e.target.value='';return;}const reader=new FileReader();reader.onload=()=>{const wrap=el(target);if(id==='tripCoverUpload'){wrap.style.backgroundImage='url('+JSON.stringify(reader.result)+')';wrap.textContent='';}else{let img=wrap.querySelector('[data-preview="'+id+'"]');if(!img){img=document.createElement('img');img.dataset.preview=id;img.alt='선택한 인물 사진 미리보기';wrap.append(img);}img.src=reader.result;}};reader.readAsDataURL(file);});}
