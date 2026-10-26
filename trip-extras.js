/* Tripkku travel details. Curated Oita sample references; no DB mutations. */
(()=>{
  const root=document.getElementById('travelDetailsContent');if(!root)return;
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const link=(label,url)=>`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} ↗</a>`;
  const card=(title,desc,links=[])=>`<article class="td-card"><h4>${escape(title)}</h4><p>${escape(desc)}</p>${links.map(v=>link(...v)).join('')}</article>`;
  const section=(title,cards)=>`<div class="td-group"><h3>${escape(title)}</h3><div class="td-grid">${cards.join('')}</div></div>`;
  const flights=[card('제주항공 · 인천 → 오이타','11:05 → 13:00 / 친구용 여행 샘플에 기재된 항공편 후보. 실제 예약·운항 정보 아님.',[['제주항공 예약','https://www.jejuair.net/ko/main/base/index.do']]),card('제주항공 · 오이타 → 인천','14:00 → 15:45 / 귀국편 후보. 탑승일과 항공편을 다시 확인하세요.',[['항공권 가격 비교','https://kr.trip.com/flights/']])];
  const hotels=[
    card('니시테츠 리조트 인 벳푸','벳푸 기타하마·공항버스 접근이 편리한 일반 호텔 후보.',[['숙소 확인','https://www.agoda.com/nishitetsu-resort-inn-beppu/hotel/beppu-jp.html']]),
    card('슈퍼호텔 벳푸 에키마에','벳푸역 접근성 중심의 일반 호텔 후보.',[['숙소 확인','https://www.agoda.com/h14629621/hotel/beppu-jp.html']]),
    card('가메노이 호텔 벳푸','벳푸역 도보권의 객실 비교 후보.',[['숙소 확인','https://www.agoda.com/ko-kr/beppu-kamenoi-hotel/hotel/beppu-jp.html']]),
    card('씨사이드 호텔 미마츠 오에테이','바다 전망·일본식 식사 플랜을 확인할 료칸 후보.',[['숙소 확인','https://www.agoda.com/seaside-hotel-mimatsu-oetei/hotel/beppu-jp.html']]),
    card('하나벳푸','다다미 객실 및 조석식 옵션을 살펴볼 료칸 후보.',[['숙소 확인','https://www.agoda.com/hana-beppu_3/hotel/beppu-jp.html']]),
    card('호시노 리조트 카이 벳푸','프리미엄 료칸 후보. 석식 시간과 체크인 제한 확인.',[['숙소 확인','https://www.agoda.com/hoshino-resorts-kai-beppu-h40203980/hotel/beppu-jp.html']])
  ];
  const photo=[
    card('유후인 · 긴린코','호수와 산 반영 사진. 관광지 출입·혼잡도 확인.',[['길찾기','https://www.google.com/maps/dir/?api=1&destination=Lake%20Kinrin%20Yufuin&travelmode=transit'],['인스타 태그','https://www.instagram.com/explore/tags/yufuin/']]),
    card('유후인 플로럴 빌리지','골목·외관 사진과 유후인 산책 코스.',[['길찾기','https://www.google.com/maps/search/?api=1&query=Yufuin%20Floral%20Village']]),
    card('벳푸 타워 · 기타하마','저녁 야경 및 기타하마 공원 주변 산책.',[['길찾기','https://www.google.com/maps/search/?api=1&query=Beppu%20Tower'],['벳푸 인스타 태그','https://www.instagram.com/explore/tags/beppu/']]),
    card('오이타 여행 영상','친구용 플래너에서 참고한 벳푸·유후인 여행 영상.',[['유튜브 여행 영상','https://www.youtube.com/watch?v=MCBzfoRSavM'],['현지 관광 사진','https://digoita.visit-oita.jp/dig-post/09/']])
  ];
  const tips=[
    card('공항 · 버스 · JR','오이타공항→벳푸·오이타 버스, 벳푸→유후인 이동, JR 예약을 실제 여행 날짜 기준으로 확인.',[['공항버스','https://www.oita-airport.jp/access/bus/'],['벳푸·유후인 버스','https://kamenoibus.com/'],['JR 규슈','https://www.jrkyushu.co.jp/english/']]),
    card('맛집 · 쇼핑','이치란 오이타 벤텐점은 오이타역 바로 앞이 아닙니다. 몽벨 오이타점은 AMU PLAZA에 있습니다.',[['이치란 공식','https://ko.ichiran.com/shop/kyushu/oita-benten/'],['몽벨 매장','https://store.montbell.jp/search/shopinfo/?shop_no=678529']]),
    card('예약 체크리스트','항공편 확정 → 숙소 날짜·취소 정책 → 대중교통 운행일 → 식당 예약 → 여권·eSIM·입국 절차.',[['Visit Japan Web','https://www.vjw.digital.go.jp/'],['Klook','https://www.klook.com/ko/']])
  ];
  const notice='<div class="td-note">🧪 <b>오이타 샘플 참고 정보</b>입니다. 친구용 HTML에 있던 추천을 복원한 것이며, 실시간 검색·예약 데이터가 아닙니다. 일정·가격·운항·영업 상태는 예약 전에 재확인하세요. 예산 계산은 위의 <b>예산</b> 메뉴에서 계속 사용할 수 있습니다.</div>';
  function render(){
    const city=(document.getElementById('travelCity')?.value||'').trim();
    const isOita=/오이타|벳푸|유후인|oita|beppu|yufuin/i.test(city);
    root.innerHTML=isOita?notice+section('✈️ 항공편',flights)+section('🛏️ 숙소 비교',hotels)+section('📷 인스타 · 영상 · 포토스팟',photo)+section('🚌 길찾기 · 현지 꿀팁',tips):'<div class="td-note">현재 여행지에 맞는 상세 추천 샘플은 아직 없습니다. <b>오이타·벳푸·유후인</b> 여행을 선택하면 친구용 오이타 가이드가 표시됩니다. 다른 도시의 숙소·항공편·추천은 향후 여행별 저장 기능으로 확장해야 합니다. 위의 예산 및 기본 지도 기능은 계속 사용할 수 있습니다.</div>';
  }
  render();
  document.getElementById('saveTravelCity')?.addEventListener('click',()=>setTimeout(render,100));
  document.getElementById('sideNewTrip')?.addEventListener('click',()=>setTimeout(render,200));
  document.getElementById('sidebarTripList')?.addEventListener('click',()=>setTimeout(render,450));
  new MutationObserver(()=>{clearTimeout(window.__tripExtrasRenderTimer);window.__tripExtrasRenderTimer=setTimeout(render,180)}).observe(document.getElementById('travelCity'),{attributes:true,attributeFilter:['value']});
})();
