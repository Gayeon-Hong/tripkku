import { createClient } from 'npm:@supabase/supabase-js@2';
const allowedOrigins=(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean);
function response(body:unknown,status=200,origin=''){const headers:Record<string,string>={'Content-Type':'application/json','Vary':'Origin'};if(origin&&allowedOrigins.includes(origin))headers['Access-Control-Allow-Origin']=origin;return new Response(JSON.stringify(body),{status,headers});}
Deno.serve(async request=>{
const origin=request.headers.get('origin')||'';
if(origin&&!allowedOrigins.includes(origin))return response({error:'허용되지 않은 사이트입니다.'},403);
if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});
if(request.method!=='POST')return response({error:'POST만 가능합니다.'},405,origin);
try{
const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token) return response({error:'로그인 토큰이 없습니다.'},401,origin);
const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
const client=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
const {data:{user},error:authError}=await client.auth.getUser(token);if(authError||!user)return response({error:'로그인 세션이 유효하지 않습니다.'},401,origin);
const body=await request.json();const {trip_id,city,taste}=body;const budget=Number(body.budget);
if(typeof trip_id!=='string'||!/^[-0-9a-f]{36}$/i.test(trip_id)||typeof city!=='string'||city.trim().length<2||city.length>100||!Number.isFinite(budget)||budget<10000||budget>100000000||!['balanced','food','photo','budget','relax'].includes(taste))return response({error:'입력값을 확인하세요.'},400,origin);
const {data:trip,error:tripError}=await client.from('trips').select('id,owner_id,dates').eq('id',trip_id).single();if(tripError||!trip)return response({error:'여행 접근 권한이 없습니다.'},403,origin);
if(trip.owner_id!==user.id)return response({error:'추천 생성 및 덮어쓰기는 여행 소유자만 가능합니다.'},403,origin);
const apiKey=Deno.env.get('GEMINI_API_KEY');if(!apiKey)throw Error('GEMINI_API_KEY가 없습니다.');
const prompt=`여행 계획 추천 데이터를 한국어 JSON으로 만들어라. 여행지: ${city.trim()}, 기간: ${trip.dates||'미정'}, 총예산 KRW: ${budget}, 취향: ${taste}. 예약 확정이나 실시간 검증이라고 주장하지 않는다. 확인할 수 없는 운영시간, 정확한 최신 가격, 공식 링크는 지어내지 않는다. 항공편 번호나 호텔 가용성은 꾸며내지 않는다. 현지에서 알려진 실제 관광 명소/음식점 후보 4~6개, 숙소 후보 2~3개(존재가 불확실하면 숙소 지역 유형으로), 여행 팁 3~4개, 방문 순서·하루 동선과 이동 방법을 포함한 1차 일자별 여행 일정(최대 7일, 하루 2~5개 항목), 합계 예산의 개략적인 숙박/식비/교통/체험 배분을 생성하라. budget 값의 4항목 합계를 가능한 한 총예산에 맞춰라. 형식: {"summary":"...","places":[{"name":"...","why":"...","estimated_cost_krw":0}],"hotels":[{"name":"...","why":"...","estimated_cost_krw":0}],"tips":[{"name":"...","why":"..."}],"budget":{"hotel":0,"food":0,"transport":0,"activities":0},"days":[{"day":1,"summary":"...","items":[{"time":"10:00","title":"...","note":"...","transport":"도보 / 버스 / 지하철 / 택시 등"}]}]}. 장소 운영 정보나 소요 시간을 확정값처럼 쓰지 않는다. JSON만 출력.`;
const gemini=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.35}})});
if(!gemini.ok){console.error('Gemini error status',gemini.status);return response({error:'Gemini 추천 생성 실패 ('+gemini.status+')'},502,origin);}
const raw=await gemini.json();const out=JSON.parse(raw.candidates?.[0]?.content?.parts?.[0]?.text||'{}');
function cleanItems(values:unknown,limit:number){return(Array.isArray(values)?values:[]).slice(0,limit).map((v:any)=>({name:String(v?.name||'').slice(0,120),why:String(v?.why||'').slice(0,400),estimated_cost_krw:Math.max(0,Math.min(100000000,Number(v?.estimated_cost_krw)||0))})).filter(x=>x.name);}
const guide={city:city.trim(),summary:String(out.summary||'').slice(0,1000),places:cleanItems(out.places,6),hotels:cleanItems(out.hotels,3),tips:cleanItems(out.tips,4),days:(Array.isArray(out.days)?out.days:[]).slice(0,7).map((d:any)=>({day:Math.max(1,Math.min(30,Math.round(Number(d.day)||1))),summary:String(d.summary||'').slice(0,200),items:(Array.isArray(d.items)?d.items:[]).slice(0,5).map((x:any)=>({time:String(x.time||'시간 미정').slice(0,40),title:String(x.title||'').slice(0,150),note:String(x.note||'').slice(0,300),transport:String(x.transport||'').slice(0,80)})).filter((x:any)=>x.title)})),budget:{hotel:Number(out.budget?.hotel)||0,food:Number(out.budget?.food)||0,transport:Number(out.budget?.transport)||0,activities:Number(out.budget?.activities)||0}};
const {error:saveError}=await client.from('trip_ai_guides').upsert({trip_id,guide,updated_at:new Date().toISOString()},{onConflict:'trip_id'});if(saveError)throw Error('DB 저장 실패: '+saveError.message);
return response({guide},200,origin);
}catch(e){console.error('trip-guide-ai',e);return response({error:'추천 처리 실패. Function Logs를 확인하세요.'},500,origin);}
});
