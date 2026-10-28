/* Tripkku Earth character: facial expressions only. No gender/accessory selection.
   Original light and dark app icons remain unchanged. */
const ink='#102c50';
const blush='<ellipse cx="226" cy="360" rx="21" ry="12" fill="#f389b6" opacity=".86"/><ellipse cx="350" cy="360" rx="21" ry="12" fill="#f389b6" opacity=".69"/>';
const eye=(cx,cy=326)=>`<ellipse cx="${cx}" cy="${cy}" rx="12" ry="15" fill="${ink}"/><ellipse cx="${cx+5}" cy="${cy-8}" rx="3.8" ry="4.5" fill="#fff"/>`;
const faces={
 happy:()=>`${blush}${eye(248)}${eye(328)}<path d="M271 354 Q288 377 305 354" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>`,
 angry:()=>`<path d="M226 303 L262 313 M310 313 L347 303" stroke="${ink}" stroke-width="9" stroke-linecap="round"/><path d="M234 335 Q247 327 261 336 M314 335 Q328 327 341 336" fill="none" stroke="${ink}" stroke-width="9" stroke-linecap="round"/><path d="M271 374 Q288 353 305 374" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>`,
 sleepy:()=>`${blush}<path d="M230 326 Q247 343 264 326 M312 326 Q328 343 345 326" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/><ellipse cx="288" cy="368" rx="10" ry="8" fill="${ink}"/>`,
 love:()=>`<ellipse cx="226" cy="361" rx="24" ry="13" fill="#ff70a0" opacity=".9"/><ellipse cx="350" cy="361" rx="22" ry="13" fill="#ff70a0" opacity=".7"/><path d="M248 343 C225 332 227 310 242 309 C247 309 250 313 252 317 C261 303 278 311 272 327 C269 336 258 340 248 343 Z" fill="#ef4278"/><path d="M327 343 C304 332 307 310 321 309 C327 309 329 313 332 317 C340 303 357 311 351 327 C348 336 337 340 327 343 Z" fill="#ef4278"/><path d="M267 354 Q288 385 310 354" fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>`
};
function earthAvatarHtml(appearance='light',mood='happy'){
 const safeAp=appearance==='dark'?'dark':'light';
 const face=faces[mood]||faces.happy;
 // Keep the official artwork and draw facial features directly on top of the globe.
 // A native HTML image loads more reliably than <image href> inside injected SVG,
 // especially on GitHub Pages and mobile browsers.
 return `<div class="earth-avatar-stack" role="img" aria-label="${safeAp==='dark'?'밤':'낮'} · ${MOOD_NAMES[mood]||MOOD_NAMES.happy}">
  <img class="earth-avatar-base" src="./assets/earth-base-${safeAp}.png" alt="" draggable="false" />
  <svg class="earth-avatar-face" viewBox="0 0 600 600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
   <g>${face()}</g>
  </svg>
 </div>`;
}


const PREF_KEY='oita-earth-controls-v16';
const MOOD_NAMES={happy:'신난 지구',angry:'화난 지구',sleepy:'졸린 지구',love:'설레는 지구'};
const validMood=value=>Object.hasOwn(MOOD_NAMES,String(value));
let prefs={appearance:'light',mood:'happy'};
function readPreferences(){
 try{
  const value=JSON.parse(localStorage.getItem(PREF_KEY)||'null');
  if(value && typeof value==='object'){
   prefs.appearance=value.appearance==='dark'?'dark':'light';
   prefs.mood=validMood(value.mood)?value.mood:'happy';
  }else{
   // Carry over this device's original Tripkku preferences; never upload them.
   prefs.appearance=localStorage.getItem('tripkku-appearance-v1')==='dark'?'dark':'light';
   const old=JSON.parse(localStorage.getItem('tripkku-earth-style-v1')||'null');
   if(old && validMood(old.mood))prefs.mood=old.mood;
  }
 }catch(_){/* Private browsing or disabled storage must not break the controls. */}
}
function paintGlobe(){
 document.querySelectorAll('[data-earth-avatar]').forEach(el=>{
  el.innerHTML=earthAvatarHtml(prefs.appearance,prefs.mood);
  el.dataset.appearance=prefs.appearance;el.dataset.mood=prefs.mood;
 });
 document.querySelectorAll('button[data-earth-appearance],button[data-earth-mood]').forEach(b=>{
  const selected=b.hasAttribute('data-earth-appearance')?b.dataset.earthAppearance===prefs.appearance:b.dataset.earthMood===prefs.mood;
  b.setAttribute('aria-pressed',String(selected));b.classList.toggle('is-selected',selected);
 });
}
readPreferences();paintGlobe();
document.querySelectorAll('[data-earth-controls]').forEach(group=>group.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||!group.contains(b))return;
 if(b.hasAttribute('data-earth-appearance'))prefs.appearance=b.dataset.earthAppearance==='dark'?'dark':'light';
 if(b.hasAttribute('data-earth-mood') && validMood(b.dataset.earthMood))prefs.mood=b.dataset.earthMood;
 paintGlobe();try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs));}catch(_){}
}));
window.addEventListener('storage',e=>{if(e.key===PREF_KEY){readPreferences();paintGlobe();}});
