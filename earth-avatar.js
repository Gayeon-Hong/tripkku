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
export function earthAvatarHtml(appearance='light',mood='happy'){
 const safeAp=appearance==='dark'?'dark':'light';
 const face=faces[mood]||faces.happy;
 return `<svg class="character-globe" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Earth character">
  <image href="./assets/earth-base-${safeAp}.png" width="600" height="600"/>
  <g class="earth-face">${face()}</g>
 </svg>`;
}
