// =====================================================================
// [공안] 집회 장소 → 검찰청 관할 분류기 (전국 관할표 내장)
//  * 시·도(지역) 스코프로 구/시군명을 검찰청에 매핑한다(구 이름 중복 해소).
//  * 구체 장소(구·시군)를 알면 정확 분류, 광역 단위만 알면 대표 지검으로 묶고
//    복수청 지역은 needsHumanReview=true 로 표기한다.
// =====================================================================

// 지역(시·도) → (자치구/시군 → 검찰청명). 검찰청명은 DB ProsecutionOffice.name 과 일치.
export const REGION_DISTRICT_OFFICE: Record<string, Record<string, string>> = {
  서울: {
    종로구: "서울중앙지방검찰청", 중구: "서울중앙지방검찰청", 서초구: "서울중앙지방검찰청",
    강남구: "서울중앙지방검찰청", 동작구: "서울중앙지방검찰청", 관악구: "서울중앙지방검찰청",
    성동구: "서울동부지방검찰청", 광진구: "서울동부지방검찰청", 강동구: "서울동부지방검찰청", 송파구: "서울동부지방검찰청",
    영등포구: "서울남부지방검찰청", 양천구: "서울남부지방검찰청", 강서구: "서울남부지방검찰청", 구로구: "서울남부지방검찰청", 금천구: "서울남부지방검찰청",
    동대문구: "서울북부지방검찰청", 중랑구: "서울북부지방검찰청", 성북구: "서울북부지방검찰청", 도봉구: "서울북부지방검찰청", 강북구: "서울북부지방검찰청", 노원구: "서울북부지방검찰청",
    마포구: "서울서부지방검찰청", 용산구: "서울서부지방검찰청", 은평구: "서울서부지방검찰청", 서대문구: "서울서부지방검찰청",
  },
  부산: {
    중구: "부산지방검찰청", 동구: "부산지방검찰청", 서구: "부산지방검찰청", 영도구: "부산지방검찰청",
    부산진구: "부산지방검찰청", 연제구: "부산지방검찰청", 사상구: "부산지방검찰청",
    남구: "부산동부지청", 수영구: "부산동부지청", 해운대구: "부산동부지청", 금정구: "부산동부지청", 동래구: "부산동부지청", 기장군: "부산동부지청",
    북구: "부산서부지청", 강서구: "부산서부지청", 사하구: "부산서부지청",
  },
  대구: {
    중구: "대구지방검찰청", 동구: "대구지방검찰청", 남구: "대구지방검찰청", 북구: "대구지방검찰청", 수성구: "대구지방검찰청", 군위군: "대구지방검찰청",
    서구: "대구서부지청", 달서구: "대구서부지청", 달성군: "대구서부지청",
  },
  인천: {
    중구: "인천지방검찰청", 동구: "인천지방검찰청", 미추홀구: "인천지방검찰청", 연수구: "인천지방검찰청",
    남동구: "인천지방검찰청", 부평구: "인천지방검찰청", 계양구: "인천지방검찰청", 서구: "인천지방검찰청",
    옹진군: "인천지방검찰청", 강화군: "인천지방검찰청",
  },
  광주: {
    동구: "광주지방검찰청", 서구: "광주지방검찰청", 남구: "광주지방검찰청", 북구: "광주지방검찰청", 광산구: "광주지방검찰청",
    나주시: "광주지방검찰청", 화순군: "광주지방검찰청", 장성군: "광주지방검찰청", 담양군: "광주지방검찰청", 곡성군: "광주지방검찰청", 영광군: "광주지방검찰청",
  },
  대전: {
    동구: "대전지방검찰청", 중구: "대전지방검찰청", 서구: "대전지방검찰청", 유성구: "대전지방검찰청", 대덕구: "대전지방검찰청",
    세종특별자치시: "대전지방검찰청", 세종시: "대전지방검찰청", 금산군: "대전지방검찰청", 계룡시: "대전지방검찰청",
  },
  세종: { 세종특별자치시: "대전지방검찰청", 세종시: "대전지방검찰청" },
  울산: {
    중구: "울산지방검찰청", 남구: "울산지방검찰청", 동구: "울산지방검찰청", 북구: "울산지방검찰청", 울주군: "울산지방검찰청", 양산시: "울산지방검찰청",
  },
  경기남부: {
    수원시: "수원지방검찰청", 용인시: "수원지방검찰청", 화성시: "수원지방검찰청", 오산시: "수원지방검찰청",
    성남시: "성남지청", 하남시: "성남지청", 광주시: "성남지청",
    여주시: "여주지청", 이천시: "여주지청", 양평군: "여주지청",
    평택시: "평택지청", 안성시: "평택지청",
    안산시: "안산지청", 광명시: "안산지청", 시흥시: "안산지청",
    안양시: "안양지청", 과천시: "안양지청", 의왕시: "안양지청", 군포시: "안양지청",
    부천시: "부천지청", 김포시: "부천지청",
  },
  경기북부: {
    의정부시: "의정부지방검찰청", 양주시: "의정부지방검찰청", 동두천시: "의정부지방검찰청", 포천시: "의정부지방검찰청", 연천군: "의정부지방검찰청",
    고양시: "고양지청", 파주시: "고양지청",
    남양주시: "남양주지청", 구리시: "남양주지청", 가평군: "남양주지청",
  },
  강원: {
    춘천시: "춘천지방검찰청", 홍천군: "춘천지방검찰청", 화천군: "춘천지방검찰청", 양구군: "춘천지방검찰청", 철원군: "춘천지방검찰청",
    강릉시: "강릉지청", 동해시: "강릉지청", 삼척시: "강릉지청",
    원주시: "원주지청", 횡성군: "원주지청",
    속초시: "속초지청", 고성군: "속초지청", 양양군: "속초지청",
    태백시: "영월지청", 영월군: "영월지청", 정선군: "영월지청", 평창군: "영월지청",
  },
  충북: {
    청주시: "청주지방검찰청", 진천군: "청주지방검찰청", 괴산군: "청주지방검찰청", 증평군: "청주지방검찰청", 보은군: "청주지방검찰청", 옥천군: "청주지방검찰청", 영동군: "청주지방검찰청",
    충주시: "충주지청", 음성군: "충주지청",
    제천시: "제천지청", 단양군: "제천지청",
  },
  충남: {
    홍성군: "홍성지청", 예산군: "홍성지청", 보령시: "홍성지청", 서천군: "홍성지청",
    공주시: "공주지청", 청양군: "공주지청",
    논산시: "논산지청", 부여군: "논산지청",
    서산시: "서산지청", 태안군: "서산지청", 당진시: "서산지청",
    천안시: "천안지청", 아산시: "천안지청",
  },
  전북: {
    전주시: "전주지방검찰청", 완주군: "전주지방검찰청", 진안군: "전주지방검찰청", 무주군: "전주지방검찰청", 임실군: "전주지방검찰청", 장수군: "전주지방검찰청",
    군산시: "군산지청", 익산시: "군산지청",
    정읍시: "정읍지청", 고창군: "정읍지청", 부안군: "정읍지청",
    남원시: "남원지청", 순창군: "남원지청",
  },
  전남: {
    목포시: "목포지청", 무안군: "목포지청", 신안군: "목포지청", 함평군: "목포지청", 영암군: "목포지청",
    장흥군: "장흥지청", 강진군: "장흥지청",
    순천시: "순천지청", 여수시: "순천지청", 광양시: "순천지청", 고흥군: "순천지청", 보성군: "순천지청", 구례군: "순천지청",
    해남군: "해남지청", 완도군: "해남지청", 진도군: "해남지청",
    나주시: "광주지방검찰청", 화순군: "광주지방검찰청", 장성군: "광주지방검찰청", 담양군: "광주지방검찰청", 곡성군: "광주지방검찰청", 영광군: "광주지방검찰청",
  },
  경북: {
    경산시: "대구지방검찰청", 영천시: "대구지방검찰청", 청도군: "대구지방검찰청", 칠곡군: "대구지방검찰청",
    성주군: "대구서부지청", 고령군: "대구서부지청",
    안동시: "안동지청", 영주시: "안동지청", 봉화군: "안동지청",
    의성군: "의성지청", 청송군: "의성지청", 영양군: "의성지청",
    경주시: "경주지청",
    포항시: "포항지청", 울릉군: "포항지청",
    김천시: "김천지청", 구미시: "김천지청",
    상주시: "상주지청", 문경시: "상주지청", 예천군: "상주지청",
    영덕군: "영덕지청", 울진군: "영덕지청",
  },
  경남: {
    창원시: "창원지방검찰청", 의창구: "창원지방검찰청", 성산구: "창원지방검찰청", 김해시: "창원지방검찰청", 함안군: "창원지방검찰청", 의령군: "창원지방검찰청",
    마산합포구: "마산지청", 마산회원구: "마산지청",
    진주시: "진주지청", 사천시: "진주지청", 남해군: "진주지청", 하동군: "진주지청", 산청군: "진주지청",
    통영시: "통영지청", 거제시: "통영지청", 고성군: "통영지청",
    밀양시: "밀양지청", 창녕군: "밀양지청",
    거창군: "거창지청", 함양군: "거창지청", 합천군: "거창지청",
  },
  제주: { 제주시: "제주지방검찰청", 서귀포시: "제주지방검찰청", 제주특별자치도: "제주지방검찰청" },
};

// 주요 집회 장소(랜드마크) → 검찰청. 제목에 구·시군 대신 장소명이 오는 경우 보강.
//  * 물리적 장소로만 쓰이는, 오인 위험 낮은 명칭만 포함(인물·비유 표현 배제).
export const LANDMARK_OFFICE: Record<string, string> = {
  광화문: "서울중앙지방검찰청",
  서울광장: "서울중앙지방검찰청",
  시청광장: "서울중앙지방검찰청",
  덕수궁: "서울중앙지방검찰청",
  대학로: "서울중앙지방검찰청",
  혜화역: "서울중앙지방검찰청",
  강남역: "서울중앙지방검찰청",
  여의도: "서울남부지방검찰청",
  국회: "서울남부지방검찰청", // 국회의사당(여의도)
  정부서울청사: "서울중앙지방검찰청",
  잠실: "서울동부지방검찰청",
  올림픽공원: "서울동부지방검찰청", // 송파구
  홍대입구: "서울서부지방검찰청", // 마포구
  홍대: "서울서부지방검찰청", // 마포구
  한남동: "서울서부지방검찰청",
  용산대통령실: "서울서부지방검찰청",
  // 대통령실·청와대 앞 집회 → 서울중앙지방검찰청 (2026-07-28 지시)
  대통령실: "서울중앙지방검찰청",
  청와대: "서울중앙지방검찰청",
  // 주요 지역·산업단지(소재 시·군 관할)
  판교: "성남지청", // 성남시 분당구 판교(카카오 등)
  분당: "성남지청",
  정자동: "성남지청",
  // ── 주요 기업 사업장 → 실제 발생지 관할 (노조 집회·파업 보도, 2026-07-28 보강) ──
  카카오: "성남지청", // 판교 본사
  카카오모빌리티: "성남지청",
  카카오엔터프라이즈: "성남지청",
  네이버: "성남지청", // 분당 그린팩토리
  엔씨소프트: "성남지청",
  현대차울산: "울산지방검찰청",
  현대자동차울산: "울산지방검찰청",
  울산공장: "울산지방검찰청",
  현대중공업: "울산지방검찰청",
  포항제철소: "포항지청",
  광양제철소: "순천지청",
  거제조선소: "통영지청",
  한화오션: "통영지청",
  군산조선소: "군산지청",
  평택공장: "평택지청",
  아산공장: "천안지청",
  // 광역 관공서(도청/정부청사) → 소재지 관할
  전남도청: "목포지청", // 무안 남악
  경남도청: "창원지방검찰청",
  경북도청: "안동지청",
  충남도청: "홍성지청", // 홍성 내포
  전북도청: "전주지방검찰청",
  충북도청: "청주지방검찰청",
  경기도청: "수원지방검찰청",
  강원도청: "춘천지방검찰청",
  정부세종청사: "대전지방검찰청",
  정부대전청사: "대전지방검찰청",
};

// 지역 → 대표(본청 또는 단일) 검찰청. single=true 면 지역만으로 관할 확정.
export const REGION_HEAD_OFFICE: Record<string, { office: string; single: boolean }> = {
  서울: { office: "서울중앙지방검찰청", single: false },
  부산: { office: "부산지방검찰청", single: false },
  대구: { office: "대구지방검찰청", single: false },
  인천: { office: "인천지방검찰청", single: true },
  광주: { office: "광주지방검찰청", single: true },
  대전: { office: "대전지방검찰청", single: true },
  울산: { office: "울산지방검찰청", single: true },
  세종: { office: "대전지방검찰청", single: true },
  경기남부: { office: "수원지방검찰청", single: false },
  경기북부: { office: "의정부지방검찰청", single: false },
  강원: { office: "춘천지방검찰청", single: false },
  충북: { office: "청주지방검찰청", single: false },
  충남: { office: "대전지방검찰청", single: false },
  전북: { office: "전주지방검찰청", single: false },
  전남: { office: "광주지방검찰청", single: false },
  경북: { office: "대구지방검찰청", single: false },
  경남: { office: "창원지방검찰청", single: false },
  제주: { office: "제주지방검찰청", single: true },
};

const REGION_KEYS = Object.keys(REGION_HEAD_OFFICE);

// 최상위(고검 트리 위): 법무부/대검찰청(통합)
export const TOP_OFFICES = ["법무부/대검찰청"];

// 고등검찰청 → 산하 지검/지청 (사용자 지정 정렬 순서, DB 명칭 기준)
export const HIGH_PROSECUTION_TREE: { high: string; offices: string[] }[] = [
  {
    high: "서울고등검찰청",
    offices: [
      "서울중앙지방검찰청", "서울동부지방검찰청", "서울남부지방검찰청", "서울북부지방검찰청", "서울서부지방검찰청",
      "의정부지방검찰청", "고양지청", "남양주지청",
      "인천지방검찰청", "부천지청",
      "춘천지방검찰청", "강릉지청", "원주지청", "속초지청", "영월지청",
    ],
  },
  { high: "수원고등검찰청", offices: ["수원지방검찰청", "성남지청", "여주지청", "평택지청", "안산지청", "안양지청"] },
  {
    high: "대전고등검찰청",
    offices: [
      "대전지방검찰청", "홍성지청", "공주지청", "논산지청", "서산지청", "천안지청",
      "청주지방검찰청", "충주지청", "제천지청", "영동지청",
    ],
  },
  {
    high: "대구고등검찰청",
    offices: [
      "대구지방검찰청", "안동지청", "경주지청", "김천지청", "상주지청", "의성지청", "영덕지청", "포항지청", "대구서부지청",
    ],
  },
  {
    high: "부산고등검찰청",
    offices: [
      "부산지방검찰청", "부산동부지청", "부산서부지청",
      "창원지방검찰청", "진주지청", "통영지청", "밀양지청", "거창지청", "마산지청",
      "울산지방검찰청",
    ],
  },
  {
    high: "광주고등검찰청",
    offices: [
      "광주지방검찰청", "목포지청", "장흥지청", "순천지청", "해남지청",
      "전주지방검찰청", "군산지청", "정읍지청", "남원지청",
      "제주지방검찰청",
    ],
  },
];

/** 검찰청명 → 정렬 순번(법무부 → 대검 → 고검-지검-지청 순) */
export const OFFICE_ORDER: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  let i = 0;
  for (const o of TOP_OFFICES) m[o] = i++;
  // 각 그룹: 고검(고등검찰청) → 산하 지검·지청 순(조직체계 순서). 고검 자체도 순번에 포함.
  for (const g of HIGH_PROSECUTION_TREE) { m[g.high] = i++; for (const o of g.offices) m[o] = i++; }
  return m;
})();

/** 검찰청명 → 소속 상위(고검 또는 법무부/대검) */
export const OFFICE_TO_HIGH: Record<string, string> = (() => {
  const m: Record<string, string> = { "법무부/대검찰청": "법무부/대검찰청" };
  for (const g of HIGH_PROSECUTION_TREE) { m[g.high] = g.high; for (const o of g.offices) m[o] = g.high; }
  return m;
})();

// 전국 유니크 시군/구명 → 검찰청 (지역 모를 때). 여러 청에 걸치는 모호 키는 제외.
const NATIONWIDE_UNIQUE: Record<string, string> = (() => {
  const counts = new Map<string, Set<string>>();
  for (const region of Object.keys(REGION_DISTRICT_OFFICE)) {
    for (const [k, office] of Object.entries(REGION_DISTRICT_OFFICE[region])) {
      if (!counts.has(k)) counts.set(k, new Set());
      counts.get(k)!.add(office);
    }
  }
  const out: Record<string, string> = {};
  for (const [k, offices] of counts) {
    if (offices.size === 1) out[k] = [...offices][0];
  }
  return out;
})();

// 하위호환 export
export const SEOUL_DISTRICT_TO_OFFICE = REGION_DISTRICT_OFFICE["서울"];
export const DEFAULT_OFFICE_NAME = "서울중앙지방검찰청";

export interface JurisdictionOfficeLite {
  id: string;
  name: string;
  searchKeywords: string[];
  policeStations: string[];
  jurisdictionText?: string;
}

export interface JurisdictionInput {
  locationName: string;
  address?: string;
  district?: string;
  policeStationName?: string;
  /** 시·도(예: "서울","경기남부") — 크롤 출처에서 전달. 없으면 텍스트에서 추정 */
  region?: string;
}

export interface JurisdictionResult {
  officeId?: string;
  officeName?: string;
  confidence: number;
  reason: string;
  /** ADDRESS | DISTRICT | POLICE | OFFICE_TABLE | REGION | UNRESOLVED | MANUAL */
  method: string;
  needsHumanReview: boolean;
}

function findOfficeByName(offices: JurisdictionOfficeLite[], name: string) {
  return offices.find((o) => o.name === name);
}

/** 텍스트에서 시·도(지역) 추정 */
export function detectRegion(...texts: (string | undefined)[]): string | undefined {
  const t = texts.filter(Boolean).join(" ");
  if (!t) return undefined;
  // 직접 지역키 일치 우선(경기남부/북부 먼저)
  for (const r of REGION_KEYS) if (t.includes(r)) return r;
  // 광역시/도 별칭
  if (/서울/.test(t)) return "서울";
  if (/부산/.test(t)) return "부산";
  if (/대구/.test(t)) return "대구";
  if (/인천/.test(t)) return "인천";
  if (/광주/.test(t)) return "광주";
  if (/대전/.test(t)) return "대전";
  if (/울산/.test(t)) return "울산";
  if (/세종/.test(t)) return "세종";
  if (/강원/.test(t)) return "강원";
  if (/충청북도|충북/.test(t)) return "충북";
  if (/충청남도|충남/.test(t)) return "충남";
  if (/전라북도|전북/.test(t)) return "전북";
  if (/전라남도|전남/.test(t)) return "전남";
  if (/경상북도|경북/.test(t)) return "경북";
  if (/경상남도|경남/.test(t)) return "경남";
  if (/제주/.test(t)) return "제주";
  return undefined;
}

// 시/군/구 키 뒤에 붙어 다른 단어를 이루는 글자(오매칭 방지): 시장(市長)/시민/시의회/군수/구청장 등
const BAD_NEXT_AFTER_SI = new Set(["장", "민", "의", "도", "립"]); // 시장·시민·시의회·시도·시립
const BAD_NEXT_AFTER_GUN = new Set(["수"]); // 군수
function hasWordBoundary(text: string, key: string, idx: number): boolean {
  const after = text[idx + key.length] ?? "";
  if (key.endsWith("시") && BAD_NEXT_AFTER_SI.has(after)) return false;
  if (key.endsWith("군") && BAD_NEXT_AFTER_GUN.has(after)) return false;
  return true;
}

/** 텍스트에서 region 맵의 구/시군 키 중 가장 먼저 등장하는 것을 찾음(단어 경계 확인) */
function findKeyInText(map: Record<string, string>, text: string, excludeRegion = ""): string | undefined {
  let best: { key: string; idx: number } | null = null;
  for (const key of Object.keys(map)) {
    if (key.length < 2 || key === excludeRegion) continue;
    const idx = text.indexOf(key);
    if (idx >= 0 && hasWordBoundary(text, key, idx) && (best === null || idx < best.idx)) {
      best = { key, idx };
    }
  }
  return best?.key;
}

/**
 * 집회 장소 기준 관할 분류 (전국 관할표).
 * 우선순위:
 *  1) 지역 스코프 구/시군 매핑           (0.92, DISTRICT)
 *  2) 전국 유니크 시군/구 매핑           (0.85, DISTRICT)
 *  3) 관할 경찰서명 → office.policeStations (0.7, POLICE)
 *  4) 지역 대표청(단일=0.85 / 복수=0.5)   (REGION)
 *  5) 검찰청 관할표 searchKeywords         (0.6, OFFICE_TABLE)
 *  6) 미특정 — 검토 필요                  (0.3, UNRESOLVED)
 */
export function classifyAssemblyJurisdiction(
  input: JurisdictionInput,
  offices: JurisdictionOfficeLite[],
  opts: { skipKeywordTable?: boolean } = {},
): JurisdictionResult {
  const text = [input.locationName, input.address, input.district].filter(Boolean).join(" ");
  const region = input.region || detectRegion(input.district, input.address, input.locationName);

  // 0) 주요 집회 장소(랜드마크) — 제목에 구·시군 대신 장소명이 오는 경우
  {
    let best: { kw: string; idx: number } | null = null;
    for (const kw of Object.keys(LANDMARK_OFFICE)) {
      const idx = text.indexOf(kw);
      if (idx >= 0 && (best === null || idx < best.idx)) best = { kw, idx };
    }
    if (best) {
      const officeName = LANDMARK_OFFICE[best.kw];
      const office = findOfficeByName(offices, officeName);
      return finalize({
        officeId: office?.id, officeName, confidence: 0.9,
        reason: `발생 장소(${best.kw}) 기준 ${officeName} 분류`, method: "DISTRICT",
      });
    }
  }

  // 1) 지역 스코프 구/시군
  if (region && REGION_DISTRICT_OFFICE[region]) {
    const key = findKeyInText(REGION_DISTRICT_OFFICE[region], text, region);
    if (key) {
      const officeName = REGION_DISTRICT_OFFICE[region][key];
      const office = findOfficeByName(offices, officeName);
      return finalize({
        officeId: office?.id, officeName, confidence: 0.92,
        reason: `${region} ${key} 관할로 ${officeName} 분류`,
        method: input.address?.includes(key) ? "ADDRESS" : "DISTRICT",
      });
    }
  }

  // 2) 전국 유니크 시군/구
  const uniqueKey = findKeyInText(NATIONWIDE_UNIQUE, text);
  if (uniqueKey) {
    const officeName = NATIONWIDE_UNIQUE[uniqueKey];
    const office = findOfficeByName(offices, officeName);
    return finalize({
      officeId: office?.id, officeName, confidence: 0.85,
      reason: `${uniqueKey} 관할로 ${officeName} 분류`,
      method: "DISTRICT",
    });
  }

  // 3) 관할 경찰서
  if (input.policeStationName) {
    const ps = input.policeStationName.trim();
    const matched = offices.find((o) => o.policeStations.some((s) => s && (s.includes(ps) || ps.includes(s))));
    if (matched) {
      return finalize({
        officeId: matched.id, officeName: matched.name, confidence: 0.7,
        reason: `관할 경찰서(${ps}) 기준 ${matched.name} 분류`, method: "POLICE",
      });
    }
  }

  // 4) 지역 대표청
  if (region && REGION_HEAD_OFFICE[region]) {
    const head = REGION_HEAD_OFFICE[region];
    const office = findOfficeByName(offices, head.office);
    return finalize({
      officeId: office?.id, officeName: head.office,
      confidence: head.single ? 0.85 : 0.5,
      reason: head.single
        ? `${region} 지역은 ${head.office} 단독 관할`
        : `${region} 광역 단위 공지 — 대표청 ${head.office}로 분류(구체 구·시군은 게시물 확인 필요)`,
      method: "REGION",
    });
  }

  // 5) 검찰청 관할표 키워드 (뉴스 본문 등 노이즈 많은 입력에선 skipKeywordTable 로 생략)
  const locTokens = opts.skipKeywordTable ? "" : `${input.locationName ?? ""} ${input.address ?? ""}`.trim();
  if (locTokens) {
    const matched = offices.find((o) => o.searchKeywords.some((k) => k && k.length >= 2 && locTokens.includes(k)));
    if (matched) {
      const hit = matched.searchKeywords.find((k) => k && k.length >= 2 && locTokens.includes(k));
      return finalize({
        officeId: matched.id, officeName: matched.name, confidence: 0.6,
        reason: `검찰청 관할표 키워드(${hit}) 일치로 ${matched.name} 분류`, method: "OFFICE_TABLE",
      });
    }
  }

  // 6) 미특정
  return finalize({
    officeId: undefined, officeName: undefined, confidence: 0.3,
    reason: "장소·행정구·관할 경찰서 정보로 관할을 특정하지 못함 — 담당자 검토 필요",
    method: "UNRESOLVED",
  });
}

function finalize(r: Omit<JurisdictionResult, "needsHumanReview">): JurisdictionResult {
  return { ...r, needsHumanReview: r.confidence < 0.7 };
}

/** 검찰청명 → 대응 법원명 후보(부산지방검찰청→부산지방법원/부산지법, 성남지청→성남지원) */
function courtNamesFor(officeName: string): string[] {
  if (officeName.endsWith("지방검찰청")) {
    const b = officeName.replace("지방검찰청", "");
    return [`${b}지방법원`, `${b}지법`];
  }
  if (officeName.endsWith("지청")) {
    const b = officeName.replace("지청", "");
    return [`${b}지원`]; // 예: 성남지원, 부산동부지원
  }
  return [];
}

/**
 * 본문에서 '발생 장소' 기준 관할 검찰청을 모두 추출(중복 장소 → 복수 관할).
 *  * 랜드마크 + 전국 유니크 구/시군명(경계검사). 인물·직함 등 모호 매칭은 제외.
 *  * 한 기사에 여러 지역이 나오면 해당 관할들을 모두 반환한다.
 */
/** 검찰청명 → 대응 법원/지원/고법 별칭 (부산지방검찰청→부산지법/부산지방법원, 성남지청→성남지원) */
function courtAliasesFor(officeName: string): string[] {
  if (officeName === "법무부/대검찰청") return ["대법원"]; // 대법원 선고 공판 → 법무부/대검찰청
  if (officeName.endsWith("지방검찰청")) {
    const b = officeName.replace("지방검찰청", "");
    return [`${b}지방법원`, `${b}지법`];
  }
  if (officeName.endsWith("지청")) {
    const b = officeName.replace("지청", "");
    return [`${b}지원`];
  }
  if (officeName.endsWith("고등검찰청")) {
    const b = officeName.replace("고등검찰청", "");
    return [`${b}고등법원`, `${b}고법`];
  }
  return [];
}

// 시·도 지방경찰청 → 대표 지방검찰청(해당 지방청이 수사한 사건의 관할 검찰청)
const POLICE_AGENCY_OFFICE: Record<string, string> = {
  "서울경찰청": "서울중앙지방검찰청", "서울지방경찰청": "서울중앙지방검찰청",
  "부산경찰청": "부산지방검찰청",
  "대구경찰청": "대구지방검찰청",
  "인천경찰청": "인천지방검찰청",
  "광주경찰청": "광주지방검찰청",
  "대전경찰청": "대전지방검찰청",
  "울산경찰청": "울산지방검찰청",
  "세종경찰청": "대전지방검찰청",
  "경기남부경찰청": "수원지방검찰청",
  "경기북부경찰청": "의정부지방검찰청",
  "강원경찰청": "춘천지방검찰청", "강원특별자치도경찰청": "춘천지방검찰청",
  "충북경찰청": "청주지방검찰청",       // 청주 소재
  "충남경찰청": "홍성지청",             // 홍성(내포) 소재
  "전북경찰청": "전주지방검찰청", "전북특별자치도경찰청": "전주지방검찰청",
  "전남경찰청": "목포지청",             // 무안 소재
  "경북경찰청": "안동지청",             // 안동 소재
  "경남경찰청": "창원지방검찰청",
  "제주경찰청": "제주지방검찰청", "제주자치경찰청": "제주지방검찰청",
};

export function classifyAllOffices(
  text: string,
  offices: JurisdictionOfficeLite[],
): { officeId: string; officeName: string; hint: string }[] {
  // 모든 단서를 '본문 내 등장 위치(idx)'와 함께 수집 → 먼저 나온 단서가 주 관할
  type M = { officeId: string; officeName: string; hint: string; idx: number };
  const matches: M[] = [];
  const earliest = (cands: string[]): { hint: string; idx: number } | null => {
    let best: { hint: string; idx: number } | null = null;
    for (const c of cands) {
      if (!c || c.length < 3) continue;
      const i = text.indexOf(c);
      if (i >= 0 && (best === null || i < best.idx)) best = { hint: c, idx: i };
    }
    return best;
  };

  for (const o of offices) {
    // (a) 검찰청 직접 언급(서울남부지검/서울남부지방검찰청)
    //  ※ '법무부'는 본부(검찰개혁/장관 등)일 때만. '법무부 ○○보호관찰소/출입국/교도소' 등 필드기관은 제외(소재지 검찰청으로 가야 함)
    const direct = o.name === "법무부/대검찰청" ? ["대검찰청", "대검"] : [o.name];
    if (o.name.endsWith("지방검찰청")) direct.push(o.name.replace("지방검찰청", "지검"));
    else if (o.name.endsWith("고등검찰청")) direct.push(o.name.replace("고등검찰청", "고검"));
    const d = earliest(direct);
    if (d) matches.push({ officeId: o.id, officeName: o.name, hint: d.hint, idx: d.idx });
    if (o.name === "법무부/대검찰청") {
      const i = text.indexOf("법무부");
      if (i >= 0 && !/^법무부\s*\S{0,8}(보호관찰|출입국|교도소|구치소|소년원|범죄예방|준법지원|치료감호)/.test(text.slice(i, i + 22))) {
        matches.push({ officeId: o.id, officeName: o.name, hint: "법무부", idx: i });
      }
    }

    // (b) 대응 법원명(부산지법 → 부산지검, 성남지원 → 성남지청)
    const c = earliest(courtAliasesFor(o.name));
    if (c) matches.push({ officeId: o.id, officeName: o.name, hint: c.hint, idx: c.idx });

    // (c) 관할 경찰서(송파경찰서 → 서울동부)
    const stations: string[] = [];
    for (const ps of o.policeStations) {
      if (!ps) continue;
      const base = ps.replace(/(경찰서|서|청)$/, "");
      if (base.length >= 2) { stations.push(`${base}경찰서`, `${base}경찰청`); }
    }
    const s = earliest(stations);
    if (s) matches.push({ officeId: o.id, officeName: o.name, hint: s.hint, idx: s.idx });
  }

  // (d) 랜드마크(발생 장소)
  for (const [kw, officeName] of Object.entries(LANDMARK_OFFICE)) {
    const i = text.indexOf(kw);
    if (i >= 0) {
      const o = findOfficeByName(offices, officeName);
      if (o) matches.push({ officeId: o.id, officeName, hint: kw, idx: i });
    }
  }
  // (e) 전국 유니크 구/시군명(경계검사 — 행진도→진도 등 오매칭 방지)
  for (const [key, officeName] of Object.entries(NATIONWIDE_UNIQUE)) {
    let idx = text.indexOf(key);
    while (idx >= 0) {
      if (hasWordBoundary(text, key, idx)) {
        const o = findOfficeByName(offices, officeName);
        if (o) matches.push({ officeId: o.id, officeName, hint: key, idx });
        break;
      }
      idx = text.indexOf(key, idx + 1);
    }
  }

  // (e2) 지방경찰청(대구경찰청/대구경찰 등) → 대표 지검 (해당 청이 수사한 사건)
  for (const [kw, officeName] of Object.entries(POLICE_AGENCY_OFFICE)) {
    // 정식 표기 + '청' 생략 표기(예: "대구경찰") 모두 탐색
    const variants = [kw, kw.replace("지방경찰청", "경찰").replace("경찰청", "경찰")];
    const hit = variants.map((v) => ({ v, i: text.indexOf(v) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i)[0];
    if (hit) {
      const o = findOfficeByName(offices, officeName);
      if (o) matches.push({ officeId: o.id, officeName, hint: hit.v, idx: hit.i });
    }
  }

  // (f) 최후 폴백: 특정 구/시군/법원/경찰서 단서가 없으면 본문의 시·도 → 대표청
  //     (예: 본문에 '전북'만 있으면 전주지검, '부산'만 있으면 부산지검). idx 최대 → 다른 단서가 있으면 그게 우선.
  {
    const region = detectRegion(text);
    if (region && REGION_HEAD_OFFICE[region]) {
      const head = REGION_HEAD_OFFICE[region].office;
      const o = findOfficeByName(offices, head);
      if (o) matches.push({ officeId: o.id, officeName: head, hint: `${region} 대표청`, idx: Number.MAX_SAFE_INTEGER });
    }
  }

  // 청별로 가장 먼저 등장한 단서만 남기고, 등장 위치 오름차순 정렬(먼저 나온 관할 = 주 관할)
  const byOffice = new Map<string, M>();
  for (const m of matches) {
    const e = byOffice.get(m.officeName);
    if (!e || m.idx < e.idx) byOffice.set(m.officeName, m);
  }
  return [...byOffice.values()]
    .sort((a, b) => a.idx - b.idx)
    .map(({ officeId, officeName, hint }) => ({ officeId, officeName, hint }));
}
