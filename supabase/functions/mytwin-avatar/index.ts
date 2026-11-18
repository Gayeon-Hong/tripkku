// MyTwin 3D: 사진 3장 → Meshy multi-image-to-3d → rigging. Meshy 키는 서버에만 둔다(MESHY_API_KEY).
// 사진은 저장하지 않고 Meshy 로 바로 넘긴다. 결과 GLB 는 assets.meshy.ai 에서만 프록시로 내려준다(SSRF 방지).
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const origins=(Deno.env.get('ALLOWED_ORIGINS')||'https://gayeon-hong.github.io,http://localhost:8765').split(',').map(x=>x.trim());
const headers=(origin:string)=>({'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'});
const send=(origin:string,status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{...headers(origin),'Content-Type':'application/json'}});
const API='https://api.meshy.ai/openapi/v1';
const TASK_ID=/^[A-Za-z0-9-]{8,64}$/;
const DATA_URI=/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const ASSET_HOSTS=['assets.meshy.ai'];

Deno.serve(async req=>{
  const origin=req.headers.get('origin')||'';
  if(!origins.includes(origin))return new Response('Forbidden',{status:403});
  if(req.method==='OPTIONS')return send(origin,200,{ok:true});
  if(req.method!=='POST')return send(origin,405,{error:'POST required'});
  try{
    const auth=req.headers.get('authorization')||'';
    if(!/^Bearer\s+\S+/.test(auth))return send(origin,401,{error:'로그인 필요'});
    const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),meshy=Deno.env.get('MESHY_API_KEY');
    if(!url||!anon||!meshy)return send(origin,503,{error:'서버 Secret(MESHY_API_KEY) 설정이 필요합니다.'});
    const client=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:userError}=await client.auth.getUser(auth.replace(/^Bearer\s+/,''));
    if(userError||!user)return send(origin,401,{error:'인증 만료. 트립꾸에서 다시 로그인하세요.'});

    const body=await req.json();
    const call=(path:string,init:RequestInit={})=>fetch(API+path,{...init,headers:{'Authorization':'Bearer '+meshy,'Content-Type':'application/json'},signal:AbortSignal.timeout(25000)});
    const relay=async(r:Response)=>{const j=await r.json().catch(()=>({}));return r.ok?send(origin,200,j):send(origin,502,{error:'Meshy 오류 ('+r.status+')',detail:String(j?.message||'').slice(0,200)});};

    switch(body.action){
      case 'create':{
        const images=body.images;
        if(!Array.isArray(images)||images.length<1||images.length>4||!images.every((s:unknown)=>typeof s==='string'&&s.length<3_000_000&&DATA_URI.test(s)))
          return send(origin,400,{error:'사진 1~4장(PNG/JPEG/WEBP, 장당 약 2MB 이하)이 필요합니다.'});
        // 리깅하려면 A포즈 휴머노이드 + 텍스처가 필요
        return relay(await call('/multi-image-to-3d',{method:'POST',body:JSON.stringify({image_urls:images,should_texture:true,enable_pbr:true,pose_mode:'a-pose',target_formats:['glb']})}));
      }
      case 'rig':{
        if(!TASK_ID.test(body.id||''))return send(origin,400,{error:'작업 ID 오류'});
        const h=Number(body.heightMeters);
        return relay(await call('/rigging',{method:'POST',body:JSON.stringify({input_task_id:body.id,height_meters:h>=1&&h<=2.3?h:1.7})}));
      }
      case 'status':{
        if(!TASK_ID.test(body.id||'')||!['multi','rig'].includes(body.kind))return send(origin,400,{error:'작업 ID 오류'});
        const r=await call((body.kind==='rig'?'/rigging/':'/multi-image-to-3d/')+body.id);
        const j=await r.json().catch(()=>({}));
        if(!r.ok)return send(origin,502,{error:'Meshy 상태 조회 실패 ('+r.status+')'});
        return send(origin,200,{status:j.status,progress:j.progress??0,error:j.task_error?.message||'',
          glb:body.kind==='rig'?j.result?.rigged_character_glb_url:j.model_urls?.glb,
          walking:j.result?.basic_animations?.walking_glb_url||'',running:j.result?.basic_animations?.running_glb_url||''});
      }
      case 'download':{
        let u:URL;try{u=new URL(body.url);}catch{return send(origin,400,{error:'URL 오류'});}
        if(u.protocol!=='https:'||!ASSET_HOSTS.includes(u.hostname))return send(origin,400,{error:'허용되지 않은 주소'});
        const r=await fetch(u,{signal:AbortSignal.timeout(25000)});
        if(!r.ok||!r.body)return send(origin,502,{error:'모델 다운로드 실패 ('+r.status+')'});
        return new Response(r.body,{status:200,headers:{...headers(origin),'Content-Type':'application/octet-stream'}}); // supabase-js 가 Blob 으로 받는 타입
      }
      default:return send(origin,400,{error:'action 오류'});
    }
  }catch(e){console.error('mytwin-avatar',String(e));return send(origin,500,{error:'서버 처리 실패'});}
});
