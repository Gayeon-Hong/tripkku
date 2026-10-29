// TRIPKKU language/currency presets. Country is confirmed by the user; city inference is only a suggestion.
export const LANGUAGES = {
  ja:['일본어','ja-JP'],en:['영어','en-US'],th:['태국어','th-TH'],vi:['베트남어','vi-VN'],
  'zh-TW':['중국어(번체)','zh-TW'],'zh-CN':['중국어(간체)','zh-CN'],fr:['프랑스어','fr-FR'],
  it:['이탈리아어','it-IT'],es:['스페인어','es-ES'],de:['독일어','de-DE'],id:['인도네시아어','id-ID'],
  ms:['말레이어','ms-MY'],tl:['필리핀어','fil-PH'],tr:['튀르키예어','tr-TR'],ar:['아랍어','ar-AE'],
  pt:['포르투갈어','pt-PT'],ru:['러시아어','ru-RU'],hi:['힌디어','hi-IN'],ko:['한국어','ko-KR'],
  nl:['네덜란드어','nl-NL'],el:['그리스어','el-GR'],cs:['체코어','cs-CZ'],pl:['폴란드어','pl-PL'],
  sv:['스웨덴어','sv-SE'],fi:['핀란드어','fi-FI'],hu:['헝가리어','hu-HU'],
  km:['크메르어','km-KH'],lo:['라오어','lo-LA'],my:['미얀마어','my-MM'],ne:['네팔어','ne-NP'],
  si:['싱할라어','si-LK'],bn:['벵골어','bn-BD'],ur:['우르두어','ur-PK'],he:['히브리어','he-IL'],
  sw:['스와힐리어','sw-KE'],af:['아프리칸스어','af-ZA'],no:['노르웨이어','nb-NO'],da:['덴마크어','da-DK'],
  is:['아이슬란드어','is-IS'],hr:['크로아티아어','hr-HR'],sk:['슬로바키아어','sk-SK'],
  sl:['슬로베니아어','sl-SI'],ro:['루마니아어','ro-RO'],uk:['우크라이나어','uk-UA']
};
export const COUNTRIES = [
 ['JP','일본','🇯🇵','JPY','ja',['ja','en']],['KR','대한민국','🇰🇷','KRW','ko',['ko','en']],
 ['TH','태국','🇹🇭','THB','th',['th','en']],['VN','베트남','🇻🇳','VND','vi',['vi','en']],
 ['TW','대만','🇹🇼','TWD','zh-TW',['zh-TW','en']],['CN','중국','🇨🇳','CNY','zh-CN',['zh-CN','en']],
 ['HK','홍콩','🇭🇰','HKD','zh-TW',['zh-TW','en']],['SG','싱가포르','🇸🇬','SGD','en',['en','zh-CN','ms']],
 ['ID','인도네시아','🇮🇩','IDR','id',['id','en']],['MY','말레이시아','🇲🇾','MYR','ms',['ms','en','zh-CN']],
 ['PH','필리핀','🇵🇭','PHP','en',['en','tl']],['US','미국','🇺🇸','USD','en',['en']],
 ['CA','캐나다','🇨🇦','CAD','en',['en','fr']],['GB','영국','🇬🇧','GBP','en',['en']],
 ['AU','호주','🇦🇺','AUD','en',['en']],['NZ','뉴질랜드','🇳🇿','NZD','en',['en']],
 ['IT','이탈리아','🇮🇹','EUR','it',['it','en']],['FR','프랑스','🇫🇷','EUR','fr',['fr','en']],
 ['DE','독일','🇩🇪','EUR','de',['de','en']],['ES','스페인','🇪🇸','EUR','es',['es','en']],
 ['PT','포르투갈','🇵🇹','EUR','pt',['pt','en']],['CH','스위스','🇨🇭','CHF','de',['de','fr','it','en']],
 ['NL','네덜란드','🇳🇱','EUR','nl',['nl','en']],['GR','그리스','🇬🇷','EUR','el',['el','en']],
 ['CZ','체코','🇨🇿','CZK','cs',['cs','en']],['PL','폴란드','🇵🇱','PLN','pl',['pl','en']],
 ['TR','튀르키예','🇹🇷','TRY','tr',['tr','en']],['AE','아랍에미리트','🇦🇪','AED','ar',['ar','en']],
 ['IN','인도','🇮🇳','INR','hi',['hi','en']],['RU','러시아','🇷🇺','RUB','ru',['ru','en']],
 ['SE','스웨덴','🇸🇪','SEK','sv',['sv','en']],['FI','핀란드','🇫🇮','EUR','fi',['fi','en']],
 ['HU','헝가리','🇭🇺','HUF','hu',['hu','en']],
 ['KH','캄보디아','🇰🇭','KHR','km',['km','en']],['LA','라오스','🇱🇦','LAK','lo',['lo','en']],
 ['MM','미얀마','🇲🇲','MMK','my',['my','en']],['NP','네팔','🇳🇵','NPR','ne',['ne','en']],
 ['LK','스리랑카','🇱🇰','LKR','si',['si','en']],['BD','방글라데시','🇧🇩','BDT','bn',['bn','en']],
 ['PK','파키스탄','🇵🇰','PKR','ur',['ur','en']],['IL','이스라엘','🇮🇱','ILS','he',['he','en']],
 ['SA','사우디아라비아','🇸🇦','SAR','ar',['ar','en']],['EG','이집트','🇪🇬','EGP','ar',['ar','en']],
 ['MA','모로코','🇲🇦','MAD','ar',['ar','fr','en']],['MX','멕시코','🇲🇽','MXN','es',['es','en']],
 ['BR','브라질','🇧🇷','BRL','pt',['pt','en']],['AR','아르헨티나','🇦🇷','ARS','es',['es','en']],
 ['PE','페루','🇵🇪','PEN','es',['es','en']],['CL','칠레','🇨🇱','CLP','es',['es','en']],
 ['ZA','남아프리카공화국','🇿🇦','ZAR','en',['en','af']],['KE','케냐','🇰🇪','KES','sw',['sw','en']],
 ['TZ','탄자니아','🇹🇿','TZS','sw',['sw','en']],['NO','노르웨이','🇳🇴','NOK','no',['no','en']],
 ['DK','덴마크','🇩🇰','DKK','da',['da','en']],['IS','아이슬란드','🇮🇸','ISK','is',['is','en']],
 ['IE','아일랜드','🇮🇪','EUR','en',['en']],['AT','오스트리아','🇦🇹','EUR','de',['de','en']],
 ['BE','벨기에','🇧🇪','EUR','fr',['fr','nl','de','en']],['HR','크로아티아','🇭🇷','EUR','hr',['hr','en']],
 ['SK','슬로바키아','🇸🇰','EUR','sk',['sk','en']],['SI','슬로베니아','🇸🇮','EUR','sl',['sl','en']],
 ['RO','루마니아','🇷🇴','RON','ro',['ro','en']],['UA','우크라이나','🇺🇦','UAH','uk',['uk','en']]
].map(([code,name,flag,currency,language,languages])=>({code,name,flag,currency,language,languages}));
export const BY_COUNTRY=Object.fromEntries(COUNTRIES.map(c=>[c.code,c]));
const MATCH = [
 ['JP',/일본|도쿄|오사카|오이타|벳푸|유후인|후쿠오카|삿포로|교토|나고야|tokyo|osaka|fukuoka|kyoto|beppu|oita|yufuin/i],
 ['TW',/대만|타이베이|가오슝|taipei|kaohsiung/i],['TH',/태국|방콕|치앙마이|푸켓|bangkok|chiang mai|phuket/i],
 ['VN',/베트남|하노이|다낭|호치민|hanoi|danang|ho chi minh/i],['IT',/이탈리아|로마|밀라노|피렌체|베네치아|나폴리|rome|milan|florence|venice/i],
 ['FR',/프랑스|파리|니스|리옹|paris|nice france|lyon/i],['ES',/스페인|바르셀로나|마드리드|barcelona|madrid/i],
 ['US',/미국|뉴욕|로스앤젤레스|샌프란시스코|new york|los angeles|san francisco/i],
 ['GB',/영국|런던|에든버러|london|edinburgh/i],['CN',/중국|베이징|상하이|北京|上海|beijing|shanghai/i],
 ['HK',/홍콩|hong kong/i],['SG',/싱가포르|singapore/i],['ID',/인도네시아|발리|자카르타|bali|jakarta/i],
 ['MY',/말레이시아|쿠알라룸푸르|kuala lumpur/i],['PH',/필리핀|세부|마닐라|cebu|manila/i],
 ['AU',/호주|시드니|멜버른|sydney|melbourne/i],['DE',/독일|베를린|뮌헨|berlin|munich/i],
 ['CH',/스위스|취리히|루체른|인터라켄|zurich|lucerne|interlaken/i],['TR',/튀르키예|이스탄불|카파도키아|istanbul|cappadocia/i]
];
export function suggestCountry(destination){const matches=MATCH.filter(([,re])=>re.test(destination||''));return matches.length===1?matches[0][0]:'';}
export function languageLabel(code){return LANGUAGES[code]?.[0]||code;}
export function countryInfo(code){return BY_COUNTRY[code]||BY_COUNTRY.JP;}
