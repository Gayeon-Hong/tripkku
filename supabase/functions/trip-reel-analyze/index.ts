Deno.serve(async (req) => {
  const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
  if(req.method === "OPTIONS")return new Response(null,{headers:cors});
  if(req.method !== "POST")return Response.json({error:"Method not allowed"},{status:405,headers:cors});
  try {
    const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth=req.headers.get("Authorization") || "";
    if(!auth.startsWith("Bearer "))return Response.json({error:"Login required"},{status:401,headers:cors});
    const check=await fetch(url+"/auth/v1/user",{headers:{Authorization:auth,apikey:anon}});
    if(!check.ok)return Response.json({error:"Invalid session"},{status:401,headers:cors});
    const {caption}=await req.json();
    if(typeof caption!=="string"||!caption.trim()||caption.length>2500)return Response.json({error:"Invalid caption"},{status:400,headers:cors});
    const key=Deno.env.get("GEMINI_API_KEY");if(!key)throw new Error("GEMINI_API_KEY missing");
    const prompt=`아래 SNS 영상 설명에서 여행 관련 음식 또는 장소를 추출한다. 설명에 없는 상호/위치를 추측하지 마라. JSON만 반환: {"title":"음식이나 방문할 장소 이름","place":"지도 검색용 실제 언급된 장소 (없으면 빈 문자열)","category":"food 또는 place 또는 other"}. 설명: ${caption}`;
    const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json"}})});
    if(!r.ok)throw Error("Gemini API status "+r.status);
    const x=await r.json(),raw=x.candidates?.[0]?.content?.parts?.[0]?.text||"{}",obj=JSON.parse(raw);
    return Response.json({title:String(obj.title||"").slice(0,150),place:String(obj.place||"").slice(0,150),category:["food","place","other"].includes(obj.category)?obj.category:"other"},{headers:cors});
  }catch(e){console.error(e);return Response.json({error:"AI 분석 처리 실패"},{status:500,headers:cors});}
});
