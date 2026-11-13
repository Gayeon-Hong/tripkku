/**
 * 동선 영상의 바닥 지도. OpenFreeMap 의 벡터 타일(OpenMapTiles 형식, 무료·키 없음·상업 이용 가능)을
 * 받아 우리 색으로 캔버스에 직접 그린다. tile.openstreetmap.org 는 앱(특히 토스 미니앱)에서 쓰면
 * 이용 정책상 막히기 때문에 바꿨다.
 *
 * 쓰는 법: renderTile(z,x,y) → Promise<HTMLCanvasElement|null>. 결과는 일반 256px 지도 타일과 같은
 * 범위(z/x/y)를 TILE_PX 크기로 그린 그림이다. 한 단계 넓은 원본 타일(z-1, 최대 14)을 받아 확대해 그리므로
 * 이름표가 이웃 칸에서 잘리는 일이 적고, 15 이상은 14 타일을 확대해 선명하게 그린다.
 */
export const TILE_PX=384;
export const ATTRIBUTION='© OpenFreeMap © OpenMapTiles © OpenStreetMap';
const FONT="-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif";
const TILEJSON='https://tiles.openfreemap.org/planet';
const FALLBACK_URL='https://tiles.openfreemap.org/planet/20261101_080013_pt/{z}/{x}/{y}.pbf';
const MAXZ=14,R=TILE_PX/256;

/* ---------- 받아 오기 ---------- */
let urlP=null;
function tileUrl(){return urlP||(urlP=(async()=>{
 try{const c=JSON.parse(localStorage.getItem('tk-ofm-url')||'null');if(c&&Date.now()-c.t<3*864e5)return c.u;}catch{}
 try{const j=await fetch(TILEJSON).then(r=>r.ok?r.json():null);const u=j?.tiles?.[0];if(u){try{localStorage.setItem('tk-ofm-url',JSON.stringify({u,t:Date.now()}));}catch{}return u;}}catch{}
 return FALLBACK_URL;})());}
const SRC=new Map(),SRC_MAX=48;let active=0;const waiting=[];
const slot=()=>active<4?(active++,Promise.resolve()):new Promise(r=>waiting.push(r));
const free=()=>{const n=waiting.shift();if(n)n();else active--;};
function source(z,x,y){const k=z+'/'+x+'/'+y;let p=SRC.get(k);
 if(p){SRC.delete(k);SRC.set(k,p);return p;}
 p=(async()=>{await slot();try{const u=(await tileUrl()).replace('{z}',z).replace('{x}',x).replace('{y}',y);
   const r=await fetch(u);if(r.status===204||r.status===404)return {layers:{},empty:true};if(!r.ok)throw new Error('tile '+r.status);
   return decode(new Uint8Array(await r.arrayBuffer()));}finally{free();}})();
 p.catch(()=>SRC.delete(k));SRC.set(k,p);
 while(SRC.size>SRC_MAX)SRC.delete(SRC.keys().next().value);
 return p;}

/* ---------- Mapbox Vector Tile 읽기(필요한 레이어만) ---------- */
const WANT=new Set(['water','waterway','landcover','landuse','park','building','transportation','aeroway','boundary','place','water_name','poi']);
function decode(b){let pos=0;const dv=new DataView(b.buffer,b.byteOffset,b.byteLength),td=new TextDecoder();
 const vint=()=>{let v=0,s=1,c;do{c=b[pos++];v+=(c&127)*s;s*=128;}while(c>=128);return v;};
 const skip=t=>{if(t===0)vint();else if(t===1)pos+=8;else if(t===2){const l=vint();pos+=l;}else if(t===5)pos+=4;};
 const str=end=>td.decode(b.subarray(pos,pos=end));
 const layers={};
 while(pos<b.length){const tag=vint(),f=tag>>3,t=tag&7;
  if(f!==3||t!==2){skip(t);continue;}
  const end=vint()+pos;let name='',extent=4096;const keys=[],vals=[],feats=[];
  while(pos<end){const tg=vint(),ff=tg>>3,tt=tg&7;
   if(ff===1&&tt===2){const l=vint();name=str(pos+l);}
   else if(ff===3&&tt===2){const l=vint();keys.push(str(pos+l));}
   else if(ff===4&&tt===2){const ve=vint()+pos;let v=null;
    while(pos<ve){const vt=vint(),vf=vt>>3,vw=vt&7;
     if(vf===1){const l=vint();v=str(pos+l);}else if(vf===2){v=dv.getFloat32(pos,true);pos+=4;}else if(vf===3){v=dv.getFloat64(pos,true);pos+=8;}
     else if(vf===4||vf===5){v=vint();}else if(vf===6){const n=vint();v=(n%2?-(n+1)/2:n/2);}else if(vf===7){v=!!vint();}else skip(vw);}
    vals.push(v);}
   else if(ff===5&&tt===0)extent=vint();
   else if(ff===2&&tt===2){const fe=vint()+pos;feats.push([pos,fe]);pos=fe;}
   else skip(tt);}
  pos=end;if(!WANT.has(name))continue;
  const out=[];
  for(const [s,e] of feats){pos=s;let type=0,tags=null,gs=0,ge=0;
   while(pos<e){const tg=vint(),ff=tg>>3,tt=tg&7;
    if(ff===2&&tt===2){const te=vint()+pos;tags=[];while(pos<te)tags.push(vint());}
    else if(ff===3&&tt===0)type=vint();
    else if(ff===4&&tt===2){const l=vint();gs=pos;ge=pos+l;pos=ge;}
    else skip(tt);}
   const p={};if(tags)for(let i=0;i+1<tags.length;i+=2)p[keys[tags[i]]]=vals[tags[i+1]];
   pos=gs;const rings=[];let cx=0,cy=0,ring=null;
   while(pos<ge){const ci=vint(),id=ci&7,n=ci>>3;
    if(id===7){if(ring)ring.closed=true;continue;}
    for(let i=0;i<n;i++){const dx=vint(),dy=vint();cx+=(dx%2?-(dx+1)/2:dx/2);cy+=(dy%2?-(dy+1)/2:dy/2);
     if(id===1){ring=[cx,cy];rings.push(ring);}else ring.push(cx,cy);}}
   out.push({type,p,rings});}
  pos=end;layers[name]={extent,feats:out};}
 return {layers};}

/* ---------- 색과 굵기 ---------- */
const C={bg:'#eef0f5',water:'#b7d6f2',wood:'#d5e7d0',grass:'#dfecd9',sand:'#f2eddc',ice:'#ffffff',park:'#d3e8cf',
 hospital:'#f8e4ea',school:'#f3eee0',cemetery:'#dde8da',pitch:'#d3eacf',residential:'#e9ebf1',runway:'#d7d9e2',
 building:'#dfdee7',buildingLine:'#cfced9',casing:'#cdd0da',motorway:'#ffc978',trunk:'#ffd893',road:'#ffffff',path:'#c9ccd6',rail:'#b3b6c3',
 border:'#9ea2b6',text:'#2a2d3e',sub:'#6a6e82',waterText:'#3f78ae',poi:'#7a4fa3'};
const ROAD_W={motorway:7,trunk:6,primary:5,secondary:4.4,tertiary:3.8,minor:2.8,service:1.8,track:1.2,path:1,rail:1.4,transit:1.2};
const roadW=(cls,z)=>{const b=ROAD_W[cls];if(!b)return 0;const w=b*Math.pow(2,(z-15)*.75)*R;return w;};
const minRoadZ={motorway:5,trunk:6,primary:8,secondary:10,tertiary:11,minor:13,service:15,track:15,path:15,rail:12,transit:13};

/* ---------- 그리기 ---------- */
const nameOf=p=>p['name:ko']||p['name:latin']||p.name||p['name:en']||'';
function path(rings,k,ox,oy,close){const P=new Path2D();
 for(const r of rings){P.moveTo(r[0]*k-ox,r[1]*k-oy);for(let i=2;i<r.length;i+=2)P.lineTo(r[i]*k-ox,r[i+1]*k-oy);if(close)P.closePath();}
 return P;}
const LABELS=new Map();
/** 원본 타일 하나에서 이름표 자리를 한 번 정해(겹치면 뺀다) 같은 원본을 쓰는 칸끼리 똑같이 그린다. */
function placeLabels(src,key,z,k,ctx){const lk=key+'@'+z;let L=LABELS.get(lk);if(L)return L;L=[];const boxes=[];
 const add=(text,x,y,font,color,pri,dot)=>{ctx.font=font;const w=ctx.measureText(text).width,h=parseFloat(font.match(/(\d+(?:\.\d+)?)px/)[1]);
  const bx={x0:x-w/2-4*R,x1:x+w/2+4*R,y0:y-h/2-3*R,y1:y+h/2+3*R};if(boxes.some(o=>o.x0<bx.x1&&o.x1>bx.x0&&o.y0<bx.y1&&o.y1>bx.y0))return;
  boxes.push(bx);L.push({text,x,y,font,color,pri,dot,box:bx});};
 const cand=[];
 const pl=src.layers.place;if(pl)for(const f of pl.feats){const c=f.p.class,n=nameOf(f.p);if(!n||!f.rings[0])continue;
  const rank={country:0,state:9,city:1,town:2,village:4,hamlet:6,suburb:3,quarter:5,neighbourhood:6,island:4}[c];if(rank===undefined)continue;
  if(c==='country'&&z>7||c==='state'||c==='village'&&z<12||c==='hamlet'&&z<14||c==='suburb'&&z<12||(c==='quarter'||c==='neighbourhood')&&z<14)continue;
  const size=(c==='country'?14:c==='city'?(z<11?14:16):c==='town'?13.5:c==='suburb'?12:11.5)*R;
  cand.push({text:n,x:f.rings[0][0]*k,y:f.rings[0][1]*k,font:(c==='city'||c==='country'?'800 ':'700 ')+size+'px '+FONT,color:c==='suburb'||c==='quarter'||c==='neighbourhood'?C.sub:C.text,pri:rank*10+(f.p.rank||0)});}
 const wn=src.layers.water_name;if(wn)for(const f of wn.feats){const n=nameOf(f.p);if(!n||!f.rings[0])continue;
  if(!/ocean|sea|bay|strait|lake|river/.test(f.p.class||'')||f.p.class==='lake'&&z>15)continue; // 분수·연못 이름은 빼서 지도를 깔끔하게
  const r=f.rings[0],m=Math.floor(r.length/4)*2;
  cand.push({text:n,x:r[m]*k,y:r[m+1]*k,font:'italic 600 '+(11.5*R)+'px '+FONT,color:C.waterText,pri:35});}
 const po=src.layers.poi;if(po&&z>=15)for(const f of po.feats){const n=nameOf(f.p);if(!n||!f.rings[0])continue;const rk=f.p.rank||99;
  const good=/attraction|museum|castle|monument|art_gallery|theatre|zoo|place_of_worship|stadium|viewpoint|palace|memorial|park|townhall|cinema/.test(f.p.class+' '+(f.p.subclass||''));
  if(!good||rk>(z>=17?60:z>=16?30:12))continue;
  if(!f.p['name:ko']&&rk>3)continue; // 한국어 이름이 있는 유명한 곳 위주로(외국어 소품 이름이 지도를 덮지 않게)
  cand.push({text:n,x:f.rings[0][0]*k,y:f.rings[0][1]*k,font:'700 '+(11*R)+'px '+FONT,color:C.poi,pri:40+rk,dot:true});}
 cand.sort((a,b)=>a.pri-b.pri);
 for(const c of cand.slice(0,160))add(c.text,c.x,c.dot?c.y-9*R:c.y,c.font,c.color,c.pri,c.dot?{x:c.x,y:c.y}:null);
 LABELS.set(lk,L);if(LABELS.size>80)LABELS.delete(LABELS.keys().next().value);
 return L;}

// 한 화면에 수십 칸이 한꺼번에 준비돼도 재생이 끊기지 않게, 한 프레임에 두 칸까지만 그린다.
let budget=0,armed=false;const turnQ=[];
const tick=()=>{armed=false;budget=2;while(budget>0&&turnQ.length){budget--;turnQ.shift()();}if(turnQ.length)arm();};
// 화면이 가려져 requestAnimationFrame 이 멈춰도(녹화 중 다른 앱으로 전환 등) 타이머로 계속 그린다.
const arm=()=>{if(armed)return;armed=true;let fired=false;const go=()=>{if(fired)return;fired=true;tick();};
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(go);setTimeout(go,50);};
const turn=()=>new Promise(r=>{turnQ.push(r);arm();});

/** z/x/y 칸을 그린 캔버스. 데이터를 못 받으면 오류. */
export async function renderTile(z,x,y){
 const sz=Math.max(0,Math.min(MAXZ,z-1)),d=z-sz,sx=x>>d,sy=y>>d,src=await source(sz,sx,sy);
 await turn();
 const cv=document.createElement('canvas');cv.width=cv.height=TILE_PX;const ctx=cv.getContext('2d');
 ctx.fillStyle=C.bg;ctx.fillRect(0,0,TILE_PX,TILE_PX);if(src.empty)return cv;
 const n=2**d,ext=4096,k=TILE_PX*n/ext,ox=(x-sx*n)*TILE_PX,oy=(y-sy*n)*TILE_PX; // 원본 좌표 × k − (ox,oy) = 이 칸의 픽셀
 const L=src.layers;
 const fill=(lay,pick)=>{if(!L[lay])return;const by=new Map();
  for(const f of L[lay].feats){if(f.type!==3)continue;const col=pick(f.p);if(!col)continue;(by.get(col)||by.set(col,[]).get(col)).push(...f.rings);}
  for(const [col,rings] of by){ctx.fillStyle=col;ctx.fill(path(rings,k,ox,oy,true));}};
 fill('landcover',p=>({wood:C.wood,forest:C.wood,grass:C.grass,meadow:C.grass,farmland:z>=12?null:null,sand:C.sand,ice:C.ice,wetland:C.grass})[p.class]);
 fill('landuse',p=>({residential:z>=13?C.residential:null,hospital:C.hospital,school:C.school,university:C.school,college:C.school,cemetery:C.cemetery,pitch:C.pitch,stadium:C.pitch,playground:C.park})[p.class]);
 fill('park',()=>C.park);
 fill('water',()=>C.water);
 if(L.waterway){ctx.strokeStyle=C.water;ctx.lineCap=ctx.lineJoin='round';
  for(const f of L.waterway.feats){const w=(f.p.class==='river'?3.2:f.p.class==='canal'?2.4:1.2)*Math.pow(2,(z-14)*.6)*R;if(w<.4)continue;ctx.lineWidth=w;ctx.stroke(path(f.rings,k,ox,oy));}}
 fill('aeroway',p=>p.class==='runway'||p.class==='apron'?C.runway:null);
 if(L.building&&z>=15){const P=path(L.building.feats.filter(f=>f.type===3).flatMap(f=>f.rings),k,ox,oy,true);ctx.fillStyle=C.building;ctx.fill(P);ctx.strokeStyle=C.buildingLine;ctx.lineWidth=.6*R;ctx.stroke(P);}
 if(L.boundary&&z<=10){ctx.strokeStyle=C.border;ctx.setLineDash([6*R,4*R]);
  for(const f of L.boundary.feats){if(f.p.admin_level!==2||f.p.maritime)continue;ctx.lineWidth=1.3*R;ctx.stroke(path(f.rings,k,ox,oy));}ctx.setLineDash([]);}
 if(L.transportation){const T=L.transportation.feats.filter(f=>f.type===2&&z>=(minRoadZ[f.p.class]??99)),
   order=c=>({path:0,track:0,service:1,rail:2,transit:2,minor:3,tertiary:4,secondary:5,primary:6,trunk:7,motorway:8})[c]??0;
  T.sort((a,b)=>order(a.p.class)-order(b.p.class)||(a.p.brunnel==='tunnel'?-1:0));
  ctx.lineCap=ctx.lineJoin='round';
  for(const pass of [0,1])for(const f of T){const c=f.p.class,w=roadW(c,z);if(w<.35)continue;const P=path(f.rings,k,ox,oy);
   const tunnel=f.p.brunnel==='tunnel';ctx.globalAlpha=tunnel?.45:1;
   if(c==='rail'||c==='transit'){if(pass){ctx.strokeStyle=C.rail;ctx.lineWidth=w*.7;ctx.setLineDash([4*R,3*R]);ctx.stroke(P);ctx.setLineDash([]);}continue;}
   if(c==='path'||c==='track'){if(pass){ctx.strokeStyle=C.path;ctx.lineWidth=w;ctx.setLineDash([3*R,2.5*R]);ctx.stroke(P);ctx.setLineDash([]);}continue;}
   if(!pass){if(w>1.4){ctx.strokeStyle=C.casing;ctx.lineWidth=w+1.6*R;ctx.stroke(P);}}
   else{ctx.strokeStyle=c==='motorway'?C.motorway:c==='trunk'?C.trunk:C.road;ctx.lineWidth=w;ctx.stroke(P);}}
  ctx.globalAlpha=1;}
 // 이름표
 const labels=placeLabels(src,sz+'/'+sx+'/'+sy,z,k,ctx);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 for(const l of labels){const b=l.box;if(b.x1<ox||b.x0>ox+TILE_PX||b.y1<oy||b.y0>oy+TILE_PX)continue;
  if(l.dot){ctx.fillStyle=l.color;ctx.beginPath();ctx.arc(l.dot.x-ox,l.dot.y-oy,3*R,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.2*R;ctx.stroke();}
  ctx.font=l.font;ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=3.2*R;ctx.strokeText(l.text,l.x-ox,l.y-oy);ctx.fillStyle=l.color;ctx.fillText(l.text,l.x-ox,l.y-oy);}
 return cv;}
