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
export const PROP_BACK=195,PROP_SCALE=1.4; // 머무는 곳의 소품: 일행 뒤로 떨어진 거리, 크기
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
const PROPS={
 tree:()=>{const g=group(mesh(G.cyl(9,11,26),'#8a5a3c',0,13,0),mesh(G.cone(58,70),'#2f9e63',0,48,0),mesh(G.cone(46,60),'#37b071',0,88,0),mesh(G.cone(32,50),'#45c283',0,124,0),mesh(new THREE.OctahedronGeometry(13),'#ffd84a',0,160,0,{emissive:'#ffb400',emissiveIntensity:.7}));
  ['#ff5a6e','#ffd84a','#6fb8ff','#ffffff','#ff5a6e','#6fb8ff','#ffd84a','#ffffff','#ff5a6e'].forEach((c,i)=>{const lvl=i%3,r=[40,30,19][lvl],a=i*2.3;g.add(mesh(G.sphere(5.5),c,Math.sin(a)*r,[40,82,118][lvl],Math.cos(a)*r,{emissive:c,emissiveIntensity:.4}));});return g;},
 castle:()=>group(mesh(G.box(76,70,50),'#ece5d3',0,35,0),mesh(G.cyl(17,17,104),'#f3eddc',-48,52,0),mesh(G.cyl(17,17,104),'#f3eddc',48,52,0),mesh(G.cone(23,38),'#5b8def',-48,123,0),mesh(G.cone(23,38),'#5b8def',48,123,0),
  mesh(G.cyl(15,15,56),'#f3eddc',0,98,0),mesh(G.cone(21,36),'#e85a6e',0,144,0),mesh(G.box(20,32,4),'#8a5a3c',0,16,26),mesh(G.box(10,12,3),'#6f8fc0',-48,70,16),mesh(G.box(10,12,3),'#6f8fc0',48,70,16)),
 bowl:()=>group(mesh(G.cyl(22,26,10),'#e8604a',0,5,0),mesh(new THREE.SphereGeometry(50,28,14,0,PI*2,PI/2,PI/2),mat('#ff7a59',{side:THREE.DoubleSide}),0,58,0),rot(mesh(G.torus(50,4),'#ffffff',0,58,0),PI/2),mesh(G.cyl(45,45,6),'#ffe2a8',0,55,0),
  scl(mesh(G.sphere(13),'#ffffff',-16,60,6),1,.45,1),scl(mesh(G.sphere(6),'#ffb400',-16,63,6),1,.6,1),mesh(G.box(22,5,10),'#6fbf73',16,60,-10),rot(mesh(G.cyl(1.8,1.8,110,8),'#8a5a3c',26,92,0),0,0,-.7),rot(mesh(G.cyl(1.8,1.8,110,8),'#8a5a3c',34,90,8),0,0,-.7)),
 cup:()=>group(mesh(G.cyl(44,48,5),'#f1ece4',0,3,0),mesh(G.cyl(31,25,58),'#ffffff',0,35,0),mesh(G.cyl(28,28,2),'#7a4a2a',0,64,0),rot(mesh(G.torus(14,4.5),'#ffffff',35,36,0),0,0,0),...steam(-8,84,0)),
 hotel:()=>{const g=group(mesh(G.box(96,124,60),'#f6dcc8',0,62,0),mesh(G.box(104,9,68),'#c96f5a',0,128,0),mesh(G.box(22,30,3),'#8a5a3c',0,15,31),mesh(G.box(44,12,3),'#ffd84a',0,116,31));
  for(let r=0;r<3;r++)for(let c=-1;c<=1;c++)g.add(mesh(G.box(16,17,3),'#8fd0f0',c*29,48+r*24,31));return g;},
 museum:()=>group(mesh(G.box(126,12,74),'#e8e4da',0,6,0),mesh(G.box(104,62,40),'#f4f1e8',0,43,-10),...[-42,-14,14,42].map(x=>mesh(G.cyl(7,7,62),'#ffffff',x,43,22)),mesh(G.box(128,10,78),'#e8e4da',0,79,0),scl(rot(mesh(G.cone(66,30,4),'#d9d3c4',0,99,0),0,PI/4),1,1,.62)),
 tower:()=>group(mesh(G.cyl(22,26,8),'#c9cfd9',0,4,0),mesh(G.cyl(6,15,150,14),'#e3e7ee',0,79,0),scl(mesh(G.sphere(21),'#ff6b8a',0,122,0),1,.8,1),mesh(G.cyl(1.6,1.6,44,8),'#c9cfd9',0,176,0)),
 parasol:()=>group(mesh(G.cyl(62,62,4),'#f4e2b0',0,2,0),mesh(G.cyl(2.6,2.6,112,10),'#ffffff',0,58,0),mesh(G.cone(64,30,12),'#ff7a59',0,122,0),mesh(G.sphere(15),'#6fb8ff',36,17,22),mesh(G.box(46,4,20),'#8fd0b8',-28,6,24)),
 bag:()=>group(mesh(G.box(70,82,34),'#ff8fb0',-8,45,0),mesh(G.torus(18,3.5,PI),'#e85a84',-8,86,0),mesh(G.box(44,54,24),'#ffd84a',44,29,16),mesh(G.torus(12,3,PI),'#e0a800',44,56,16)),
 onsen:()=>{const g=group(mesh(G.cyl(60,60,8),'#8fe0e8',0,5,0),...steam(-18,30,0),...steam(18,24,10));for(let i=0;i<9;i++){const a=i/9*PI*2;g.add(scl(mesh(G.sphere(17,10,8),i%2?'#9a9488':'#b0aa9c',Math.sin(a)*62,8,Math.cos(a)*62),1,.75,1));}return g;},
 house:()=>group(mesh(G.box(84,62,70),'#fff1d6',0,31,0),rot(mesh(G.cone(72,48,4),'#e8604a',0,86,0),0,PI/4),mesh(G.box(20,34,3),'#8a5a3c',0,17,36),mesh(G.box(18,18,3),'#8fd0f0',26,36,36),mesh(G.box(14,30,14),'#c96f5a',24,96,-10)),
 park:()=>group(mesh(G.cyl(8,10,60),'#8a5a3c',0,30,0),mesh(G.sphere(46),'#6cc070',0,98,0),mesh(G.sphere(30),'#7fd083',-36,76,10),mesh(G.sphere(26),'#5fb565',34,70,-6),scl(mesh(G.sphere(22),'#7fd083',58,14,26),1,.7,1)),
 beer:()=>group(mesh(G.cyl(30,30,68),mat('#ffc93a',{transparent:true,opacity:.92}),0,36,0),rot(mesh(G.torus(16,5),'#fff4c2',36,38,0)),mesh(G.sphere(18),'#ffffff',-12,76,0),mesh(G.sphere(18),'#ffffff',12,78,4),mesh(G.sphere(15),'#ffffff',0,86,-8)),
 ferris:()=>{const g=group(rot(mesh(G.cyl(3,3,110,8),'#c9cfd9',-22,52,0),0,0,-.22),rot(mesh(G.cyl(3,3,110,8),'#c9cfd9',22,52,0),0,0,.22),mesh(G.torus(62,3.5),'#ff8fb0',0,104,0),mesh(G.sphere(8),'#ffffff',0,104,0));
  ['#ff5a6e','#ffd84a','#6fb8ff','#8fd0b8','#b9a4e6','#f2a07a','#ffffff','#6cc070'].forEach((c,i)=>{const a=i/8*PI*2;g.add(mesh(G.box(15,15,12),c,Math.cos(a)*62,104+Math.sin(a)*62,0));});return g;},
 pin:()=>group(mesh(G.sphere(28),'#ff5a4a',0,112,0),rot(mesh(G.cone(21,72),'#ff5a4a',0,52,0),PI),mesh(G.sphere(11),'#ffffff',0,114,21)),
 plane:()=>group(rot(mesh(G.capsule(14,74),'#ffffff'),0,0,PI/2),mesh(G.box(28,3.5,128),'#5b8def',4,0,0),mesh(G.box(18,24,3.5),'#5b8def',-44,13,0),mesh(G.box(14,3,46),'#5b8def',-44,2,0),mesh(G.sphere(8),'#8fd0f0',40,6,0)),
 train:()=>{const g=group(mesh(G.box(124,42,38),'#5bbf8a',0,31,0),mesh(G.box(124,6,40),'#ffffff',0,55,0),mesh(G.box(20,20,34),'#8fd0f0',52,36,0));for(const x of [-40,-10,20])g.add(mesh(G.box(20,16,40),'#8fd0f0',x,38,0));
  for(const x of [-40,40])for(const z of [-17,17])g.add(rot(mesh(G.cyl(9,9,6),'#3a3f4b',x,9,z),PI/2));return g;}
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
 const camera=new THREE.PerspectiveCamera(36,W/H,10,6000);lights(scene);
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
  stopMeshes=tl.stops.map(()=>{const d=new THREE.Mesh(discGeo,stopMat[0]);routeGroup.add(d);return d;});
  legMeshes=tl.stops.slice(1).map(()=>{const a=new THREE.Mesh(boxGeo,routeMat.white.clone()),b=new THREE.Mesh(boxGeo,routeMat.walk.clone());routeGroup.add(a,b);return [a,b];});}
 function render(f){
  const night=!!f.night;bg.set(night?'#18222b':'#dfe9ee');
  const d=f.dolly||1;camera.position.set(0,800*d,960*d);camera.lookAt(0,96,0);
  // 지도 타일
  const used=new Set();
  for(const t of f.tiles){used.add(t.key);let m=tiles.get(t.key);
   if(!m){const tex=new THREE.Texture(t.img);tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;m=rot(new THREE.Mesh(tileGeo,new THREE.MeshBasicMaterial({map:tex})),-PI/2);tiles.set(t.key,m);tileGroup.add(m);}
   m.material.color.set(night?'#7c8894':'#ffffff');m.position.set(t.x+t.size/2,0,t.z+t.size/2);m.scale.set(t.size+.5,t.size+.5,1);m.visible=true;}
  for(const [k,m] of tiles)if(!used.has(k)){m.visible=false;if(tiles.size>260){tileGroup.remove(m);m.material.map.dispose();m.material.dispose();tiles.delete(k);}}
  // 동선과 장소 표시
  f.legs.forEach((l,i)=>{const [a,b]=legMeshes[i],dx=l.bx-l.ax,dz=l.bz-l.az,len=Math.hypot(dx,dz),far=Math.min(Math.hypot(l.ax,l.az),Math.hypot(l.bx,l.bz))>9000||len<1;
   a.visible=b.visible=!far;if(far)return;b.material.color.set(l.fly?'#5b8def':'#ff6b4a');
   for(const [m,w,y] of [[a,17,2],[b,10,3]]){m.position.set((l.ax+l.bx)/2,y,(l.az+l.bz)/2);m.scale.set(len,1.6,w);m.rotation.y=-Math.atan2(dz,dx);m.material.opacity=l.seen?1:.45;}});
  f.stops.forEach((s,i)=>{const m=stopMeshes[i],p=props[i],near=Math.abs(s.x)<3000&&Math.abs(s.z)<3000;m.visible=near;p.visible=near&&s.showProp;if(!near)return;
   const r=s.state===2?17:12;m.material=stopMat[s.state];m.position.set(s.x,3.5,s.z);m.scale.set(r,3,r);
   // 지금 머무는 곳의 소품은 일행 뒤에 크게, 지나온 곳의 소품은 작게 남겨 둔다.
   if(p.visible){const here=s.state===2;p.scale.setScalar(here?PROP_SCALE:.6);p.position.set(s.x,0,s.z-(here?PROP_BACK:70));p.rotation.y=here?Math.sin(f.t*1.4)*.12:0;}});
  // 일행
  const n=chars.length,sp=Math.min(90,400/Math.max(1,n));heads=[];
  chars.forEach((h,k)=>{h.visible=f.party.visible;if(!h.visible)return;const want=h.userData.variants[f.party.costume||'']||h.userData.variants[''];
   if(want!==h.userData.char||!want.visible){for(const c of Object.values(h.userData.variants))c.visible=c===want;h.userData.char=want;}
   h.position.set((k-(n-1)/2)*sp,0,(k%2)*(n>4?60:24)-12);h.rotation.y=f.party.walking?Math.max(-1.9,Math.min(1.9,f.party.heading)):0;
   poseAvatar(h.userData.char,{walking:f.party.walking,act:f.party.act,mood:f.party.mood,t:f.t,seed:k*1.7});});
  // 탈것(먼 이동)
  for(const [k,v] of Object.entries(vehicles)){v.visible=f.vehicle?.kind===k;if(v.visible){v.position.set(0,k==='plane'?150+Math.sin(f.t*3)*6:0,0);v.rotation.set(0,-f.vehicle.heading,k==='plane'?Math.sin(f.t*2)*.08:0);v.scale.setScalar(k==='plane'?1.25:1.1);}}
  renderer.render(scene,camera);
  chars.forEach((h,k)=>{heads[k]=h.visible?project(h.position.x,h.userData.char.position.y+h.userData.char.userData.tag,h.position.z):null;});}
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
