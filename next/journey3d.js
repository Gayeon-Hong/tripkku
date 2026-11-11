/**
 * TRIPKKU · 동선 재생용 3D 장면 (Three.js). journey.js 가 필요할 때만 불러온다.
 *
 *   buildAvatar(av, 의상종류) / poseAvatar(char, state)   2등신 캐릭터 만들기·움직이기 (전통의상 포함)
 *   buildProp(key)                              장소 소품(트리, 성, 그릇 …)
 *   createStage(canvas)                         기울어진 지도 바닥 + 동선 + 일행 + 소품을 한 장면으로 그린다
 *   createPreview(canvas)                       꾸미기 창의 미리보기
 *   createPortraits()                           여행 계획 화면에 넣는 작은 캐릭터 그림
 *
 * 좌표 단위: journey.js 가 "지금 확대 정도에서 화면 1px ≈ 1" 인 값으로 바꿔서 넘겨준다.
 * 일행은 항상 원점(0,0)에 있고 지도가 그 아래에서 움직인다. x=동쪽, z=남쪽(카메라 쪽), y=위.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
const W=720,H=1280,PI=Math.PI;
export const PROP_BACK=120,PROP_SCALE=1.15; // 머무는 곳의 소품: 일행 뒤로 떨어진 거리, 크기
const mat=(color,o={})=>new THREE.MeshStandardMaterial({color,roughness:.82,metalness:0,...o});
function mesh(geo,color,x=0,y=0,z=0,o){const m=new THREE.Mesh(geo,color&&color.isMaterial?color:mat(color,o));m.position.set(x,y,z);m.castShadow=true;return m;}
const G={sphere:(r,w=24,h=16)=>new THREE.SphereGeometry(r,w,h),capsule:(r,l)=>new THREE.CapsuleGeometry(r,l,6,16),cyl:(a,b,h,s=24)=>new THREE.CylinderGeometry(a,b,h,s),
 cone:(r,h,s=24)=>new THREE.ConeGeometry(r,h,s),box:(a,b,c)=>new THREE.BoxGeometry(a,b,c),torus:(r,t,arc=PI*2)=>new THREE.TorusGeometry(r,t,10,28,arc)};
const group=(...kids)=>{const g=new THREE.Group();for(const k of kids)g.add(k);return g;};
const rot=(m,x=0,y=0,z=0)=>{m.rotation.set(x,y,z);return m;};
const scl=(m,x,y,z)=>{m.scale.set(x,y,z);return m;};

const tint=(c,t,to='#ffffff')=>'#'+new THREE.Color(c).lerp(new THREE.Color(to),t).getHexString();

/* ---------- 전통의상: 종류(kind)별로 몸통·소매·다리 색과 덧붙일 조각을 정한다. 사용자는 색(c)과 여/남 형태만 고른다. ---------- */
function costumeSpec(kind,c,f){const light=tint(c,.72),dark=tint(c,.38,'#000000'),gold='#f0c75e',white='#fbf8f1',ink='#2a2f3c';
 const skirt=(rt,rb,h,y,col)=>mesh(G.cyl(rt,rb,h,28),col,0,y,0),band=(r,h,y,col)=>mesh(G.cyl(r,r,h,28),col,0,y,0),sash=(w,col)=>rot(mesh(G.box(w,64,3),col,0,57,22),0,0,.72);
 const buttons=(n,col)=>Array.from({length:n},(_,i)=>mesh(G.sphere(2.6),col,0,68-i*10,23.4));
 switch(kind){
  case 'hanbok':return f?{body:light,arm:light,leg:white,parts:[skirt(21,41,54,33,c),band(22.6,5,61,dark),mesh(G.box(5,24,3),'#e8507a',6,52,23),mesh(G.box(5,18,3),'#e8507a',-3,55,23)]}
   :{body:c,arm:light,leg:white,legWide:1.45,parts:[band(24,4,36,dark),mesh(G.box(5,20,3),dark,5,56,23),rot(mesh(G.box(4,22,3),white,-5,66,22),0,0,.5)]};
  case 'kimono':return {body:c,arm:c,leg:white,wide:true,parts:[skirt(22,26,60,36,c),band(24.6,f?15:7,f?50:42,f?gold:ink),rot(mesh(G.box(4,26,3),white,-6,70,21),0,0,.55),rot(mesh(G.box(4,26,3),white,6,70,21),0,0,-.55),...(f?[mesh(G.box(24,17,9),gold,0,52,-27)]:[])]};
  case 'qipao':return f?{body:c,arm:c,leg:white,parts:[skirt(22,24,56,38,c),rot(mesh(G.torus(15,2.2),gold,0,77,-2),PI/2),...[0,1,2].map(i=>mesh(G.sphere(2.6),gold,4+i*5,66-i*9,22.6))]}
   :{body:c,arm:c,leg:ink,parts:[rot(mesh(G.torus(15,2.2),gold,0,77,-2),PI/2),...buttons(4,gold),band(23.7,3,30,gold)]};
  case 'aodai':return {body:c,arm:c,leg:white,parts:[skirt(22,25,f?64:44,f?35:45,c)],hat:f?[mesh(G.cone(52,22,28),'#e8d5a0',0,45,0)]:[rot(mesh(G.torus(34,7),c,0,22,-4),PI/2-.25)]};
  case 'tracht':return f?{body:dark,arm:white,leg:white,parts:[skirt(22,38,42,30,c),mesh(G.box(24,30,3),light,0,31,31),band(23.6,4,52,light)]}
   :{body:white,arm:white,leg:'#8a5a3c',parts:[band(24.2,20,30,'#8a5a3c'),mesh(G.box(4,34,3),c,-10,60,22),mesh(G.box(4,34,3),c,10,60,22),mesh(G.box(22,4,3),c,0,62,23.6)],
     hat:[mesh(G.cyl(20,26,18),c,0,45,0),mesh(G.cyl(38,38,2.5),c,0,36,0),rot(mesh(G.cone(3,20,8),'#ffffff',23,55,0),0,0,-.4)]};
  case 'folk':return f?{body:ink,arm:white,leg:white,parts:[skirt(22,39,44,31,c),band(23.6,4,53,gold)],hat:['#ff5a6e','#ffd84a','#ffffff','#6fb8ff','#ff8fb0','#ffd84a','#ffffff','#ff5a6e','#6fb8ff'].map((col,i)=>{const a=i/9*PI*2;return mesh(G.sphere(6.5),col,Math.sin(a)*37,24,Math.cos(a)*37-2);})}
   :{body:c,arm:white,leg:ink,parts:buttons(4,gold),hat:[mesh(G.cyl(22,22,14),ink,0,46,0),mesh(G.cyl(36,36,2.5),ink,0,38,0)]};
  case 'kilt':return {body:f?white:dark,arm:f?white:dark,leg:white,parts:[skirt(23,31,30,29,c),band(23.8,4,44,ink),sash(7,c)]};
  case 'thai':return {body:f?light:white,arm:f?light:white,leg:white,parts:[skirt(22,25,50,31,c),band(23.8,5,55,gold),sash(9,gold)]};
  case 'sari':return f?{body:light,arm:light,leg:white,parts:[skirt(22,30,56,34,c),sash(12,c)]}:{body:c,arm:c,leg:white,parts:[skirt(22,25,34,44,c)]};
  default:return null;}}
export const COSTUME_KINDS=['hanbok','kimono','qipao','aodai','tracht','folk','kilt','thai','sari'];

/* ---------- 캐릭터: 키 약 150, 머리가 큰 2등신. kind 가 있으면 그 전통의상을 입힌다. ---------- */
export function buildAvatar(av,kind=''){
 const C=kind&&av.costume!=='off'?costumeSpec(kind,av.costumeColor||'#e85a6e',av.gender!=='m'):null;
 const root=new THREE.Group(),skin=mat(av.skin),cloth=mat(C?C.body:av.outfit),sleeve=mat(C?C.arm:av.outfit),hairM=mat(av.hairColor,{roughness:.95,side:THREE.DoubleSide}),ink=mat('#2a2f3c',{roughness:.35});
 const legs=[-1,1].map(s=>{const g=group(mesh(G.capsule(8,10),C?C.leg:'#55607a',0,-10,0),scl(mesh(G.sphere(9),'#ffffff',0,-20,3),1,.7,1.35));if(C?.legWide)g.children[0].scale.set(C.legWide,1,C.legWide);g.position.set(s*10,26,0);root.add(g);return g;});
 root.add(mesh(G.capsule(23,22),cloth,0,50,0));
 if(C)for(const m of C.parts)root.add(m);else root.add(rot(mesh(G.torus(17,7),cloth,0,71,-3),PI/2+.25));
 const arms=[-1,1].map(s=>{const g=group(mesh(G.capsule(7,20),sleeve,0,-14,0),mesh(G.sphere(7.5),skin,0,-29,0));if(C?.wide)g.add(scl(mesh(G.capsule(9,10),sleeve,0,-17,0),1,1,1.7));g.position.set(s*25,64,0);root.add(g);return g;});
 // 머리: 동그라미에서 볼 너비·얼굴 길이·턱선을 조금씩 조절한다.
 const head=new THREE.Group();head.position.set(0,108,0);root.add(head);
 const jaw=av.jaw||0,hg=G.sphere(40,40,28),pos=hg.attributes.position;
 for(let i=0;i<pos.count;i++){const y=pos.getY(i);if(y<0){const k=Math.pow(-y/40,1.4);pos.setX(i,pos.getX(i)*(1-jaw*.28*k));pos.setZ(i,pos.getZ(i)*(1-jaw*.12*k));}}
 hg.computeVertexNormals();head.add(mesh(hg,skin));head.scale.set(1+(av.faceW||0)*.13,1+(av.faceH||0)*.11,.96);
 const bangs=av.hair==='buzz'?'none':(av.bangs||'full');
 const eyes=[],face=[]; // 눈은 쪽마다 뜬 눈(open)·웃는 눈(up)·감은 눈(down)을 만들어 두고 표정에 따라 바꿔 보여 준다
 // 눈썹: 앞머리가 있으면 앞머리 위로 살짝 비쳐 보이게 앞쪽에 둔다.
 const browR=bangs==='full'?45.2:40.8,browZ=Math.sqrt(browR*browR-14*14-9*9),browM=mat(tint(av.hairColor,.3,'#000000'),{roughness:.6});
 for(const s of [-1,1]){const open=new THREE.Group(),up=mesh(G.torus(6,1.5,PI),ink,s*14,-6,38.3),down=rot(mesh(G.torus(6,1.5,PI),ink,s*14,-2,38.3),0,0,PI);head.add(open,up,down);eyes.push({open,up,down});
  if(av.eyes==='dot')open.add(mesh(G.sphere(4.4),ink,s*14,-4,37.4));
  else if(av.eyes==='smile')open.add(mesh(G.torus(6,1.5,PI),ink,s*14,-6,38.3));
  else if(av.eyes==='sleepy')open.add(rot(mesh(G.torus(6,1.5,PI),ink,s*14,-2,38.3),0,0,PI));
  else open.add(scl(mesh(G.sphere(7.2),ink,s*14,-4,35.4),1,1.22,.6),mesh(G.sphere(2.5),'#ffffff',s*14+2.6,-.6,39.5,{emissive:'#ffffff',emissiveIntensity:.7}),mesh(G.sphere(1.2),'#ffffff',s*14-2.6,-7.5,39.2,{emissive:'#ffffff',emissiveIntensity:.7}));
  head.add(rot(mesh(new THREE.CircleGeometry(6.5,20),mat('#ff7f96',{transparent:true,opacity:.5}),s*24,-14,31),0,s*.62,0));
  const brow=av.brows==='soft'?rot(mesh(G.torus(8,1.2,PI*.5),browM,s*14,2,browZ),0,0,PI*.25):av.brows==='flat'?mesh(G.box(12,2.2,1.6),browM,s*14,9,browZ)
   :av.brows==='up'?rot(mesh(G.box(12,2.4,1.6),browM,s*14,10,browZ),0,0,s*.28):av.brows==='thick'?mesh(G.box(13,4,2),browM,s*14,9.5,browZ):null;
  if(brow){head.add(brow);face.push(brow);}}
 const mouthSmile=rot(mesh(G.torus(4.6,1.2,PI),ink,0,-14,37.6),0,0,PI),mouthOpen=scl(mesh(G.sphere(4.8),'#b8405a',0,-17,36.4),1,.9,.4),mouthO=scl(mesh(G.sphere(3.8),'#8f2f45',0,-16,36.9),1,1.2,.4);head.add(mouthSmile,mouthOpen,mouthO);
 for(const m of [...eyes.flatMap(e=>[...e.open.children,e.up,e.down]),mouthSmile,mouthOpen,mouthO,...face])m.castShadow=false;
 // 머리 모양
 const cap=(r,len,tilt,color)=>rot(mesh(new THREE.SphereGeometry(r,32,20,0,PI*2,0,PI*len),color||hairM),tilt);
 // 곱슬 뭉치: [위에서 내려온 각도, 개수, 앞을 비우는 각도] 또는 [각도, 개수, 시작, 끝]. 작은 뭉치를 촘촘히 얹어 볼륨을 만든다.
 const puffs=(rings,r,R)=>{const g=new THREE.Group();let n0=0;for(const [polar,n,a0,a1] of rings)for(let i=0;i<n;i++){const az=a1!==undefined?a0+(i/Math.max(1,n-1))*(a1-a0):a0?a0+(i/Math.max(1,n-1))*(PI*2-2*a0):i/n*PI*2+polar*2,sp=Math.sin(polar),j=1+((n0++*37)%7-3)*.012;
  g.add(mesh(G.sphere(r*(.9+((n0*53)%5)*.05),12,9),hairM,R*j*sp*Math.sin(az),R*j*Math.cos(polar),R*j*sp*Math.cos(az)));}return g;};
 const shell=()=>mesh(new THREE.SphereGeometry(46,32,22,0,PI*2,0,PI*.74),hairM,0,2,-15);
 // 앞머리: full=눈썹 위까지 풍성하게, none=이마가 보이게 넘김, part=가르마(가운데가 트이고 양옆으로 흐름)
 const fringe=()=>[-26,-13,0,13,26].map(x=>scl(mesh(G.sphere(9.5),hairM,x,11,Math.sqrt(1600-121-x*x)+1),1,1.1,.5));
 const lobes=()=>[-1,1].flatMap(sg=>[rot(scl(mesh(G.sphere(19),hairM,sg*23,19,27),1.25,.8,.6),0,0,sg*-.55),scl(mesh(G.sphere(9),hairM,sg*34,2,19),.6,1.6,.6)]);
 const top=()=>bangs==='full'?[cap(43.6,.39,.2),...fringe()]:bangs==='part'?[cap(42.6,.4,-.3),...lobes()]:[cap(42.6,.4,-.3)];
 const gap=bangs==='full'?0:bangs==='part'?.4:.8,curlBangs=bangs==='full'?[[1.32,5,-.62,.62]]:[];
 if(av.hair==='buzz')head.add(cap(40.9,.42,-.18));
 else if(av.hair==='short')head.add(cap(43,.46,-.3),...(bangs==='full'?[scl(mesh(G.sphere(13),hairM,-17,23,30),1,1,.7),scl(mesh(G.sphere(14),hairM,0,25,32),1,1,.7),scl(mesh(G.sphere(13),hairM,17,23,30),1,1,.7)]:bangs==='part'?lobes():[]));
 else if(av.hair==='bob')head.add(shell(),...top());
 else if(av.hair==='long')head.add(shell(),...top(),scl(mesh(G.sphere(36),hairM,0,-44,-24),1.12,1.5,.55));
 else if(av.hair==='perm')head.add(shell(),cap(42.6,.4,-.3),puffs([[.3,6,0],[.68,10,0],[1.02,13,gap],...curlBangs,[1.38,12,1.05],[1.74,11,1.2],[2.08,9,1.4]],9.5,45));
 else head.add(cap(43,.46,-.3),puffs([[.28,6,0],[.62,10,0],[.96,12,gap],...curlBangs,[1.28,10,1.25]],8.5,43)); // permShort
 // 소품·의상 모자
 if(C?.hat)for(const m of C.hat)head.add(m);
 else if(av.acc==='cap')head.add(cap(44.6,.47,-.2,mat('#4f7fd1',{side:THREE.DoubleSide})),scl(mesh(G.cyl(24,24,3),'#3c66b0',0,17,37),1,1,.8));
 if(av.acc==='glasses')head.add(mesh(G.torus(9.6,1.3),'#3a3f4b',-14,-4,39.6),mesh(G.torus(9.6,1.3),'#3a3f4b',14,-4,39.6),mesh(G.box(8,1.5,1.5),'#3a3f4b',0,-3,40.4));
 else if(av.acc==='ribbon'&&!C?.hat)head.add(rot(mesh(G.cone(8,15,14),'#ff7fa1',19,37,10),0,0,-PI/2),rot(mesh(G.cone(8,15,14),'#ff7fa1',35,37,10),0,0,PI/2),mesh(G.sphere(4.5),'#e85a84',27,37,10));
 // 키: 아이·아기는 몸을 작게, 머리는 상대적으로 크게
 const k=av.size==='baby'?.62:av.size==='kid'?.8:1,hk=av.size==='baby'?1.2:av.size==='kid'?1.08:1;head.scale.multiplyScalar(hk);root.scale.setScalar(k);
 root.userData={legs,arms,head,eyes,mouthSmile,mouthOpen,mouthO,tag:(108+44*hk)*k+18+(C?.hat?16*k:0)};
 return root;}

/** state: {walking, act: ''|cheer|pose|wave|eat|relax|sleep, mood(표정, 없으면 행동에 맞춰 고름), t, seed} */
export function poseAvatar(c,o){const u=c.userData,t=o.t||0,sd=o.seed||0,act=o.act||'',sw=o.walking?Math.sin(t*11+sd):0;
 c.position.y=(act==='cheer'?Math.abs(Math.sin(t*7+sd))*20:o.walking?Math.abs(sw)*4:0)*c.scale.y;
 u.legs[0].rotation.x=sw*.75;u.legs[1].rotation.x=-sw*.75;
 [-1,1].forEach((s,i)=>{const a=u.arms[i];let up=.18,fwd=s*sw*-.65;
  if(act==='cheer')up=2.6+Math.sin(t*7+sd+s)*.2;else if(act==='pose')up=2.4;else if(act==='wave'&&s===1)up=2.4+Math.sin(t*10+sd)*.35;else if(act==='eat'&&s===1){up=.3;fwd=-1.9+Math.sin(t*6+sd)*.22;}
  a.rotation.set(fwd,0,s*up);});
 // 표정: normal(가끔 깜빡임) · happy(웃는 눈+벌린 입) · wow(커진 눈+오 입) · yum(오물오물) · relaxed · sleepy · wink · smile
 const mood=o.mood||({cheer:'happy',pose:'wink',eat:'yum',relax:'relaxed',sleep:'sleepy',wave:'smile'})[act]||'normal',blink=mood==='normal'&&((t+sd*.37)%3.4)<.13;
 const eye=(e,kind,k)=>{e.open.visible=kind==='open';e.up.visible=kind==='up';e.down.visible=kind==='down';e.open.scale.setScalar(k);};
 const L=mood==='happy'||mood==='yum'||mood==='wink'?'up':mood==='relaxed'||mood==='sleepy'||blink?'down':'open',R=mood==='wink'?'open':L,big=mood==='wow'?1.2:1;
 eye(u.eyes[0],L,big);eye(u.eyes[1],R,big);
 const mouth=mood==='wow'||mood==='sleepy'?'o':mood==='happy'||mood==='wink'||mood==='smile'?'open':mood==='yum'?(Math.sin(t*7+sd)>0?'o':'smile'):'smile';
 u.mouthOpen.visible=mouth==='open';u.mouthO.visible=mouth==='o';u.mouthSmile.visible=mouth==='smile';
 u.head.rotation.z=act==='sleep'?.24:act==='relax'?Math.sin(t*2+sd)*.07:0;u.head.rotation.x=act==='sleep'?.12:0;}

/* ---------- 장소 소품: 바닥 y=0 기준, 높이 약 120~180 ---------- */
const steam=(x,y,z)=>[0,1,2].map(i=>mesh(G.sphere(9-i*2),mat('#ffffff',{transparent:true,opacity:.75}),x+i*6,y+i*16,z));
const glass=(c,op=.45)=>mat(c,{transparent:true,opacity:op,roughness:.15});
const half=(r,h,s=24)=>new THREE.CylinderGeometry(r,r,h,s,1,false,0,PI);
// 접시 위 음식: 접시 + 포크·나이프를 깔고 그 위에 음식을 올린다.
const plate=(...food)=>group(mesh(G.cyl(58,50,7,40),'#ffffff',0,4,0),rot(mesh(G.torus(54,3.5),'#e9eef3',0,8,0),PI/2),
 mesh(G.box(5,3,62),'#c9cfd9',-70,4,0),...[-4,0,4].map(x=>mesh(G.box(1.6,3,14),'#c9cfd9',-70+x,4,-36)),mesh(G.box(7,3,66),'#c9cfd9',70,4,0),...food);
const flat=(r,c,x,y,z,sx,sy,sz)=>scl(mesh(G.sphere(r,22,14),c,x,y,z),sx,sy,sz);
const PROPS={
 /* 크리스마스 */
 tree:()=>{const g=group(mesh(G.cyl(9,11,26),'#8a5a3c',0,13,0),mesh(G.cone(58,70),'#2f9e63',0,48,0),mesh(G.cone(46,60),'#37b071',0,88,0),mesh(G.cone(32,50),'#45c283',0,124,0),mesh(new THREE.OctahedronGeometry(13),'#ffd84a',0,160,0,{emissive:'#ffb400',emissiveIntensity:.7}));
  ['#ff5a6e','#ffd84a','#6fb8ff','#ffffff','#ff5a6e','#6fb8ff','#ffd84a','#ffffff','#ff5a6e'].forEach((c,i)=>{const lvl=i%3,r=[40,30,19][lvl],a=i*2.3;g.add(mesh(G.sphere(5.5),c,Math.sin(a)*r,[40,82,118][lvl],Math.cos(a)*r,{emissive:c,emissiveIntensity:.4}));});
  g.add(mesh(G.box(26,22,26),'#ff5a6e',-52,11,30),mesh(G.box(28,4,6),'#ffd84a',-52,22,30),mesh(G.box(20,18,20),'#5b8def',48,9,34));return g;},
 santa:()=>group(mesh(G.cyl(30,44,70,28),'#e8323f',0,35,0),mesh(G.cyl(45,45,9,28),'#ffffff',0,4,0),mesh(G.cyl(31,31,7,28),'#2a2f3c',0,46,0),mesh(G.box(12,10,4),'#f0c75e',0,46,31),
  mesh(G.sphere(28),'#ffd9c2',0,96,0),flat(24,'#ffffff',0,82,10,1,1.1,.8),flat(9,'#ffffff',0,92,26,1.4,.6,.6),mesh(G.sphere(5),'#ff8f8f',0,98,27),mesh(G.sphere(3),'#2a2f3c',-10,104,24),mesh(G.sphere(3),'#2a2f3c',10,104,24),
  rot(mesh(G.cone(27,48),'#e8323f',6,136,0),0,0,-.3),mesh(G.torus(26,6),'#ffffff',0,118,0),mesh(G.sphere(8),'#ffffff',20,156,0),flat(34,'#a8794f',-52,40,-12,1,1.15,1),mesh(G.torus(9,4),'#7a5434',-52,80,-12)),
 stall:()=>{const g=group(mesh(G.box(120,46,50),'#a8794f',0,23,0),mesh(G.box(126,6,56),'#8a5a3c',0,48,0),...[-56,56].map(x=>mesh(G.cyl(3.5,3.5,100,8),'#8a5a3c',x,98,24)),
  ...[-56,56].map(x=>mesh(G.cyl(3.5,3.5,100,8),'#8a5a3c',x,98,-24)));
  for(let i=0;i<6;i++)g.add(rot(mesh(G.box(22,4,64),i%2?'#ffffff':'#e8323f',-55+i*22,150,0),.35,0,0));
  ['#ffd84a','#ff5a6e','#8fd0b8','#f2a07a','#b9a4e6'].forEach((c,i)=>g.add(mesh(G.sphere(9),c,-40+i*20,58,10)));
  for(let i=0;i<9;i++)g.add(mesh(G.sphere(3.4),'#ffe68a',-56+i*14,138,30,{emissive:'#ffd84a',emissiveIntensity:.9}));return g;},
 snowman:()=>group(mesh(G.sphere(40),'#ffffff',0,38,0),mesh(G.sphere(30),'#ffffff',0,96,0),mesh(G.sphere(22),'#ffffff',0,140,0),rot(mesh(G.cone(4.5,22),'#ff8a3d',0,140,30),PI/2),
  mesh(G.sphere(3.5),'#2a2f3c',-8,148,19),mesh(G.sphere(3.5),'#2a2f3c',8,148,19),rot(mesh(G.torus(22,6),'#e8323f',0,120,0),PI/2),mesh(G.cyl(18,18,26),'#2a2f3c',0,168,0),mesh(G.cyl(27,27,3),'#2a2f3c',0,156,0),
  ...[0,1,2].map(i=>mesh(G.sphere(4),'#2a2f3c',0,108-i*14,29))),
 gluhwein:()=>group(mesh(G.cyl(32,30,64),'#c43a4a',0,32,0),mesh(G.cyl(28,28,2),'#7a1d2e',0,63,0),mesh(G.torus(15,5),'#c43a4a',36,34,0),mesh(new THREE.OctahedronGeometry(9),'#ffd84a',0,34,31),
  ...steam(-6,82,0),mesh(G.cyl(3,3,40,8),'#8a5a3c',14,74,4)),
 /* 먹고 마시기 */
 bowl:()=>group(mesh(G.cyl(22,26,10),'#e8604a',0,5,0),mesh(new THREE.SphereGeometry(50,28,14,0,PI*2,PI/2,PI/2),mat('#ff7a59',{side:THREE.DoubleSide}),0,58,0),rot(mesh(G.torus(50,4),'#ffffff',0,58,0),PI/2),mesh(G.cyl(45,45,6),'#ffe2a8',0,55,0),
  scl(mesh(G.sphere(13),'#ffffff',-16,60,6),1,.45,1),scl(mesh(G.sphere(6),'#ffb400',-16,63,6),1,.6,1),mesh(G.box(22,5,10),'#6fbf73',16,60,-10),rot(mesh(G.cyl(1.8,1.8,110,8),'#8a5a3c',26,92,0),0,0,-.7),rot(mesh(G.cyl(1.8,1.8,110,8),'#8a5a3c',34,90,8),0,0,-.7)),
 dish:()=>group(mesh(G.cyl(22,26,10),'#f1ece4',0,5,0),mesh(new THREE.SphereGeometry(48,28,14,0,PI*2,PI/2,PI/2),mat('#f6f1e8',{side:THREE.DoubleSide}),0,56,0),rot(mesh(G.torus(48,4),'#5b8def',0,56,0),PI/2),
  flat(42,'#ffffff',0,56,0,1,.3,1),...steam(-10,70,0),rot(mesh(G.capsule(3,70),'#c9cfd9',38,84,0),0,0,-.6),flat(9,'#c9cfd9',16,60,0,1,.4,1.4)),
 steak:()=>plate(flat(34,'#7a3b22',0,18,0,1.25,.36,.95),...[-14,0,14].map(x=>rot(mesh(G.box(4,2,40),'#4a2414',x,30,0),0,.5,0)),mesh(G.sphere(8),'#6fbf73',-34,16,18),mesh(G.sphere(7),'#ff8a3d',30,14,24),
  ...[0,1,2,3].map(i=>rot(mesh(G.box(6,6,26),'#f0c75e',22+i*6,12,-26),0,i*.4,0))),
 pasta:()=>plate(...Array.from({length:12},(_,i)=>rot(mesh(G.torus(12+i%3*7,2.6),'#f4d27a',(i%4-1.5)*10,12+Math.floor(i/4)*5,(i%3-1)*8),PI/2+(i%3)*.2,0,i)),flat(18,'#d9402e',0,26,0,1,.45,1),
  mesh(G.sphere(6),'#d9402e',-12,26,10),mesh(G.sphere(6),'#d9402e',12,25,-8),flat(6,'#4fae7a',4,32,4,1.4,.4,1)),
 pizza:()=>{const g=group(mesh(G.cyl(60,60,7,40),'#e9b864',0,4,0),mesh(G.cyl(53,53,3,40),'#e04a32',0,8,0),mesh(G.cyl(50,50,2,40),'#ffe08a',0,10,0));
  [[-24,-14],[16,-28],[26,16],[-10,24],[-30,14],[6,0],[34,-6]].forEach(([x,z])=>g.add(mesh(G.cyl(8,8,3),'#c2352a',x,12,z)));[[-4,-30],[30,30],[-34,-4]].forEach(([x,z])=>g.add(flat(5,'#4fae7a',x,13,z,1.4,.4,1)));return g;},
 burger:()=>group(mesh(G.cyl(40,36,12),'#e0a050',0,6,0),mesh(G.cyl(42,42,12),'#6b3a22',0,19,0),rot(mesh(G.box(70,3,70),'#ffd040',0,27,0),0,.78,0),mesh(G.cyl(44,44,4),'#6fbf73',0,31,0),
  mesh(G.cyl(38,38,5),'#e8423a',0,36,0),scl(mesh(new THREE.SphereGeometry(42,28,14,0,PI*2,0,PI/2),'#e9a650'),1,.75,1),
  ...[[-14,58,12],[10,62,4],[0,56,-20],[20,54,16],[-22,52,-10]].map(([x,y,z])=>flat(3,'#fff4c2',x,y+4,z,1.6,.6,1))),
 sushi:()=>{const g=group(mesh(G.box(150,10,64),'#c9945a',0,5,0),...[-56,56].map(x=>mesh(G.box(12,10,60),'#a8794f',x,-2,0)));
  [['#ff8a5c',-40],['#e8323f',0],['#ffd040',40]].forEach(([c,x])=>{g.add(scl(mesh(G.capsule(14,18),'#ffffff',x,22,0),1,.8,1),rot(scl(mesh(G.capsule(13,20),c,x,34,0),1,.35,1.05),0,0,PI/2));
   if(c==='#ffd040')g.add(mesh(G.box(10,24,32),'#203a2a',x,26,0));});
  g.add(flat(10,'#6fbf73',62,14,22,1,.6,1),mesh(G.cyl(9,9,10),'#ffffff',-62,14,24));return g;},
 curry:()=>plate(flat(30,'#ffffff',-16,16,-4,1,.6,1),flat(34,'#d98b2a',18,13,6,1.1,.3,1),...[[12,6],[26,16],[18,-6]].map(([x,z])=>mesh(G.box(8,8,8),x%2?'#ff8a3d':'#f4d27a',x,20,z))),
 sausage:()=>plate(...[-14,14].map(z=>rot(mesh(G.capsule(10,58),'#b3502c',0,18,z),0,0,PI/2)),...[-20,0,20].map(x=>mesh(G.sphere(3.5),'#ffd040',x,28,-14)),flat(16,'#f0d090',-34,14,26,1.3,.35,1),
  rot(mesh(G.torus(14,6),'#a8693a',38,16,26),PI/2)),
 pretzel:()=>group(mesh(G.cyl(46,46,6),'#c9945a',0,3,0),rot(mesh(G.torus(34,9),'#a0582a',-14,52,0),0,0,0),rot(mesh(G.torus(34,9),'#a0582a',14,52,0),0,0,0),rot(mesh(G.capsule(9,62),'#a0582a',0,40,0),0,0,.7),
  rot(mesh(G.capsule(9,62),'#a0582a',0,40,0),0,0,-.7),...Array.from({length:8},(_,i)=>mesh(G.sphere(2.2),'#ffffff',Math.cos(i)*36,56+Math.sin(i*2)*24,9))),
 schnitzel:()=>plate(flat(36,'#d9a04a',0,14,0,1.35,.22,1),...[[-12,-6],[10,8],[22,-10]].map(([x,z])=>mesh(G.sphere(5),'#c08030',x,22,z)),rot(mesh(half(12,8),'#ffe04a',30,20,24),0,0,PI/2),
  flat(10,'#6fbf73',-34,14,24,1,.5,1)),
 dumpling:()=>{const g=group(mesh(G.cyl(58,54,34,28),'#c9945a',0,17,0),mesh(G.cyl(52,52,2,28),'#f4ead2',0,34,0));
  [[-20,-18],[20,-18],[-20,18],[20,18],[0,0]].forEach(([x,z])=>g.add(flat(16,'#fffaf0',x,42,z,1,.75,1),mesh(G.cone(6,10,8),'#fffaf0',x,54,z)));return g;},
 taco:()=>group(...[-24,24].map(x=>group(rot(mesh(half(30,26,24),'#f0c050',x,30,0),0,0,PI/2),mesh(G.sphere(9),'#6fbf73',x,52,-6),mesh(G.sphere(8),'#e8423a',x+6,50,6),mesh(G.sphere(7),'#7a3b22',x-6,50,4))),
  mesh(G.box(120,6,60),'#ffffff',0,3,0)),
 fishchips:()=>group(mesh(G.box(92,40,56),'#e8e2d4',0,20,0),mesh(G.box(94,6,58),'#5b8def',0,40,0),...[-20,10].map(x=>rot(scl(mesh(G.capsule(14,40),'#e0a050',x,52,-6),1,.6,1),0,0,PI/2+.2)),
  ...Array.from({length:7},(_,i)=>rot(mesh(G.box(7,46,7),'#ffd040',-30+i*10,58,16),0,0,(i%3-1)*.2))),
 paella:()=>{const g=group(mesh(G.cyl(64,58,12,36),'#3a3f4b',0,6,0),...[-1,1].map(s=>rot(mesh(G.torus(9,3),'#3a3f4b',s*70,10,0),PI/2)),mesh(G.cyl(58,58,3,36),'#f2c03a',0,13,0));
  [[-20,-20],[24,-14],[-6,26],[28,24]].forEach(([x,z])=>g.add(rot(mesh(G.torus(9,4,PI*1.4),'#ff7a59',x,16,z),PI/2,0,x)));g.add(rot(mesh(half(12,8),'#ffe04a',-30,18,10),0,0,PI/2),mesh(G.sphere(5),'#6fbf73',0,16,-30));return g;},
 kebab:()=>group(mesh(G.cyl(40,40,6),'#c9cfd9',0,3,0),mesh(G.cyl(2.4,2.4,190,8),'#c9cfd9',0,95,0),mesh(G.cyl(22,34,120,18),'#9a5a32',0,78,0),...[0,1,2,3].map(i=>rot(mesh(G.torus(28-i*3,2),'#7a3b22',0,40+i*28,0),PI/2))),
 bibimbap:()=>{const g=group(mesh(G.cyl(52,40,44,28),'#3a3f4b',0,22,0),mesh(G.cyl(48,48,3,28),'#ffffff',0,44,0));
  ['#6fbf73','#ff8a3d','#c2352a','#8a5a3c','#f4d27a','#5fb565'].forEach((c,i)=>{const a=i/6*PI*2;g.add(flat(14,c,Math.sin(a)*28,47,Math.cos(a)*28,1,.35,1));});
  g.add(flat(16,'#ffffff',0,48,0,1,.3,1),mesh(G.sphere(7),'#ffb400',0,50,0));return g;},
 grill:()=>{const g=group(mesh(G.cyl(56,48,26,28),'#3a3f4b',0,13,0),mesh(G.cyl(52,52,2,28),'#ff6a2a',0,26,0,{emissive:'#ff4a00',emissiveIntensity:.5}));
  for(let i=-2;i<=2;i++)g.add(mesh(G.box(100,2,2),'#c9cfd9',0,29,i*18));[[-18,-10],[16,8],[-4,22],[26,-18]].forEach(([x,z],i)=>g.add(rot(flat(16,'#b55a3a',x,32,z,1.5,.3,.9),0,i,0)));
  g.add(...steam(-10,48,0));return g;},
 chicken:()=>group(mesh(G.cyl(52,44,28,28),'#e8323f',0,14,0),mesh(G.cyl(48,48,2,28),'#ffffff',0,28,0),...[[-18,-6,.4],[14,-12,-.5],[0,16,.1],[-24,18,-.8]].map(([x,z,a])=>group(
  rot(mesh(G.capsule(4,24),'#fffaf0',x+Math.sin(a)*24,48,z+Math.cos(a)*24),PI/2,a,0),flat(16,'#d98b2a',x,42,z,1,.9,1.3)))),
 seafood:()=>group(mesh(G.cyl(60,54,8,32),'#ffffff',0,4,0),flat(34,'#e8423a',0,26,0,1.25,.55,1),...[-1,1].map(s=>group(mesh(G.sphere(13),'#e8423a',s*52,38,24),rot(mesh(G.capsule(4,20),'#e8423a',s*36,30,16),0,0,s*1.2))),
  ...[-1,1].flatMap(s=>[0,1,2].map(i=>rot(mesh(G.capsule(3,24),'#d9352f',s*40,18,-14+i*14),0,0,s*1.9))),mesh(G.sphere(4),'#2a2f3c',-8,44,22),mesh(G.sphere(4),'#2a2f3c',8,44,22)),
 breakfast:()=>plate(flat(26,'#ffffff',-12,12,6,1.2,.25,1),mesh(G.sphere(9),'#ffb400',-12,15,6),...[0,1].map(i=>rot(mesh(G.box(34,8,34),'#e0a050',26,14+i*9,-14+i*6),0,.3+i*.3,0)),
  ...[0,1].map(i=>rot(mesh(G.box(46,3,9),'#c2453a',-14,16+i*2,-28+i*12),0,.2,0))),
 cake:()=>group(mesh(G.cyl(56,56,6,32),'#ffffff',0,3,0),mesh(G.cyl(44,44,36,32),'#ffe0e8',0,24,0),mesh(G.cyl(46,46,6,32),'#ffffff',0,42,0),mesh(G.cyl(32,32,30,32),'#fff4d6',0,60,0),mesh(G.cyl(34,34,5,32),'#ffffff',0,76,0),
  ...[0,1,2,3,4].map(i=>mesh(G.sphere(6),'#e8323f',Math.sin(i*1.26)*24,82,Math.cos(i*1.26)*24)),mesh(G.cyl(2.4,2.4,22,8),'#6fb8ff',0,90,0),mesh(G.sphere(4),'#ffb400',0,104,0,{emissive:'#ff9a00',emissiveIntensity:.9})),
 bread:()=>group(mesh(G.box(130,8,70),'#c9945a',0,4,0),...[-1,-.4,.2].map((a,i)=>rot(mesh(G.torus(26,10,PI*1.1),'#d99a4a',-26,22,-6),PI/2,0,a+i)),rot(mesh(G.capsule(13,80),'#c98a3a',34,22,0),0,.5,PI/2),
  ...[0,1,2].map(i=>rot(mesh(G.box(3,4,18),'#a0602a',22+i*13,34,-8+i*8),0,.5,0))),
 icecream:()=>group(rot(mesh(G.cone(22,80,16),'#e0a050',0,40,0),PI),mesh(G.sphere(24),'#ffd6e8',0,90,0),mesh(G.sphere(22),'#fff4d6',-2,124,2),mesh(G.sphere(18),'#7a4a2a',2,152,0),mesh(G.sphere(6),'#e8323f',0,172,0)),
 cup:()=>group(mesh(G.cyl(44,48,5),'#f1ece4',0,3,0),mesh(G.cyl(31,25,58),'#ffffff',0,35,0),mesh(G.cyl(28,28,2),'#7a4a2a',0,64,0),rot(mesh(G.torus(14,4.5),'#ffffff',35,36,0),0,0,0),...steam(-8,84,0)),
 beer:()=>group(mesh(G.cyl(30,30,68),mat('#ffc93a',{transparent:true,opacity:.92}),0,36,0),rot(mesh(G.torus(16,5),'#fff4c2',36,38,0)),mesh(G.sphere(18),'#ffffff',-12,76,0),mesh(G.sphere(18),'#ffffff',12,78,4),mesh(G.sphere(15),'#ffffff',0,86,-8)),
 wine:()=>group(mesh(G.cyl(18,18,3),glass('#ffffff',.6),-22,2,0),mesh(G.cyl(2.5,2.5,56,8),glass('#ffffff',.6),-22,30,0),mesh(new THREE.SphereGeometry(24,24,14,0,PI*2,PI*.35,PI*.65),glass('#ffffff',.35),-22,82,0),
  flat(18,'#8a1d3a',-22,70,0,1,.6,1),mesh(G.cyl(14,14,90,20),'#2d4a35',36,45,-6),mesh(G.cyl(5,8,26,12),'#2d4a35',36,102,-6),mesh(G.box(29,30,1),'#f4ead2',36,46,8)),
 cocktail:()=>group(mesh(G.cyl(18,18,3),glass('#ffffff',.6),0,2,0),mesh(G.cyl(2.5,2.5,60,8),glass('#ffffff',.6),0,32,0),rot(mesh(G.cone(38,46,24),glass('#ff7fa1',.75),0,84,0),PI),mesh(G.sphere(6),'#6fbf73',-10,96,4),
  rot(mesh(G.cyl(1.6,1.6,70,6),'#ffffff',16,110,0),0,0,-.4),rot(mesh(G.cone(22,10,10),'#ffd84a',32,140,0),0,0,-.2)),
 /* 관광 */
 castle:()=>group(mesh(G.box(76,70,50),'#ece5d3',0,35,0),mesh(G.cyl(17,17,104),'#f3eddc',-48,52,0),mesh(G.cyl(17,17,104),'#f3eddc',48,52,0),mesh(G.cone(23,38),'#5b8def',-48,123,0),mesh(G.cone(23,38),'#5b8def',48,123,0),
  mesh(G.cyl(15,15,56),'#f3eddc',0,98,0),mesh(G.cone(21,36),'#e85a6e',0,144,0),mesh(G.box(20,32,4),'#8a5a3c',0,16,26),mesh(G.box(10,12,3),'#6f8fc0',-48,70,16),mesh(G.box(10,12,3),'#6f8fc0',48,70,16)),
 church:()=>group(mesh(G.box(70,70,96),'#efe6d4',0,35,-20),rot(mesh(G.cone(56,34,4),'#8a5a4a',0,87,-20),0,PI/4),mesh(G.box(36,130,36),'#efe6d4',0,65,30),mesh(G.cone(26,70,4),'#5a7a8a',0,165,30),
  mesh(G.cyl(12,12,3,24),'#8fb7ea',0,96,49),mesh(G.box(16,24,3),'#8a5a3c',0,12,49),mesh(G.box(3,22,3),'#f0c75e',0,210,30),mesh(G.box(12,3,3),'#f0c75e',0,214,30)),
 gate:()=>{const g=group(mesh(G.box(150,14,40),'#e8dfc8',0,7,0),mesh(G.box(150,22,42),'#e8dfc8',0,112,0),mesh(G.box(76,14,30),'#e8dfc8',0,130,0));for(let i=0;i<6;i++)g.add(mesh(G.cyl(6,7,90,12),'#f4ecd8',-60+i*24,59,14));
  g.add(mesh(G.box(30,16,14),'#5a8a6a',0,145,0),...[-9,-3,3,9].map(x=>mesh(G.box(4,12,10),'#5a8a6a',x,158,0)),mesh(G.box(4,26,4),'#5a8a6a',0,166,-4));return g;},
 eiffel:()=>group(mesh(G.cyl(14,46,70,4),'#8a6a4a',0,35,0),mesh(G.box(70,6,70),'#8a6a4a',0,72,0),mesh(G.cyl(6,15,70,4),'#8a6a4a',0,110,0),mesh(G.box(34,5,34),'#8a6a4a',0,146,0),mesh(G.cyl(2,6,50,4),'#8a6a4a',0,173,0),
  mesh(G.cyl(1.4,1.4,20,6),'#8a6a4a',0,206,0),...[0,1,2,3].map(i=>rot(mesh(G.torus(18,3,PI),'#ffffff',Math.sin(i*PI/2)*30,0,Math.cos(i*PI/2)*30),0,i*PI/2,0))),
 pagoda:()=>{const g=group(mesh(G.box(80,10,80),'#c9b28a',0,5,0));for(let i=0;i<4;i++){const s=1-i*.18,y=10+i*38;g.add(mesh(G.box(56*s,26,56*s),'#e8d8b8',0,y+13,0),scl(rot(mesh(G.cone(56*s,18,4),'#c2352a',0,y+34,0),0,PI/4,0),1.15,1,1.15));}
  g.add(mesh(G.cyl(2,2,30,8),'#f0c75e',0,176,0));return g;},
 torii:()=>group(...[-36,36].map(x=>mesh(G.cyl(6,7,130,14),'#e8323f',x,65,0)),mesh(G.box(108,10,12),'#2a2f3c',0,136,0),mesh(G.box(98,8,10),'#e8323f',0,128,0),mesh(G.box(84,7,9),'#e8323f',0,104,0),mesh(G.box(8,24,8),'#e8323f',0,116,0)),
 bridge:()=>group(mesh(G.box(180,4,70),'#8fd0f0',0,1,0),mesh(G.box(180,8,30),'#c9b28a',0,62,0),rot(mesh(G.torus(66,7,PI),'#a88a68',0,0,0),0,0,0),...[-70,70].map(x=>mesh(G.box(14,62,32),'#a88a68',x,31,0)),
  ...Array.from({length:9},(_,i)=>mesh(G.box(2.5,14,2.5),'#a88a68',-80+i*20,73,13))),
 boat:()=>group(mesh(G.cyl(80,80,4,32),'#8fd0f0',0,2,0),scl(mesh(half(30,120,20),'#ffffff',0,22,0),1,1,1),rot(mesh(half(30,120,20),'#ffffff',0,22,0),PI/2,0,PI/2),mesh(G.box(60,28,36),'#5b8def',-6,46,0),
  ...[-24,-6,12].map(x=>mesh(G.box(10,10,37),'#ffffff',x,48,0)),mesh(G.cyl(2,2,50,8),'#c9cfd9',30,70,0),mesh(G.box(22,14,2),'#ff5a6e',41,88,0)),
 mountain:()=>group(mesh(G.cone(70,130,7),'#7a9a8a',0,65,0),mesh(G.cone(29,54,7),'#ffffff',0,103,0),mesh(G.cone(46,86,7),'#8fb09a',56,43,20),mesh(G.cone(18,34,7),'#ffffff',56,69,20),mesh(G.cone(36,60,7),'#6cc070',-50,30,30)),
 tower:()=>group(mesh(G.cyl(22,26,8),'#c9cfd9',0,4,0),mesh(G.cyl(6,15,150,14),'#e3e7ee',0,79,0),scl(mesh(G.sphere(21),'#ff6b8a',0,122,0),1,.8,1),mesh(G.cyl(1.6,1.6,44,8),'#c9cfd9',0,176,0)),
 museum:()=>group(mesh(G.box(126,12,74),'#e8e4da',0,6,0),mesh(G.box(104,62,40),'#f4f1e8',0,43,-10),...[-42,-14,14,42].map(x=>mesh(G.cyl(7,7,62),'#ffffff',x,43,22)),mesh(G.box(128,10,78),'#e8e4da',0,79,0),scl(rot(mesh(G.cone(66,30,4),'#d9d3c4',0,99,0),0,PI/4),1,1,.62)),
 fountain:()=>group(mesh(G.cyl(66,70,16,32),'#d9d3c4',0,8,0),mesh(G.cyl(60,60,3,32),'#8fd0f0',0,16,0),mesh(G.cyl(10,14,60,16),'#d9d3c4',0,46,0),mesh(G.cyl(30,24,8,24),'#d9d3c4',0,78,0),
  mesh(G.cyl(4,8,46,10),glass('#bfe8ff',.7),0,104,0),...Array.from({length:8},(_,i)=>mesh(G.sphere(4),glass('#bfe8ff',.8),Math.sin(i*.8)*34,40+(i%3)*14,Math.cos(i*.8)*34))),
 statue:()=>group(mesh(G.box(54,50,54),'#d9d3c4',0,25,0),mesh(G.box(62,8,62),'#c9c2b2',0,52,0),mesh(G.capsule(16,44),'#8aa69a',0,92,0),mesh(G.sphere(14),'#8aa69a',0,136,0),rot(mesh(G.capsule(5,40),'#8aa69a',22,130,0),0,0,-.5),
  mesh(G.sphere(7),'#8aa69a',34,152,0)),
 park:()=>group(mesh(G.cyl(8,10,60),'#8a5a3c',0,30,0),mesh(G.sphere(46),'#6cc070',0,98,0),mesh(G.sphere(30),'#7fd083',-36,76,10),mesh(G.sphere(26),'#5fb565',34,70,-6),scl(mesh(G.sphere(22),'#7fd083',58,14,26),1,.7,1)),
 parasol:()=>group(mesh(G.cyl(62,62,4),'#f4e2b0',0,2,0),mesh(G.cyl(2.6,2.6,112,10),'#ffffff',0,58,0),mesh(G.cone(64,30,12),'#ff7a59',0,122,0),mesh(G.sphere(15),'#6fb8ff',36,17,22),mesh(G.box(46,4,20),'#8fd0b8',-28,6,24)),
 bag:()=>group(mesh(G.box(70,82,34),'#ff8fb0',-8,45,0),mesh(G.torus(18,3.5,PI),'#e85a84',-8,86,0),mesh(G.box(44,54,24),'#ffd84a',44,29,16),mesh(G.torus(12,3,PI),'#e0a800',44,56,16)),
 onsen:()=>{const g=group(mesh(G.cyl(60,60,8),'#8fe0e8',0,5,0),...steam(-18,30,0),...steam(18,24,10));for(let i=0;i<9;i++){const a=i/9*PI*2;g.add(scl(mesh(G.sphere(17,10,8),i%2?'#9a9488':'#b0aa9c',Math.sin(a)*62,8,Math.cos(a)*62),1,.75,1));}return g;},
 ferris:()=>{const g=group(rot(mesh(G.cyl(3,3,110,8),'#c9cfd9',-22,52,0),0,0,-.22),rot(mesh(G.cyl(3,3,110,8),'#c9cfd9',22,52,0),0,0,.22),mesh(G.torus(62,3.5),'#ff8fb0',0,104,0),mesh(G.sphere(8),'#ffffff',0,104,0));
  ['#ff5a6e','#ffd84a','#6fb8ff','#8fd0b8','#b9a4e6','#f2a07a','#ffffff','#6cc070'].forEach((c,i)=>{const a=i/8*PI*2;g.add(mesh(G.box(15,15,12),c,Math.cos(a)*62,104+Math.sin(a)*62,0));});return g;},
 zoo:()=>group(rot(mesh(G.capsule(22,40),'#f4c24a',0,62,0),0,0,PI/2),...[[-26,-12],[-26,12],[26,-12],[26,12]].map(([x,z])=>mesh(G.capsule(5,40),'#f4c24a',x,24,z)),rot(mesh(G.capsule(8,70),'#f4c24a',30,116,0),0,0,-.35),
  scl(mesh(G.sphere(14),'#f4c24a',46,158,0),1.3,1,1),mesh(G.sphere(3),'#2a2f3c',54,164,10),...[0,1].map(i=>mesh(G.cyl(2,2,10,6),'#8a5a3c',40+i*8,174,0)),
  ...[[-10,70,22],[12,60,22],[24,96,8],[-20,58,-20],[34,128,8]].map(([x,y,z])=>flat(6,'#b0702a',x,y,z,1,1,.4))),
 aquarium:()=>group(mesh(G.box(150,110,40),glass('#8fd0f0',.55),0,55,0),mesh(G.box(156,8,46),'#5b6f8a',0,4,0),...[[-30,70,'#ff8a3d'],[30,44,'#ffd040'],[10,88,'#ff5a8a']].map(([x,y,c])=>group(
  flat(14,c,x,y,0,1.5,1,.6),rot(mesh(G.cone(10,16,3),c,x-24,y,0),0,0,PI/2))),...[0,1,2].map(i=>mesh(G.sphere(3+i),glass('#ffffff',.8),-50+i*8,40+i*22,10))),
 concert:()=>group(mesh(G.box(150,16,60),'#3a3f4b',0,8,0),mesh(G.cyl(2.4,2.4,90,8),'#c9cfd9',0,61,10),flat(9,'#3a3f4b',0,110,10,1,1.3,1),
  ...[[-50,100],[46,130],[-20,150]].map(([x,y])=>group(mesh(G.sphere(10),'#5b5fd0',x,y,0),mesh(G.box(3,46,3),'#5b5fd0',x+9,y+23,0),mesh(G.box(14,6,3),'#5b5fd0',x+16,y+44,0)))),
 stadium:()=>group(mesh(G.box(160,4,90),'#5fb565',0,2,0),...[-56,56].map(x=>mesh(G.cyl(2.5,2.5,60,8),'#ffffff',x,32,-36)),mesh(G.box(116,4,4),'#ffffff',0,62,-36),mesh(G.sphere(22),'#ffffff',0,26,10),
  ...[[0,46,18],[16,30,26],[-16,30,26],[0,22,30]].map(([x,y,z])=>mesh(G.sphere(6),'#2a2f3c',x,y,z))),
 ski:()=>group(flat(70,'#ffffff',0,0,0,1.2,.5,1),...[-12,12].map(x=>rot(mesh(G.box(10,3,150),'#e8323f',x,40,0),.9,0,x*.02)),...[-30,30].map(x=>rot(mesh(G.cyl(2,2,120,6),'#3a3f4b',x,70,0),.2,0,x*-.01))),
 fireworks:()=>{const g=group(mesh(G.cyl(4,4,40,6),'#8a5a3c',0,20,0));[['#ff5a6e',-30,140],['#ffd84a',30,120],['#6fb8ff',0,170]].forEach(([c,x,y])=>{for(let i=0;i<10;i++){const a=i/10*PI*2;
  g.add(mesh(G.sphere(4.5),c,x+Math.cos(a)*30,y+Math.sin(a)*30,0,{emissive:c,emissiveIntensity:.8}));}});return g;},
 skyline:()=>{const g=group(mesh(G.box(190,6,80),'#3a4258',0,3,0));[[-70,90,40],[-36,150,34],[0,110,40],[34,180,30],[70,120,40]].forEach(([x,h,w])=>{g.add(mesh(G.box(w,h,40),'#4a5470',x,h/2,-6));
  for(let y=18;y<h-8;y+=20)for(let c=-1;c<=1;c+=2)g.add(mesh(G.box(7,9,2),'#ffe68a',x+c*w/4,y,15));});g.add(mesh(G.cyl(1.4,1.4,30,6),'#c9cfd9',34,195,-6),mesh(G.sphere(4),'#ff5a6e',34,210,-6,{emissive:'#ff5a6e',emissiveIntensity:1}));return g;},
 camera:()=>group(mesh(G.box(84,56,34),'#3a3f4b',0,60,0),rot(mesh(G.cyl(22,24,26,24),'#2a2f3c',0,60,26),PI/2),rot(mesh(G.cyl(15,15,4,24),'#8fb7ea',0,60,40),PI/2),mesh(G.box(22,12,20),'#3a3f4b',-24,94,0),
  mesh(G.box(14,8,4),'#ffffff',26,78,18),mesh(G.cyl(4,4,10,10),'#ff5a6e',30,92,0)),
 hotel:()=>{const g=group(mesh(G.box(96,124,60),'#f6dcc8',0,62,0),mesh(G.box(104,9,68),'#c96f5a',0,128,0),mesh(G.box(22,30,3),'#8a5a3c',0,15,31),mesh(G.box(44,12,3),'#ffd84a',0,116,31));
  for(let r=0;r<3;r++)for(let c=-1;c<=1;c++)g.add(mesh(G.box(16,17,3),'#8fd0f0',c*29,48+r*24,31));return g;},
 house:()=>group(mesh(G.box(84,62,70),'#fff1d6',0,31,0),rot(mesh(G.cone(72,48,4),'#e8604a',0,86,0),0,PI/4),mesh(G.box(20,34,3),'#8a5a3c',0,17,36),mesh(G.box(18,18,3),'#8fd0f0',26,36,36),mesh(G.box(14,30,14),'#c96f5a',24,96,-10)),
 pin:()=>group(mesh(G.sphere(28),'#ff5a4a',0,112,0),rot(mesh(G.cone(21,72),'#ff5a4a',0,52,0),PI),mesh(G.sphere(11),'#ffffff',0,114,21)),
 plane:()=>group(rot(mesh(G.capsule(14,74),'#ffffff'),0,0,PI/2),mesh(G.box(28,3.5,128),'#5b8def',4,0,0),mesh(G.box(18,24,3.5),'#5b8def',-44,13,0),mesh(G.box(14,3,46),'#5b8def',-44,2,0),mesh(G.sphere(8),'#8fd0f0',40,6,0)),
 train:()=>{const g=group(mesh(G.box(124,42,38),'#5bbf8a',0,31,0),mesh(G.box(124,6,40),'#ffffff',0,55,0),mesh(G.box(20,20,34),'#8fd0f0',52,36,0));for(const x of [-40,-10,20])g.add(mesh(G.box(20,16,40),'#8fd0f0',x,38,0));
  for(const x of [-40,40])for(const z of [-17,17])g.add(rot(mesh(G.cyl(9,9,6),'#3a3f4b',x,9,z),PI/2));return g;},
 /* 공항 */
 airport:()=>group(mesh(G.box(170,44,70),'#e8eef4',0,22,0),mesh(G.box(170,6,74),'#5b8def',0,47,0),...Array.from({length:7},(_,i)=>mesh(G.box(18,24,2),'#8fd0f0',-66+i*22,24,36)),mesh(G.cyl(9,12,120,12),'#c9cfd9',70,60,-20),
  mesh(G.cyl(22,16,24,12),'#8fd0f0',70,128,-20),mesh(G.cyl(24,24,5,12),'#5b6f8a',70,142,-20),(()=>{const p=PROPS.plane();p.position.set(-40,96,24);p.scale.setScalar(.6);p.rotation.set(0,.6,.25);return p;})()),
 suitcase:()=>group(mesh(G.box(66,90,32),'#ff8a5c',-20,50,0),mesh(G.box(66,4,33),'#e06a3c',-20,62,0),mesh(G.box(66,4,33),'#e06a3c',-20,36,0),rot(mesh(G.torus(12,3,PI),'#3a3f4b',-20,98,0),0,0,0),
  ...[-44,4].map(x=>mesh(G.cyl(5,5,6,10),'#3a3f4b',x,4,12)),mesh(G.box(44,60,26),'#5b8def',40,34,10),mesh(G.cyl(2,2,40,6),'#c9cfd9',30,84,10),mesh(G.cyl(2,2,40,6),'#c9cfd9',50,84,10),mesh(G.box(24,4,4),'#3a3f4b',40,104,10),
  mesh(G.box(16,10,2),'#ffd84a',-20,50,17)),
 /* 나라별 음식 */
 takoyaki:()=>{const g=group(scl(mesh(G.cyl(60,50,16,6),'#c9945a',0,8,0),1,1,.55));[[-30,0],[0,0],[30,0],[-15,-12],[15,-12],[-15,12],[15,12]].forEach(([x,z])=>g.add(mesh(G.sphere(13),'#d98b3a',x,24,z),flat(9,'#5a2e1a',x,34,z,1,.3,1),flat(4,'#6fbf73',x+3,37,z-2,1,.3,1)));return g;},
 onigiri:()=>group(mesh(G.box(130,6,60),'#c9945a',0,3,0),...[-34,34].map(x=>group(rot(mesh(G.cone(30,52,3),'#ffffff',x,34,0),0,PI/2,0),mesh(G.box(26,22,30),'#203a2a',x,18,10)))),
 tteokbokki:()=>{const g=group(mesh(G.cyl(56,48,12,28),'#3a3f4b',0,6,0),mesh(G.cyl(52,52,3,28),'#e8323f',0,14,0));for(let i=0;i<10;i++)g.add(rot(mesh(G.capsule(6,22),'#ffe8e0',Math.sin(i*1.7)*30,20,Math.cos(i*1.7)*26),PI/2,i,0));
  g.add(flat(12,'#ffffff',18,22,-10,1,.6,1),mesh(G.sphere(6),'#ffb400',18,26,-10),...[0,1,2].map(i=>rot(mesh(G.box(30,3,8),'#ffe08a',-20+i*10,22,20),0,i,0)));return g;},
 kimbap:()=>{const g=group(mesh(G.box(130,6,60),'#ffffff',0,3,0));for(let i=0;i<6;i++){const x=-50+i*20;g.add(rot(mesh(G.cyl(13,13,12,20),'#203a2a',x,19,0),0,0,PI/2),rot(mesh(G.cyl(11,11,13,20),'#ffffff',x,19,0),0,0,PI/2),
  ...[['#ffd040',-3,3],['#e8323f',3,-3],['#6fbf73',0,4],['#ff8a3d',-4,-3]].map(([c,y,z])=>rot(mesh(G.cyl(2.6,2.6,14,8),c,x,19+y,z),0,0,PI/2)));}return g;},
 pekingduck:()=>plate(flat(30,'#a8501f',0,22,0,1.4,.65,1),rot(mesh(G.capsule(6,22),'#a8501f',44,26,0),0,0,-.6),...[[-30,30],[-10,34],[10,34]].map(([x,z])=>flat(12,'#fff4e0',x,10,z,1,.15,1)),mesh(G.box(20,4,3),'#6fbf73',30,12,-30)),
 hotpot:()=>{const g=group(mesh(G.cyl(66,60,34,32),'#c9cfd9',0,17,0),mesh(G.cyl(62,62,3,32),'#d9352f',-16,34,0),mesh(G.cyl(28,28,3.4,32),'#f4ead2',22,34,0),mesh(G.box(4,30,124),'#c9cfd9',0,26,0),...steam(-20,46,0),...steam(20,40,0));
  [[-34,-14],[-24,16],[30,-10]].forEach(([x,z],i)=>g.add(flat(8,i%2?'#6fbf73':'#ffb0a0',x,37,z,1.3,.3,1)));return g;},
 bubbletea:()=>group(mesh(G.cyl(28,22,96,24),glass('#e8c9a0',.85),0,48,0),flat(28,'#ffffff',0,98,0,1,.2,1),...Array.from({length:12},(_,i)=>mesh(G.sphere(5),'#3a2418',Math.sin(i*1.4)*14,8+(i%3)*7,Math.cos(i*1.4)*14)),
  rot(mesh(G.cyl(4,4,70,10),'#ff5a8a',8,116,0),0,0,-.2)),
 padthai:()=>plate(...Array.from({length:12},(_,i)=>rot(mesh(G.torus(10+i%3*6,2.6),'#e8b46a',(i%4-1.5)*10,12+Math.floor(i/4)*5,(i%3-1)*8),PI/2+(i%3)*.3,0,i)),...[[-14,6],[12,-10]].map(([x,z])=>rot(mesh(G.torus(8,3.5,PI*1.3),'#ff7a59',x,28,z),PI/2,0,x)),
  rot(mesh(half(10,8),'#a8e05a',30,20,20),0,0,PI/2),...[0,1,2,3].map(i=>mesh(G.box(3,3,14),'#f4f0d0',-30+i*6,24,-24))),
 mangorice:()=>plate(flat(26,'#ffffff',-16,14,0,1.1,.55,1),...[0,1,2,3].map(i=>rot(flat(12,'#ffc23a',18,16,-18+i*12,1.6,.5,.9),0,.4,0)),flat(10,'#f4ead2',-16,26,0,1.2,.3,1)),
 banhmi:()=>group(mesh(G.box(130,6,60),'#c9945a',0,3,0),rot(scl(mesh(G.capsule(20,80),'#e0a050',0,26,0),1,.8,1),0,0,PI/2),mesh(G.box(80,4,26),'#6fbf73',0,32,8),mesh(G.box(76,4,22),'#e8423a',0,34,4),mesh(G.box(70,4,20),'#ffb0a0',0,30,10)),
 naan:()=>plate(flat(30,'#d98b2a',20,14,6,1,.3,1),rot(flat(36,'#f0d090',-24,14,-4,1,.12,1.4),0,.3,0),...[[-30,-10],[-18,6],[-34,10]].map(([x,z])=>flat(4,'#a0602a',x,18,z,1,.4,1))),
 satay:()=>group(mesh(G.box(130,6,60),'#ffffff',0,3,0),...[-24,0,24].map(z=>group(rot(mesh(G.cyl(1.6,1.6,130,6),'#c9945a',0,14,z),0,0,PI/2),...[-30,-10,10,30].map(x=>mesh(G.box(16,12,12),'#a0501f',x,14,z))))),
 friedrice:()=>plate(flat(36,'#e8b46a',0,16,0,1.2,.5,1),...Array.from({length:12},(_,i)=>mesh(G.box(4,4,4),['#6fbf73','#ff8a3d','#e8423a'][i%3],Math.sin(i*2)*26,22+(i%2)*3,Math.cos(i*2)*22)),flat(14,'#ffffff',0,32,0,1,.3,1),mesh(G.sphere(6),'#ffb400',0,35,0)),
 baklava:()=>{const g=group(mesh(G.box(120,6,70),'#c9a46a',0,3,0));for(let i=0;i<6;i++)g.add(rot(mesh(G.box(24,16,24),'#e0a050',-38+(i%3)*38,14,-14+Math.floor(i/3)*28),0,PI/4,0),mesh(G.sphere(4),'#6fbf73',-38+(i%3)*38,24,-14+Math.floor(i/3)*28));return g;},
 tea:()=>group(mesh(G.cyl(34,34,4,20),'#c9a46a',0,2,0),mesh(G.cyl(16,12,26,16),glass('#c84a2a',.85),0,20,0),mesh(G.cyl(11,16,22,16),glass('#c84a2a',.85),0,44,0),mesh(G.torus(16,1.5),'#f0c75e',0,56,0),rot(mesh(G.torus(12,4),'#ffffff',-46,10,10),PI/2),
  mesh(G.cyl(18,22,40,16),'#c84a4a',50,24,-10),mesh(G.cyl(10,16,24,16),'#c84a4a',50,56,-10)),
 espresso:()=>group(mesh(G.cyl(30,32,4),'#ffffff',0,2,0),mesh(G.cyl(18,14,30,20),'#ffffff',0,20,0),mesh(G.cyl(16,16,2,20),'#5a2e1a',0,35,0),mesh(G.torus(8,3),'#ffffff',22,22,0),...steam(-4,50,0),mesh(G.box(10,4,30),'#e0a050',-40,4,20)),
 macaron:()=>group(mesh(G.box(130,6,60),'#ffffff',0,3,0),...['#ffb0c8','#a8e0b0','#c8b0ff','#ffd890','#a8d0ff'].map((c,i)=>group(flat(14,c,-48+i*24,14,0,1,.45,1),flat(12,'#fff4e0',-48+i*24,19,0,1,.25,1),flat(14,c,-48+i*24,24,0,1,.45,1)))),
 churros:()=>group(rot(mesh(G.cyl(26,20,46,16),'#ff5a6e',-24,23,0),0,0,0),...[-8,0,8].map((x,i)=>rot(mesh(G.cyl(5,5,96,8),'#d98b3a',-24+x,62,0),0,0,(i-1)*.15)),mesh(G.cyl(22,18,30,20),'#7a3b22',40,15,10),mesh(G.cyl(20,20,2,20),'#3a1d10',40,30,10)),
 nata:()=>{const g=group(mesh(G.box(120,6,60),'#ffffff',0,3,0));[-36,0,36].forEach(x=>g.add(mesh(G.cyl(18,14,16,20),'#e0a050',x,13,0),flat(15,'#ffd040',x,20,0,1,.2,1),flat(6,'#7a3b22',x+4,22,3,1,.2,1)));return g;},
 fondue:()=>group(mesh(G.cyl(30,24,10,16),'#3a3f4b',0,5,0),...[-1,1].map(s=>mesh(G.box(4,40,4),'#3a3f4b',s*24,26,0)),mesh(G.cyl(40,28,30,24),'#c2352a',0,58,0),flat(36,'#ffd860',0,72,0,1,.2,1),
  ...[0,1,2].map(i=>rot(mesh(G.cyl(1.4,1.4,90,6),'#c9cfd9',-40+i*40,100,20),.6,0,(i-1)*.3)),...[0,1,2].map(i=>mesh(G.box(10,10,10),'#e0a050',-60+i*60,136,46))),
 waffle:()=>{const g=group(mesh(G.cyl(56,50,6,32),'#ffffff',0,3,0),rot(mesh(G.box(80,12,80),'#e0a050',0,12,0),0,PI/4,0));for(let i=-2;i<=2;i++){g.add(rot(mesh(G.box(80,2,3),'#b0702a',0,19,0),0,PI/4+0,0),rot(mesh(G.box(3,2,80),'#b0702a',i*12,19,0),0,PI/4,0));}
  g.add(flat(14,'#ffffff',0,24,0,1,.5,1),mesh(G.sphere(6),'#e8323f',10,30,4),mesh(G.sphere(6),'#e8323f',-8,30,-6));return g;},
 cheese:()=>group(mesh(G.cyl(64,64,8,32),'#a8794f',0,4,0),rot(mesh(G.cyl(46,46,40,3,1,false,0,PI*1.6),'#ffd860',0,28,0),0,0,0),...[[10,30],[-20,24],[24,18]].map(([x,y])=>mesh(G.sphere(6),'#e8b830',x,y,30)),rot(mesh(G.box(6,4,60),'#c9cfd9',50,10,20),0,.6,0)),
 trdelnik:()=>group(mesh(G.cyl(44,44,6,20),'#c9945a',0,3,0),mesh(G.cyl(24,30,110,24),'#c8803a',0,61,0),...Array.from({length:10},(_,i)=>rot(mesh(G.torus(28-i*.6,2.2),'#a0602a',0,14+i*11,0),PI/2,0,0)),mesh(G.sphere(26),'#ffffff',0,120,0),mesh(G.sphere(7),'#e8323f',0,146,0)),
 goulash:()=>group(mesh(G.cyl(46,40,40,28),'#3a3f4b',0,20,0),...[-1,1].map(s=>rot(mesh(G.torus(9,3),'#3a3f4b',s*48,36,0),PI/2)),mesh(G.cyl(42,42,3,28),'#b0401f',0,40,0),...[[-14,6],[10,-12],[16,12]].map(([x,z])=>mesh(G.box(10,8,10),'#7a3b22',x,42,z)),...steam(-6,56,0)),
 donut:()=>group(mesh(G.box(130,6,60),'#ffd0e0',0,3,0),...[[-34,'#ff8fb0'],[34,'#7a4a2a']].map(([x,c])=>group(rot(mesh(G.torus(18,10),'#e0a050',x,14,0),PI/2),rot(mesh(G.torus(18,7,PI*2),c,x,18,0),PI/2),...[0,1,2,3,4].map(i=>mesh(G.box(5,2,2),['#ffd040','#6fb8ff','#ffffff','#6fbf73','#ff5a6e'][i],x+Math.cos(i*1.3)*18,25,Math.sin(i*1.3)*18))))),
 hotdog:()=>group(mesh(G.box(130,6,60),'#ffffff',0,3,0),rot(scl(mesh(G.capsule(16,70),'#e0a050',0,20,0),1,.6,1.3),0,0,PI/2),rot(mesh(G.capsule(8,86),'#c2453a',0,28,0),0,0,PI/2),...Array.from({length:8},(_,i)=>mesh(G.box(8,3,3),'#ffd040',-36+i*10,37,(i%2)*4-2))),
 poutine:()=>group(mesh(G.box(90,40,60),'#ffffff',0,20,0),mesh(G.box(92,6,62),'#e8323f',0,8,0),...Array.from({length:9},(_,i)=>rot(mesh(G.box(7,7,40),'#ffd040',-32+i*8,46,0),0,i*.4,0)),flat(34,'#7a4a2a',0,52,0,1.3,.2,1),...[[-10,4],[14,-6],[0,12]].map(([x,z])=>flat(8,'#fff4e0',x,56,z,1,.5,1))),
 meatpie:()=>plate(mesh(G.cyl(34,28,22,28),'#d98b3a',0,18,0),flat(34,'#e0a050',0,30,0,1,.35,1),rot(mesh(G.box(3,2,20),'#a0602a',-6,36,0),0,.6,0),rot(mesh(G.box(3,2,20),'#a0602a',6,36,0),0,-.6,0),flat(6,'#e8323f',0,40,0,1.4,.4,1)),
 tapas:()=>group(mesh(G.box(150,6,70),'#c9945a',0,3,0),...[[-48,'#e0a050'],[0,'#e8423a'],[48,'#6fbf73']].map(([x,c])=>group(mesh(G.cyl(20,18,6,20),'#ffffff',x,9,0),flat(14,c,x,16,0,1,.6,1),mesh(G.cyl(1.2,1.2,30,6),'#c9945a',x,30,0)))),
 chocolate:()=>{const g=group(mesh(G.box(110,8,60),'#5a2e1a',0,4,0));for(let i=0;i<4;i++)for(let j=0;j<2;j++)g.add(mesh(G.box(24,8,24),'#7a3b22',-39+i*26,12,-13+j*26));g.add(rot(mesh(G.box(70,3,62),'#d4b06a',30,14,0),0,0,.18));return g;},
 /* 나라별 볼거리 */
 bigben:()=>group(mesh(G.box(40,150,40),'#c9a46a',0,75,0),...[0,1].map(i=>mesh(G.cyl(14,14,2,24),'#fff4d6',0,162,21-i*42)),mesh(G.box(46,30,46),'#b8945a',0,165,0),mesh(G.cone(30,56,4),'#4a5a6a',0,208,0),rot(mesh(G.box(2,10,2),'#2a2f3c',0,166,23),0,0,.8),mesh(G.box(150,60,30),'#c9a46a',-80,30,-10)),
 colosseum:()=>{const g=group();for(let k=0;k<3;k++)for(let i=0;i<14;i++){const a=PI*.15+i/13*PI*1.25;g.add(mesh(G.box(16,30,10),'#d9b88a',Math.cos(a)*70,16+k*32,Math.sin(a)*48));if(k<2)g.add(mesh(G.box(9,18,11),'#7a5a3a',Math.cos(a)*70,14+k*32,Math.sin(a)*48));}g.add(scl(mesh(G.cyl(60,60,6,28),'#c9a46a',0,3,0),1,1,.7));return g;},
 pisa:()=>rot(group(mesh(G.cyl(26,28,170,20),'#f4ecd8',0,85,0),...[0,1,2,3,4,5].map(i=>mesh(G.cyl(29,29,4,20),'#e0d4b8',0,26+i*26,0)),mesh(G.cyl(20,22,24,20),'#f4ecd8',0,182,0)),0,0,.09),
 arc:()=>group(mesh(G.box(46,140,50),'#e8dcc0',-46,70,0),mesh(G.box(46,140,50),'#e8dcc0',46,70,0),mesh(G.box(140,40,54),'#e8dcc0',0,160,0),mesh(G.box(144,8,58),'#d4c4a0',0,182,0),rot(mesh(G.torus(23,6,PI),'#d4c4a0',0,112,26),0,0,0)),
 windmill:()=>group(mesh(G.cyl(26,40,110,8),'#c84a3a',0,55,0),mesh(G.cone(32,40,8),'#5a4a3a',0,128,0),mesh(G.box(16,24,3),'#3a3f4b',0,20,38),...[0,1,2,3].map(i=>rot(group(mesh(G.box(10,90,3),'#f4ecd8',0,45,0)),0,0,i*PI/2+.4)).map(b=>{b.position.set(0,118,40);return b;}),mesh(G.cyl(6,6,10,10),'#3a3f4b',0,118,36)),
 sagrada:()=>group(mesh(G.box(130,70,60),'#d9c49a',0,35,0),...[-48,-16,16,48].map((x,i)=>group(mesh(G.cyl(10,14,120+(i%3)*20,10),'#d9c49a',x,100+(i%3)*10,0),mesh(G.cone(12,40,10),'#c9b48a',x,180+(i%3)*20,0),mesh(G.sphere(6),'#e8423a',x,202+(i%3)*20,0))),mesh(G.box(40,50,3),'#8a5a3c',0,25,31)),
 parthenon:()=>{const g=group(mesh(G.box(170,10,90),'#e8e0cc',0,5,0),mesh(G.box(160,8,80),'#e8e0cc',0,13,0));for(let i=0;i<8;i++){g.add(mesh(G.cyl(6,7,70,12),'#f4ecd8',-70+i*20,52,34),mesh(G.cyl(6,7,70,12),'#f4ecd8',-70+i*20,52,-34));}
  g.add(mesh(G.box(166,12,86),'#e8e0cc',0,93,0),scl(rot(mesh(G.cone(86,26,4),'#e0d6c0',0,112,0),0,PI/4),1,1,.6));return g;},
 taj:()=>group(mesh(G.box(130,14,130),'#f4f0ea',0,7,0),mesh(G.box(86,70,86),'#ffffff',0,49,0),mesh(G.sphere(40,24,16),'#ffffff',0,110,0),mesh(G.cone(8,30,12),'#ffffff',0,158,0),...[[-56,-56],[56,-56],[-56,56],[56,56]].map(([x,z])=>group(mesh(G.cyl(6,7,110,10),'#ffffff',x,69,z),mesh(G.sphere(9),'#ffffff',x,128,z))),
  mesh(G.box(30,46,3),'#8fb7ea',0,40,44)),
 mosque:()=>group(mesh(G.box(120,50,90),'#e8e0cc',0,25,0),mesh(G.sphere(46,24,16,0,PI*2,0,PI/2),'#8fa8c8',0,50,0),...[[-40,0],[40,0]].map(([x,z])=>mesh(G.sphere(22,20,12,0,PI*2,0,PI/2),'#8fa8c8',x,50,z+30)),
  ...[-74,74].map(x=>group(mesh(G.cyl(7,8,150,12),'#f4ecd8',x,75,-30),mesh(G.cone(9,30,12),'#8fa8c8',x,165,-30))),mesh(G.box(3,16,3),'#f0c75e',0,104,0)),
 burj:()=>group(mesh(G.cyl(30,40,60,6),'#c9d8e8',0,30,0),mesh(G.cyl(20,30,70,6),'#c9d8e8',0,95,0),mesh(G.cyl(12,20,60,6),'#d8e4f0',0,160,0),mesh(G.cyl(4,12,50,6),'#d8e4f0',0,215,0),mesh(G.cyl(1,4,40,6),'#c9cfd9',0,260,0),
  ...[[-50,40,40],[50,30,60],[-30,-40,50]].map(([x,z,h])=>mesh(G.box(24,h,24),'#9fb4c8',x,h/2,z))),
 onion:()=>group(mesh(G.box(110,50,70),'#e8423a',0,25,0),...[[0,0,32,'#4fae7a'],[-40,10,22,'#f0c75e'],[40,10,22,'#5b8def'],[-20,-24,18,'#e8423a'],[24,-24,18,'#6fbfa0']].map(([x,z,r,c])=>group(
  mesh(G.cyl(r*.55,r*.6,70,12),'#f4ecd8',x,85,z),mesh(G.sphere(r),c,x,120+r*.3,z),mesh(G.cone(r*.4,r*.9,12),c,x,125+r*1.1,z)))),
 liberty:()=>group(mesh(G.box(60,60,60),'#c9c2b2',0,30,0),mesh(G.cyl(22,30,90,12),'#7fc4a8',0,105,0),mesh(G.sphere(16),'#7fc4a8',0,160,0),...[0,1,2,3,4].map(i=>rot(mesh(G.cone(3,16,6),'#7fc4a8',Math.sin(i-2)*10,174,0),0,0,(i-2)*-.35)),
  rot(mesh(G.cyl(5,5,60,8),'#7fc4a8',20,180,0),0,0,-.2),mesh(G.cone(8,14,10),'#f0c75e',28,214,0,{emissive:'#ffb400',emissiveIntensity:.6}),mesh(G.box(16,22,6),'#7fc4a8',-20,140,14)),
 goldengate:()=>group(mesh(G.box(220,4,70),'#8fd0f0',0,1,0),mesh(G.box(220,8,24),'#c8452a',0,60,0),...[-60,60].map(x=>group(mesh(G.box(10,150,10),'#c8452a',x-8,75,0),mesh(G.box(10,150,10),'#c8452a',x+8,75,0),mesh(G.box(28,8,10),'#c8452a',x,130,0),mesh(G.box(28,8,10),'#c8452a',x,95,0))),
  rot(mesh(G.torus(60,2,PI),'#c8452a',0,150,0),0,0,PI),...[-1,1].map(s=>rot(mesh(G.cyl(1.6,1.6,70,6),'#c8452a',s*92,105,0),0,0,s*.75))),
 opera:()=>group(mesh(G.box(170,16,80),'#e8e0cc',0,8,0),...[[-50,70],[-14,90],[22,70],[52,50]].map(([x,h],i)=>rot(scl(mesh(G.sphere(40,20,12,0,PI,0,PI/2),'#ffffff',x,16,0),.8,h/40,1),0,PI/2,0)),mesh(G.box(180,4,90),'#8fd0f0',0,0,10)),
 pyramid:()=>group(mesh(G.box(200,4,140),'#f0d8a0',0,2,0),rot(mesh(G.cone(80,110,4),'#e8c27a',-20,55,-10),0,PI/4,0),rot(mesh(G.cone(46,64,4),'#e0b86a',62,32,20),0,PI/4,0)),
 christ:()=>group(mesh(G.cone(70,60,8),'#6cc070',0,30,0),mesh(G.box(24,26,24),'#e8e4da',0,72,0),mesh(G.capsule(12,60),'#f4f0ea',0,120,0),mesh(G.box(130,10,10),'#f4f0ea',0,140,0),mesh(G.sphere(10),'#f4f0ea',0,164,0)),
 marina:()=>group(...[-50,0,50].map(x=>rot(mesh(G.box(30,150,24),'#d8e4f0',x,75,0),0,0,x*.0012)),mesh(G.box(170,10,40),'#5b6f8a',0,156,0),scl(mesh(G.sphere(30,20,10,0,PI*2,0,PI/2),'#c9cfd9',70,156,0),1.2,.3,1),mesh(G.box(220,4,80),'#8fd0f0',0,1,40)),
 petronas:()=>group(...[-30,30].map(x=>group(mesh(G.cyl(18,22,170,8),'#c9cfd9',x,85,0),mesh(G.cyl(12,16,30,8),'#d8e0e8',x,185,0),mesh(G.cyl(1.6,5,50,6),'#c9cfd9',x,220,0))),mesh(G.box(40,6,8),'#c9cfd9',0,120,0)),
 hanok:()=>group(mesh(G.box(150,14,70),'#c9b28a',0,7,0),mesh(G.box(120,46,50),'#c84a3a',0,37,0),...[-46,-16,16,46].map(x=>mesh(G.cyl(4,4,46,8),'#8a3a2a',x,37,26)),scl(rot(mesh(G.cone(96,34,4),'#4a5568',0,78,0),0,PI/4,0),1.15,1,.75),
  mesh(G.box(150,4,74),'#3a4558',0,62,0),...[-1,1].map(s=>rot(mesh(G.box(12,4,6),'#3a4558',s*84,66,0),0,0,s*-.4)),mesh(G.box(28,14,3),'#2a3a5a',0,50,26)),
 japancastle:()=>group(mesh(G.box(140,40,100),'#9a9488',0,20,0),...[0,1,2,3].map(i=>{const w=100-i*20;return group(mesh(G.box(w,26,w*.75),'#ffffff',0,52+i*34,0),scl(rot(mesh(G.cone(w*.8,16,4),'#3a5a6a',0,72+i*34,0),0,PI/4,0),1.2,1,.95));}),
  ...[-1,1].map(s=>rot(mesh(G.cone(4,14,8),'#f0c75e',s*14,192,0),0,0,s*.6))),
 greatwall:()=>{const g=group(mesh(G.cone(90,60,7),'#7fae6a',-30,30,-20),mesh(G.cone(70,50,7),'#8fbe7a',60,25,10));const pts=[[-90,30,30],[-50,46,10],[-10,58,-10],[30,52,0],[70,40,20]];
  for(let i=0;i<pts.length-1;i++){const [x1,y1,z1]=pts[i],[x2,y2,z2]=pts[i+1],dx=x2-x1,dz=z2-z1,dy=y2-y1;g.add(rot(mesh(G.box(Math.hypot(dx,dz)+4,14,14),'#c9b89a',(x1+x2)/2,(y1+y2)/2,(z1+z2)/2),0,-Math.atan2(dz,dx),Math.atan2(dy,Math.hypot(dx,dz))));}
  [[-50,46,10],[30,52,0]].forEach(([x,y,z])=>g.add(mesh(G.box(22,26,22),'#b8a88a',x,y+12,z)));return g;},
 taipei101:()=>{const g=group(mesh(G.box(46,40,46),'#7fa8a0',0,20,0));for(let i=0;i<8;i++)g.add(mesh(G.cyl(26,18,22,4),'#8fc0b8',0,52+i*20,0),mesh(G.box(40,3,40),'#5a8a80',0,41+i*20,0));g.add(mesh(G.cyl(1.6,5,40,6),'#c9cfd9',0,232,0));return g;},
 stupa:()=>group(mesh(G.box(130,12,130),'#e8dcc0',0,6,0),mesh(G.box(100,14,100),'#e8dcc0',0,19,0),mesh(G.sphere(40,24,16,0,PI*2,0,PI/2),'#f0c75e',0,26,0,{metalness:.3,roughness:.4}),mesh(G.cone(20,90,16),'#f0c75e',0,108,0,{metalness:.3,roughness:.4}),
  ...[[-56,-56],[56,-56],[-56,56],[56,56]].map(([x,z])=>mesh(G.cone(10,50,12),'#f0c75e',x,51,z,{metalness:.3,roughness:.4}))),
 chalet:()=>group(mesh(G.box(100,60,70),'#a0602a',0,30,0),scl(rot(mesh(G.cone(80,44,4),'#5a3a2a',0,82,0),0,PI/4,0),1,1,.95),mesh(G.box(104,6,10),'#f4ecd8',0,40,36),...[-26,26].map(x=>mesh(G.box(20,18,2),'#8fd0f0',x,48,36)),
  ...[-36,-12,12,36].map(x=>mesh(G.sphere(6),'#ff5a6e',x,38,40)),mesh(G.cone(56,90,7),'#e8eef4',90,45,-50),mesh(G.cone(22,36,7),'#ffffff',90,72,-50)),
 clocktower:()=>group(mesh(G.box(54,170,54),'#a89880',0,85,0),mesh(G.cone(40,60,4),'#3a4a3a',0,200,0),...[-1,1].map(s=>mesh(G.cone(8,30,6),'#3a4a3a',s*24,186,24)),mesh(G.cyl(22,22,3,28),'#3a5aa0',0,110,28),mesh(G.cyl(16,16,4,28),'#f0c75e',0,110,29),
  rot(mesh(G.box(2,16,2),'#2a2f3c',0,114,31),0,0,.6),mesh(G.box(100,70,40),'#c8b8a0',-60,35,-10))
};
export const PROP_KEYS=Object.keys(PROPS);
export function buildProp(key){return (PROPS[key]||PROPS.pin)();}

/* ---------- 장면 ---------- */
function lights(scene){scene.add(new THREE.HemisphereLight('#ffffff','#b9c6d2',1.55));const sun=new THREE.DirectionalLight('#fff6e8',1.9);sun.position.set(-260,620,380);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
 const c=sun.shadow.camera;c.left=-460;c.right=460;c.top=460;c.bottom=-460;c.near=10;c.far=1700;scene.add(sun);return sun;}
function freeTree(o){o.traverse(n=>{n.geometry?.dispose();if(n.material){n.material.map?.dispose();n.material.dispose();}});}

export function createStage(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene(),bg=new THREE.Color('#dfe9ee');scene.background=bg;scene.fog=new THREE.Fog(bg,1700,2600);
 const camera=new THREE.PerspectiveCamera(36,W/H,10,6000),sun=lights(scene),hemi=scene.children.find(o=>o.isHemisphereLight);
 // 밤에는 일행·소품 주변만 따뜻하게 비추는 가로등 같은 빛
 const lamp=new THREE.PointLight('#ffd9a0',0,900,1.2);lamp.position.set(0,180,40);scene.add(lamp);
 const GLOW=new Set(['8fd0f0','8fb7ea','6f8fc0','ffd84a','ffe68a','bfe8ff']);let glowMats=[];
 const col=(a,b,t)=>new THREE.Color(a).lerp(new THREE.Color(b),Math.max(0,Math.min(1,t)));
 const shadow=rot(new THREE.Mesh(new THREE.PlaneGeometry(1500,1500),new THREE.ShadowMaterial({opacity:.24})),-PI/2);shadow.position.y=3;shadow.receiveShadow=true;scene.add(shadow);
 const tileGeo=new THREE.PlaneGeometry(1,1),boxGeo=G.box(1,1,1),discGeo=G.cyl(1,1,1,28);
 const tiles=new Map(),tileGroup=new THREE.Group(),routeGroup=new THREE.Group(),dynamic=new THREE.Group();scene.add(tileGroup,routeGroup,dynamic);
 const vehicles={plane:buildProp('plane'),train:buildProp('train')};for(const v of Object.values(vehicles)){v.visible=false;scene.add(v);}
 let chars=[],props=[],legMeshes=[],stopMeshes=[],heads=[];
 const routeMat={walk:mat('#ff6b4a',{transparent:true}),fly:mat('#5b8def',{transparent:true}),white:mat('#ffffff',{transparent:true})};
 const stopMat=[mat('#ffffff'),mat('#f6c945'),mat('#f6c945')];
 function setScene(tl,members){
  for(const o of [...dynamic.children])freeTree(o);dynamic.clear();routeGroup.clear();
  const kinds=['',...new Set(tl.stops.map(s=>s.costume).filter(Boolean))];
  chars=members.map(m=>{const holder=new THREE.Group(),variants={};for(const k of kinds){const c=buildAvatar(m.av,k);c.visible=false;variants[k]=c;holder.add(c);}holder.userData.variants=variants;holder.userData.char=variants[''];dynamic.add(holder);return holder;});
  props=tl.stops.map(s=>{const p=buildProp(s.react.key);dynamic.add(p);return p;});
  // 창문·전구는 밤에 불이 켜진 것처럼 빛나게
  glowMats=[];for(const p of props)p.traverse(o=>{if(o.material?.color&&GLOW.has(o.material.color.getHexString()))glowMats.push(o.material);});
  stopMeshes=tl.stops.map(()=>{const d=new THREE.Mesh(discGeo,stopMat[0]);routeGroup.add(d);return d;});
  legMeshes=tl.stops.slice(1).map(()=>{const a=new THREE.Mesh(boxGeo,routeMat.white.clone()),b=new THREE.Mesh(boxGeo,routeMat.walk.clone());routeGroup.add(a,b);return [a,b];});}
 function render(f){
  // 시간대·날씨: sky={night 0~1, dusk 0~1, weather}
  const sk=f.sky||{},nt=sk.night||0,dk=sk.dusk||0,wx=sk.weather||'',grey=wx==='rain'||wx==='storm'?.55:wx==='cloud'||wx==='fog'?.35:wx==='snow'?.25:0;
  bg.copy(col('#dfe9ee','#f4c9a6',dk).lerp(new THREE.Color('#0d1730'),nt).lerp(new THREE.Color(wx==='snow'?'#e8eef4':'#9aa6b2'),grey*(1-nt*.7)));scene.fog.color.copy(bg);
  hemi.intensity=1.55*(1-.72*nt)*(1-grey*.3);hemi.color.copy(col('#ffffff','#ffc9a0',dk).lerp(new THREE.Color('#7f95d8'),nt));
  sun.intensity=1.9*(1-.85*nt)*(1-grey*.6);sun.color.copy(col('#fff6e8','#ff9a5a',dk*1.2).lerp(new THREE.Color('#9fb4ff'),nt));
  lamp.intensity=nt*2.2;for(const m of glowMats){m.emissive.copy(m.color);m.emissiveIntensity=nt*1.1;}
  const tileTint=col('#ffffff','#ffe2c4',dk*.45).lerp(new THREE.Color('#4a5878'),nt*.85).lerp(new THREE.Color('#c4cbd2'),grey*(1-nt));
  const d=f.dolly||1;camera.position.set(0,800*d,960*d);camera.lookAt(0,96,0);shadow.visible=!f.vehicle||f.vehicle.kind!=='plane'||f.vehicle.lift<.5;
  // 지도 타일
  const used=new Set();
  for(const t of f.tiles){used.add(t.key);let m=tiles.get(t.key);
   if(!m){const tex=new THREE.Texture(t.img);tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;m=rot(new THREE.Mesh(tileGeo,new THREE.MeshBasicMaterial({map:tex})),-PI/2);tiles.set(t.key,m);tileGroup.add(m);}
   m.material.color.copy(tileTint);m.position.set(t.x+t.size/2,t.y||0,t.z+t.size/2);m.scale.set(t.size+.5,t.size+.5,1);m.visible=true;}
  for(const [k,m] of tiles)if(!used.has(k)){m.visible=false;if(tiles.size>260){tileGroup.remove(m);m.material.map.dispose();m.material.dispose();tiles.delete(k);}}
  // 동선과 장소 표시
  f.legs.forEach((l,i)=>{const [a,b]=legMeshes[i],dx=l.bx-l.ax,dz=l.bz-l.az,len=Math.hypot(dx,dz),far=Math.min(Math.hypot(l.ax,l.az),Math.hypot(l.bx,l.bz))>9000||len<1;
   a.visible=b.visible=!far;if(far)return;b.material.color.set(l.fly?'#5b8def':'#ff6b4a');
   // 비행 중인 구간은 지나온 만큼만 그린다(출발지에서 비행기까지).
   const k=l.progress??1,ex=l.ax+dx*k,ez=l.az+dz*k,ln=len*k;if(ln<1){a.visible=b.visible=false;return;}
   for(const [m,w,y] of [[a,17,2],[b,10,3]]){m.position.set((l.ax+ex)/2,y,(l.az+ez)/2);m.scale.set(ln,1.6,w);m.rotation.y=-Math.atan2(dz,dx);m.material.opacity=l.seen||l.progress!=null?1:.45;}});
  f.stops.forEach((s,i)=>{const m=stopMeshes[i],p=props[i],near=Math.abs(s.x)<3000&&Math.abs(s.z)<3000;m.visible=near;p.visible=near&&s.showProp;if(!near)return;
   const r=s.state===2?17:12;m.material=stopMat[s.state];m.position.set(s.x,3.5,s.z);m.scale.set(r,3,r);
   // 지금 머무는 곳의 소품은 일행 뒤에 크게, 지나온 곳의 소품은 작게 남겨 둔다.
   if(p.visible){const here=s.state===2;p.scale.setScalar(here?PROP_SCALE:.6);p.position.set(s.x,0,s.z-(here?PROP_BACK:70));p.rotation.y=here?Math.sin(f.t*1.4)*.12:0;}});
  // 일행
  const n=chars.length,sp=Math.min(90,400/Math.max(1,n)),PS=f.party.scale||1,front=(f.party.front||0)*85;heads=[]; // 일행은 작게, 머무는 동안은 장소 표시 앞쪽에 선다
  chars.forEach((h,k)=>{h.visible=f.party.visible;if(!h.visible)return;const want=h.userData.variants[f.party.costume||'']||h.userData.variants[''];
   if(want!==h.userData.char||!want.visible){for(const c of Object.values(h.userData.variants))c.visible=c===want;h.userData.char=want;}
   h.scale.setScalar(PS);h.position.set((k-(n-1)/2)*sp*PS,0,((k%2)*(n>4?60:24)-12)*PS+front);h.rotation.y=f.party.walking?Math.max(-1.9,Math.min(1.9,f.party.heading)):0;
   poseAvatar(h.userData.char,{walking:f.party.walking,act:f.party.act,mood:f.party.mood,t:f.t,seed:k*1.7});});
  // 탈것(먼 이동)
  for(const [k,v] of Object.entries(vehicles)){v.visible=f.vehicle?.kind===k;if(v.visible){const lift=f.vehicle.lift??1; // 이륙·착륙: 낮게 작게 → 높이 크게
   v.position.set(0,k==='plane'?40+150*lift+Math.sin(f.t*3)*6:0,0);v.rotation.set(0,-f.vehicle.heading,k==='plane'?Math.sin(f.t*2)*.08+(f.vehicle.climb||0):0);v.scale.setScalar(k==='plane'?.8+.7*lift:1.1);}}
  renderer.render(scene,camera);
  chars.forEach((h,k)=>{heads[k]=h.visible?project(h.position.x,(h.userData.char.position.y+h.userData.char.userData.tag)*h.scale.y,h.position.z):null;});}
 const v3=new THREE.Vector3();
 function project(x,y,z){v3.set(x,y,z).project(camera);return {x:(v3.x+1)/2*W,y:(1-v3.y)/2*H};}
 return {setScene,render,project,heads:()=>heads,dispose(){freeTree(scene);renderer.dispose();}};}

export function createPreview(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.setSize(canvas.width,canvas.height,false);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,canvas.width/canvas.height,10,2000);camera.position.set(0,120,420);camera.lookAt(0,78,0);lights(scene);
 let char=null;
 return {set(av,kind=''){if(char){scene.remove(char);freeTree(char);}char=buildAvatar(av,kind);scene.add(char);},
  render(t){if(!char)return;char.rotation.y=Math.sin(t*.9)*.55;const moods=['normal','smile','happy','wow','wink','yum','relaxed'],i=Math.floor(t/1.8)%moods.length;poseAvatar(char,{act:moods[i]==='smile'?'wave':moods[i]==='happy'?'cheer':'',mood:moods[i],t});renderer.render(scene,camera);},
  dispose(){if(char)freeTree(char);renderer.dispose();}};}

/** 여행 계획 화면에 넣는 작은 캐릭터 그림. 캔버스 하나를 돌려 쓰며 그림 주소(data URL)를 돌려준다. */
export function createPortraits(size=176){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(size,size,false);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,10,2000);lights(scene);
 return {render(av,kind=''){const c=buildAvatar(av,kind),k=c.scale.y;camera.position.set(0,100*k+8,250*k+20);camera.lookAt(0,96*k,0); // 키에 맞춰 머리와 윗몸이 들어오게
  c.rotation.y=.28;poseAvatar(c,{act:'wave',mood:'smile',t:.16});scene.add(c);renderer.render(scene,camera);const url=canvas.toDataURL('image/png');scene.remove(c);freeTree(c);return url;},
  dispose(){renderer.dispose();}};}
