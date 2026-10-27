// Real AI bridge. Gemini key lives ONLY in Supabase Edge Function Secrets.
export async function suggestWithAi(repo, tripId, message, history=[]){
  if(!repo.user||!repo.client)throw Error('AI를 사용하려면 먼저 SNS 로그인해야 해.');
  const {data,error}=await repo.client.functions.invoke('trip-ai',{body:{tripId,message,history}});
  if(error){
    let detail='';try{const content=await error.context?.json();detail=content?.error||'';}catch{}
    throw Error(detail||'AI 서버 연결에 실패했어. Edge Function 및 Gemini API 키를 설정했는지 확인해줘.');
  }
  if(!data||!Array.isArray(data.actions))throw Error('AI 응답 형식에 문제가 있어.');
  return {reply:String(data.reply||'수정 제안을 만들었어.').slice(0,1000),actions:data.actions.slice(0,5),schedule_snapshot:data.schedule_snapshot||''};
}
export const describeAction=(a)=>{
  const won=x=>Number(x||0).toLocaleString('ko-KR')+'원';
  switch(a.type){
    case 'set_plan':return `${a.plan_key}안으로 전환`;
    case 'set_shared_target':return `공동 목표 ${won(a.amount)}`;
    case 'set_personal_target':return `내 목표 ${won(a.amount)}`;
    case 'set_airfare':return `내 항공권 ${won(a.amount)}`;
    case 'set_personal_extra':return `내 개인 경비 ${won(a.amount)}`;
    case 'set_night':return `${a.plan_key}안 ${a.night_index+1}박차 숙소비 ${won(a.amount)}`;
    case 'add_event':return `${a.plan_key}안 ${a.day_number}일차 ${a.time_label} '${a.title}' 추가${a.note?'\n    '+String(a.note).slice(0,210):''}`;
    case 'update_event':return `일정 '${a.title||String(a.id).slice(0,8)}' 수정${a.day_number?' · '+a.day_number+'일차':''}${a.time_label?' · '+a.time_label:''}${a.note?'\n    '+String(a.note).slice(0,160):''}`;
    case 'delete_event':return `일정 삭제 (${String(a.id).slice(0,8)}…)`;
    case 'add_expense':return `공동 경비 '${a.title}' ${won(a.amount)} 추가`;
    case 'delete_expense':return `공동 경비 삭제 (${String(a.id).slice(0,8)}…)`;
    default:return '알 수 없는 제안';
  }
};
