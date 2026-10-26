// Actual geographic globe: GSHHS low-resolution shorelines (bundled, no map-tile service).
// Sample locations use preprojected coastline/land SVGs, while custom cities are
// plotted from offline geographic coastlines after geocoding.
import {COASTS} from './world-coasts.js';
export const SAMPLE_COORDS={
  oita:{lat:33.239,lon:131.607,nameKo:'벳푸 · 일본',nameEn:'Beppu · Japan',city:'벳푸 · 유후인 · 오이타',file:'oita'},
  osaka:{lat:34.6937,lon:135.5023,nameKo:'오사카 · 일본',nameEn:'Osaka · Japan',city:'오사카',file:'osaka'},
  london:{lat:51.5074,lon:-.1278,nameKo:'런던 · 영국',nameEn:'London · UK',city:'런던',file:'london'},
  newyork:{lat:40.7128,lon:-74.006,nameKo:'뉴욕 · 미국',nameEn:'New York · USA',city:'뉴욕',file:'newyork'}
};
const escapeXml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const knownNames=[['벳푸',SAMPLE_COORDS.oita],['유후인',SAMPLE_COORDS.oita],['오이타',SAMPLE_COORDS.oita],['beppu',SAMPLE_COORDS.oita],['yufuin',SAMPLE_COORDS.oita],['oita',SAMPLE_COORDS.oita],['오사카',SAMPLE_COORDS.osaka],['osaka',SAMPLE_COORDS.osaka],['런던',SAMPLE_COORDS.london],['london',SAMPLE_COORDS.london],['뉴욕',SAMPLE_COORDS.newyork],['new york',SAMPLE_COORDS.newyork]];
const RAD=Math.PI/180;
export function knownDestination(trip){
 const name=String(trip?.city||'').toLowerCase().trim();
 const defaultGeo=SAMPLE_COORDS[trip?.preset]||SAMPLE_COORDS.oita;
 if(!name || name===String(defaultGeo.city).toLowerCase())return {...defaultGeo,source:'sample'};
 // Accept one known place name; avoid a false match on unrelated names.
 const exact=knownNames.find(([text])=>name===text||name===text+' japan'||name===text+' united kingdom'||name===text+' usa');
 return exact?{...exact[1],source:'sample'}:null;
}
function project(lat,lon,centerLat,centerLon){
 const a=lat*RAD,b=centerLat*RAD,delta=(lon-centerLon)*RAD;
 const dot=Math.sin(a)*Math.sin(b)+Math.cos(a)*Math.cos(b)*Math.cos(delta);
 return {visible:dot>=0,x:220+185*Math.cos(a)*Math.sin(delta),y:220-185*(Math.cos(b)*Math.sin(a)-Math.sin(b)*Math.cos(a)*Math.cos(delta)),dot};
}
function dynamicCoasts(lat,lon){
 const paths=[];
 for(const seg of COASTS){
  let path='';let drawing=false;
  for(const [lon2,lat2] of seg){
   const p=project(lat2,lon2,lat,lon);
   if(p.visible){path+=`${drawing?' L':' M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;drawing=true;}else drawing=false;
  }
  if(path)paths.push(`<path d="${path}"/>`);
 }
 return `<g fill="none" stroke="#adebc4" stroke-width="1.7" stroke-linejoin="round" opacity=".93">${paths.join('')}</g>`;
}
export function destinationGlobeHtml(loc,appearance='light',language='ko'){
 const safe=(Number.isFinite(loc?.lat)&&Number.isFinite(loc?.lon))?loc:SAMPLE_COORDS.oita;
 const id='globe-land-clip';
 const dark=appearance==='dark';
 const ocean=dark?['#416db6','#0e3271','#0c1b3c']:['#a1e8ff','#358fdf','#123c90'];
 const label=language==='en'?(safe.nameEn||safe.name||'Trip destination'):(safe.nameKo||safe.name||'여행 목적지');
 const inner=safe.file?`<image href="./assets/geo-${safe.file}.svg" x="0" y="0" width="440" height="440"/>`:dynamicCoasts(safe.lat,safe.lon);
 return `<svg class="destination-globe-svg" viewBox="0 0 440 440" role="img" aria-label="${escapeXml(label)} map, destination pin" xmlns="http://www.w3.org/2000/svg">
   <defs><radialGradient id="globeOcean" cx="30%" cy="20%" r="78%"><stop stop-color="${ocean[0]}"/><stop offset=".65" stop-color="${ocean[1]}"/><stop offset="1" stop-color="${ocean[2]}"/></radialGradient><clipPath id="${id}"><circle cx="220" cy="220" r="185"/></clipPath><filter id="pinShadow"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-opacity=".22"/></filter></defs>
   <circle cx="220" cy="220" r="188" fill="#062342" opacity=".12"/>
   <circle cx="220" cy="220" r="185" fill="url(#globeOcean)"/>
   <g clip-path="url(#${id})">${inner}</g>
   <circle cx="220" cy="220" r="185" stroke="${dark?'#a8cdf9':'#d2f4ff'}" fill="none" stroke-width="2" opacity=".8"/>
   <g transform="translate(220 203)"><path d="M0 -38 C-18 -38 -32 -23 -32 -6 C-32 16 -9 34 0 49 C9 34 32 16 32 -6 C32 -23 18 -38 0 -38Z" fill="#ff7050" stroke="#ffffff" stroke-width="4"/><circle cy="-8" r="10" fill="#ffffff"/></g>
   <rect x="95" y="352" width="250" height="41" rx="20" fill="${dark?'#10203e':'#ffffff'}" opacity=".96"/>
   <text x="220" y="378" text-anchor="middle" font-family="Arial,'Noto Sans KR',sans-serif" font-weight="800" font-size="18" fill="${dark?'#eaf7ff':'#21445f'}">${escapeXml(label.length>21?label.slice(0,21)+'…':label)}</text>
  </svg>`;
}
// Open-Meteo geocoding; custom search requires a network connection.
export async function geocodeCity(city){
 const query=String(city||'').split(/[·,/]/)[0].trim();
 if(!query)throw Error('Enter a destination city');
 const known=knownNames.find(([x])=>x.toLowerCase()===query.toLowerCase());
 if(known)return {...known[1],name:query};
 const url='https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:query,count:'1',language:'en',format:'json'});
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),7000);
 try{const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error('Geocoding not available');
  const j=await r.json();const loc=j.results?.[0];if(!loc)throw Error('City not found');
  return {lat:Number(loc.latitude),lon:Number(loc.longitude),nameKo:loc.name+' · '+(loc.country||''),nameEn:loc.name+' · '+(loc.country||''),name:loc.name,source:'geocode'};
 }finally{clearTimeout(timeout);}
}
export function dateRange(trip){
 const src=String(trip?.dates||'');
 const matches=[...src.matchAll(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})/g)].map(m=>`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
 if(!matches.length)return null;
 const start=matches[0],end=matches[1]||start;
 if(!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||end<start)return null;
 return {start,end};
}
const WMO={sunny:[0,1],partly:[2],cloudy:[3,45,48],rain:[51,53,55,56,57,61,63,65,66,67,80,81,82],snow:[71,73,75,77,85,86],storm:[95,96,99]};
export function weatherMood(code){for(const [key,ids] of Object.entries(WMO))if(ids.includes(code))return key;return 'cloudy';}
export function weatherLabel(code,lang='ko'){
 const m=weatherMood(code);
 const names={sunny:['맑음','Clear'],partly:['구름 조금','Partly cloudy'],cloudy:['흐림','Cloudy'],rain:['비','Rain'],snow:['눈','Snow'],storm:['뇌우','Thunderstorm']};
 const icons={sunny:'☀️',partly:'🌤️',cloudy:'☁️',rain:'🌧️',snow:'❄️',storm:'⛈️'};
 return `${icons[m]} ${names[m][lang==='en'?1:0]}`;
}
// Do not display speculative weather for dates outside available forecast horizon.
export async function fetchTravelWeather(loc,dates){
 if(!loc||!dates)return {status:'dates-missing'};
 const now=new Date();const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 const tripDay=new Date(dates.start+'T12:00:00');const difference=Math.floor((tripDay-today)/86400000);
 if(difference<0)return {status:'past'};
 if(difference>15)return {status:'not-yet'};
 const url='https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({latitude:loc.lat,longitude:loc.lon,daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',timezone:'auto',forecast_days:'16'});
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),9000);
 try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('Weather service '+response.status);
  const raw=await response.json();const d=raw.daily;if(!d?.time?.length)throw Error('Missing daily forecast');
  const days=d.time.map((day,i)=>({date:day,code:d.weather_code[i],min:d.temperature_2m_min[i],max:d.temperature_2m_max[i],rain:d.precipitation_probability_max?.[i]??null})).filter(x=>x.date>=dates.start&&x.date<=dates.end).slice(0,8);
  if(!days.length)return {status:'not-yet'};
  return {status:'ok',days,provider:'Open-Meteo'};
 }catch(e){return {status:'offline',message:e.message};}finally{clearTimeout(timeout);}
}
