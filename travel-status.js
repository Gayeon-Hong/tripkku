/* TRIPKKU live travel status - location stays on this device (not Supabase). */
(() => {
  'use strict';
  const KEY = 'tripkku-live-location-enabled-v1';
  const root = document.querySelector('.topinner') || document.querySelector('.topbar-inner');
  if (!root || document.querySelector('#tripkkuLiveStatus')) return;
  const brand = root.querySelector('.brand');
  const widget = document.createElement('div');
  widget.id = 'tripkkuLiveStatus';
  widget.className = 'tripkku-live';
  widget.innerHTML = '<button class="tripkku-live-toggle" type="button" aria-pressed="false" title="위치 허용 시 GPS 좌표를 BigDataCloud(도시)와 Open-Meteo(날씨)로 전송합니다. 좌표는 여행방에 저장하지 않습니다.">📍 내 위치 켜기</button><div class="tripkku-live-info" aria-live="polite"><strong>🌎 여행 중 어디에 있나요?</strong><small>날씨 · 현지 환율을 볼 수 있어요</small><small class="tripkku-live-source">자료: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · <a href="https://frankfurter.dev/" target="_blank" rel="noopener noreferrer">Frankfurter</a></small></div>';

// Keep the live location widget visually consistent across both versions.
const liveStatusCSS = document.createElement('style');
liveStatusCSS.textContent = `
.tripkku-live{display:flex;align-items:center;gap:8px;flex:1 1 340px;max-width:460px;min-width:0;line-height:1.25;color:var(--ink,#244b3d)}
.tripkku-live-toggle{flex:none;appearance:none;border:1px solid var(--border,#d1ddd1);border-radius:15px;background:var(--soft,#eaf2eb);color:inherit;padding:8px 10px;font-size:11px;font-weight:800;min-height:34px;cursor:pointer}
.tripkku-live-info{display:flex;flex-direction:column;gap:3px;overflow:hidden;min-width:0}
.tripkku-live-info strong{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:850;color:inherit}
.tripkku-live-source{font-size:9px!important;opacity:.82}.tripkku-live-source a{color:inherit;text-decoration:underline}.tripkku-live-info small{font-size:10px;color:var(--muted,var(--sub,#64746b));overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.topbar .tripkku-live{color:var(--ink)}
.top .tripkku-live{color:#264e40}
@media(max-width:850px){.topbar-inner,.topinner{flex-wrap:wrap!important}.tripkku-live{order:5;flex:1 1 100%;max-width:none;margin:0;padding:5px 0 1px;border-top:1px solid var(--border,#e3e8de)}.topbar-actions,.header-actions{margin-left:auto}}
@media(max-width:430px){.tripkku-live-toggle{font-size:10px;padding:6px 8px;min-height:30px}.tripkku-live-info strong{font-size:11px}.tripkku-live-info small{font-size:9px}}
`;
document.head.append(liveStatusCSS);

  if (brand) brand.insertAdjacentElement('afterend', widget);
  else root.prepend(widget);
  const button = widget.querySelector('button');
  const title = widget.querySelector('strong');
  const details = widget.querySelector('small');
  let watchId = null;
  let enabled = false;
  let lastProcessed = 0;
  let lastCoords = null;
  let latestCountry = '';
  let latestCity = '';
  let latestTemp = '';
  let latestWeather = '';
  let latestFX = '';
  let lastWeatherTime = 0;
  let lastWeatherPos = null;
  let fxCache = new Map();
  const countryName = code => {
    try { return new Intl.DisplayNames(['ko'], { type: 'region' }).of(code) || code; }
    catch (_) { return code; }
  };
  const cityNames = {Oita: '오이타', Beppu: '벳푸', Yufu: '유후', Yufuin: '유후인', Seoul: '서울', Tokyo: '도쿄', Busan: '부산', Osaka: '오사카', 'Ōita': '오이타'};
  const currencies = {
    JP:'JPY',KR:'KRW',US:'USD',TW:'TWD',TH:'THB',VN:'VND',CN:'CNY',GB:'GBP',CH:'CHF',AU:'AUD',CA:'CAD',SG:'SGD',PH:'PHP',ID:'IDR',MY:'MYR',IN:'INR',AE:'AED',TR:'TRY',HK:'HKD',NZ:'NZD',MX:'MXN',BR:'BRL',ZA:'ZAR',CZ:'CZK',PL:'PLN',SE:'SEK',NO:'NOK',DK:'DKK',HU:'HUF',IS:'ISK',RO:'RON',BG:'BGN',RS:'RSD',
    IT:'EUR',FR:'EUR',DE:'EUR',ES:'EUR',NL:'EUR',BE:'EUR',AT:'EUR',PT:'EUR',FI:'EUR',IE:'EUR',GR:'EUR',EE:'EUR',LV:'EUR',LT:'EUR',SK:'EUR',SI:'EUR',HR:'EUR',LU:'EUR',MT:'EUR',CY:'EUR'
  };
  const weatherIcon = code => code === 0 ? '☀️' : code < 4 ? '⛅' : code === 45 || code === 48 ? '🌫️' : code >= 71 && code <= 77 ? '❄️' : code >= 95 ? '⛈️' : code >= 51 ? '🌧️' : '🌤️';
  const distance = (a, b) => {
    if (!a || !b) return Infinity;
    const r = Math.PI / 180, h = Math.sin((b.lat-a.lat)*r/2)**2 + Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lon-a.lon)*r/2)**2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  const render = () => {
    if (!enabled) return;
    const place = latestCountry ? `${countryName(latestCountry)}${latestCity ? `(${latestCity})` : ''}에 있어요!` : '현재 위치 확인 중…';
    title.textContent = '🌍 ' + place;
    details.textContent = [latestTemp, latestFX].filter(Boolean).join('  ·  ') || '날씨·환율 불러오는 중…';
  };
  const fetchJSON = async url => {
    const response = await fetch(url, { cache:'no-store', mode:'cors' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  };
  async function updateFX(country) {
    let code = currencies[country];
    // At home, show the currency for the existing Oita trip; NEXT defaults to EUR until a trip is selected.
    if (code === 'KRW') code = widget.dataset.tripCurrency || (location.pathname.includes('/next/') ? 'USD' : 'JPY');
    if (!code || code === 'KRW') { latestFX = ''; render(); return; }
    const now = Date.now();
    const prior = fxCache.get(code);
    if (prior && now-prior.when < 6*60*60*1000) { latestFX = prior.label; render(); return; }
    try {
      // KRW 1,000 -> local currency (not local currency -> KRW).
      const info = await fetchJSON(`https://api.frankfurter.dev/v2/rate/krw/${encodeURIComponent(code.toLowerCase())}`);
      const rate = Number(info.rate);
      if (!enabled || latestCountry !== country || !Number.isFinite(rate) || rate <= 0) return;
      const value = 1000 * rate;
      const fractionDigits = value >= 1000 ? 0 : value >= 10 ? 1 : 2;
      const formatted = value.toLocaleString('ko-KR', { maximumFractionDigits: fractionDigits });
      const currencyNames = {
        JPY:'\uC5D4', EUR:'\uC720\uB85C', USD:'\uB2EC\uB7EC', GBP:'\uD30C\uC6B4\uB4DC', CHF:'\uD504\uB791',
        TWD:'\uB300\uB9CC\uB2EC\uB7EC', THB:'\uBC14\uD2B8', VND:'\uB3D9', CNY:'\uC704\uC548',
        HKD:'\uD64D\uCF69\uB2EC\uB7EC', SGD:'\uC2F1\uAC00\uD3EC\uB974\uB2EC\uB7EC',
        IDR:'\uB8E8\uD53C\uC544', MYR:'\uB9C1\uAE43', PHP:'\uD398\uC18C',
        INR:'\uB8E8\uD53C', AUD:'\uD638\uC8FC\uB2EC\uB7EC', CAD:'\uCE90\uB098\uB2E4\uB2EC\uB7EC',
        NZD:'\uB274\uC9C8\uB79C\uB4DC\uB2EC\uB7EC', CZK:'\uCF54\uB8E8\uB098', PLN:'\uC988\uB85C\uD2F0',
        SEK:'\uD06C\uB85C\uB098', NOK:'\uD06C\uB85C\uB124', DKK:'\uD06C\uB85C\uB124',
        HUF:'\uD3EC\uB9B0\uD2B8', RON:'\uB808\uC774', BGN:'\uB808\uD504'
      };
      const localName = currencyNames[code] || code;
      const date = String(info.date || '').replace(/^\d{4}-/, '');
      const label = `\uD83D\uDCB1 1,000\uC6D0 \u2248 ${formatted}${localName} (${code})${date ? ' \u00B7 '+date : ''}`;
      fxCache.set(code, { when: now, label }); latestFX = label; render();
    } catch (_) { if (!latestFX) { latestFX = '💱 환율 조회 지연'; render(); } }
  }
  async function onPosition(pos) {
    if (!enabled) return;
    const coords = { lat: Number(pos.coords.latitude), lon: Number(pos.coords.longitude) };
    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return;
    const moved = distance(coords,lastCoords);
    if (moved < 2 && Date.now()-lastProcessed < 10*60*1000) return;
    lastProcessed = Date.now(); lastCoords = coords;
    if (!latestCountry) { title.textContent='📍 현재 위치 확인 중…';details.textContent='날씨·환율 불러오는 중…'; }
    // These third-party calls use the device's current GPS position with the user's opt-in.
    // Never store GPS coordinates in the shared travel data or URL.
    const locationRequest = fetchJSON('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude='+coords.lat+'&longitude='+coords.lon+'&localityLanguage=ko');
    const shouldWeather = !lastWeatherPos || distance(coords,lastWeatherPos)>2 || Date.now()-lastWeatherTime>15*60*1000;
    const weatherRequest = shouldWeather
      ? fetchJSON('https://api.open-meteo.com/v1/forecast?latitude='+coords.lat+'&longitude='+coords.lon+'&current=temperature_2m,weather_code&timezone=auto')
      : Promise.resolve(null);
    const [localResult, weatherResult] = await Promise.allSettled([locationRequest, weatherRequest]);
    if (!enabled) return;
    if (localResult.status === 'fulfilled') {
      const loc = localResult.value;
      const oldCountry=latestCountry;
      latestCountry = String(loc.countryCode||'').toUpperCase();
      const city = loc.city || loc.locality || loc.principalSubdivision || '';
      latestCity = cityNames[city] || city;
      if (oldCountry !== latestCountry) latestFX='';
      void updateFX(latestCountry);
    } else if (!latestCountry) { title.textContent='📍 GPS 위치 확인됨';details.textContent='도시 이름을 불러오지 못했어요'; }
    if (weatherResult.status === 'fulfilled' && weatherResult.value?.current) {
      const weather = weatherResult.value.current;
      if (Number.isFinite(Number(weather.temperature_2m))) {
        latestWeather = weatherIcon(Number(weather.weather_code));
        latestTemp = `${latestWeather} ${Math.round(Number(weather.temperature_2m))}°C`;
        lastWeatherTime=Date.now();lastWeatherPos=coords;
      }
    } else if (shouldWeather && !latestTemp) latestTemp='🌤️ 날씨 조회 지연';
    render();
  }
  function stop() {
    enabled=false;
    try { if (watchId!==null) navigator.geolocation.clearWatch(watchId); } catch (_) {}
    watchId=null;
    try { localStorage.removeItem(KEY); } catch (_) {}
    button.textContent='📍 내 위치 켜기'; button.setAttribute('aria-pressed','false');
    title.textContent='🌎 여행 중 어디에 있나요?';details.textContent='위치 공유 없음 · 날씨·현지 환율';
  }
  function start() {
    if (!navigator.geolocation || !window.isSecureContext) {
      title.textContent='📍 GPS를 사용할 수 없어요';
      details.textContent='HTTPS와 브라우저 위치 권한을 확인해 주세요'; return;
    }
    enabled=true;
    try { localStorage.setItem(KEY,'1'); } catch (_) {}
    button.textContent='📍 위치 끄기'; button.setAttribute('aria-pressed','true');
    title.textContent='📍 위치 확인 중…';details.textContent='위치 허용을 눌러 주세요';
    watchId=navigator.geolocation.watchPosition(
      p=>void onPosition(p),
      e=>{
        if (!enabled) return;
        title.textContent='📍 위치 확인 불가';
        details.textContent=e.code === 1 ? '위치 권한을 허용하면 날씨·환율이 표시돼요' : 'GPS가 느려요. 위치 설정·네트워크를 확인하세요';
        if (e.code === 1) { // preserve opt-in only if browser still permits a later attempt
          enabled=false;
          if (watchId!==null) navigator.geolocation.clearWatch(watchId);
          watchId=null;
          button.textContent='📍 다시 시도';button.setAttribute('aria-pressed','false');
          try {localStorage.removeItem(KEY);}catch(_){}
        }
      },
      { enableHighAccuracy:false, timeout:20000, maximumAge:30000 }
    );
  }
  button.addEventListener('click',()=>enabled?stop():start());
  window.addEventListener('beforeunload',()=>{if(watchId!==null)navigator.geolocation.clearWatch(watchId);});
  window.tripkkuSetTravelCurrency = code => {
    if (/^[A-Z]{3}$/.test(code)) {
      widget.dataset.tripCurrency=code;
      if (enabled && latestCountry==='KR') { latestFX='';void updateFX('KR'); }
    }
  };
  try { if (localStorage.getItem(KEY)==='1') start(); } catch (_) {}
})();
