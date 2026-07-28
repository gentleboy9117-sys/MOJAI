// =====================================================================
// 키워드 기반 1차 분류 규칙 (검찰청 / 범죄유형 / 검토필요)
// =====================================================================
import {
  CRIME_TAXONOMY,
  HIGH_IMPACT_KEYWORDS,
  SENSITIVE_REVIEW_KEYWORDS,
  countHits,
  countHitsBounded,
} from "./taxonomy";
import type {
  OfficeLite,
  OfficeMatchResult,
  OfficeMatchType,
  CrimeResult,
  ClassifyInput,
} from "./types";

const OFFICE_NAME_TOKENS = ["검찰청", "지검", "지청", "대검", "고검"];

function isOfficeNameKeyword(k: string): boolean {
  return OFFICE_NAME_TOKENS.some((t) => k.includes(t));
}

/** 분류용 텍스트(제목 가중 2회 + 요약 + 본문) */
export function buildHaystack(input: ClassifyInput): string {
  return [input.title, input.title, input.summary ?? "", input.fullText ?? ""].join(" \n ");
}

// 공판 = 실제 '재판 결과'(법원이 형을 선고)가 있는 기사만.
//  법원 단어 없이도 명백한 선고 표현이면 인정(STRONG), 아니면 법원+선고결과 동시 필요.
const COURT_RE = /법원|지법|고법|대법원|고등법원|지방법원|재판부|항소심|상고심|[123]심|형사\d*부/;
const VERDICT_RE = /선고|징역|금고|벌금|집행유예|실형|무죄|유죄|법정구속|선고유예|원심|파기|기각|형\s*확정/;
const STRONG_VERDICT_RE = /(징역|금고)\s*\d|집행유예|법정구속|선고유예|실형\s*선고|무죄\s*선고|유죄\s*선고|벌금형\s*선고|(항소|상고)\s*기각|원심\s*(확정|파기)|파기환송/;
// 범죄가 아닌 형사사법제도·정책(검찰개혁·보완수사권·공소청·입법/법개정·치안 인프라 등)
const POLICY_RE = /보완수사권|검찰\s*개혁|공소청|기소청|수사청|검찰\s*폐지|수사권\s*조정|검경\s*수사권|검수완박|검수원복|중수청|중대범죄수사청|검찰청법|형사소송법\s*개정|형소법\s*개정|공수처법|검찰\s*직제|검찰\s*분리|기소\s*분리|수사[·\s]*기소\s*분리|사법\s*개혁|검찰\s*조직\s*개편|공소청법|기소청법|경찰서\s*(신설|증설|설치|부재|신축)|경찰서[는가이]?\s*(왜\s*)?(아직\s*)?없|파출소\s*(신설|설치)|치안센터|치안\s*공백|형사\s*정책|사법\s*제도|수사\s*인력|법관\s*증원|검사\s*증원|자치경찰/;

// 키워드 스코어링에서 제외(오버라이드 전용 유형)
const OVERRIDE_ONLY_TYPES = new Set(["공판", "형사사법제도/정책", "기타"]);

/** 키워드 스코어로 (기저) 범죄유형 1개 선택 — 공판/정책/기타 제외 */
export function scoreCrimeCategory(text: string): { cat: string; sub: string; hits: string[]; score: number } | null {
  let best: { cat: string; sub: string; hits: string[]; score: number } | null = null;
  for (const cat of CRIME_TAXONOMY) {
    if (OVERRIDE_ONLY_TYPES.has(cat.type)) continue;
    const typeHit = countHits(text, cat.typeKeywords);
    for (const sub of cat.subtypes) {
      const subHit = countHits(text, sub.keywords);
      const score = subHit.count * 2 + typeHit.count;
      if (score > 0 && (!best || score > best.score)) {
        best = { cat: cat.type, sub: sub.name, hits: Array.from(new Set([...subHit.hits, ...typeHit.hits])), score };
      }
    }
  }
  return best;
}

// 본문에 '당일 또는 전일' 법원 선고가 있었는지 판별 → 공판 모니터링 대상 여부.
//  (과거 재판을 단순 언급한 기사는 제외; 법원+선고 표현 + 선고일이 기사일/전일과 일치)
// 가사·민사·행정 등 '형사 아님' 사건 → 공판(형사) 제외
const CIVIL_RE = /가사\s*\d*\s*부|민사\s*\d*\s*부|행정\s*\d*\s*부|가정법원|행정법원|재산\s*분할|위자료|친권|양육권|이혼\s*소송|상속\s*재산|손해배상\s*청구\s*소(송|장)|부당이득\s*반환/;
// 미래(선고 예정) 표현 → 어제/오늘 선고 아님
const FUTURE_RE = /내달|다음\s*달|오는|예정|열린다|열릴|연다|선고할|선고한다|선고된다|선고될|선고\s*기일|선고기일|선고를\s*앞|선고\s*예정/;
// 제목만으로도 '실제 형 선고'가 드러나는 강한 표현(헤드라인=그날의 선고)
const TITLE_VERDICT_RE = /(징역|금고|벌금)\s*\d|집행유예|법정구속|선고유예|실형|무죄\s*(선고|판결|확정)|유죄\s*(선고|판결|확정)|[1-3]심\s*(선고|판결)|(항소심|상고심)\s*(선고|판결|기각)|파기환송|원심\s*확정|벌금형/;

// 사건이 아닌 홍보·예방·행사·정책 기사(중대재해 예방 로드맵 등) → 범죄로 분류하지 않음
const PR_EVENT_RE = /로드맵|예방\s*(강화|대책|캠페인|교육|활동)|캠페인|업무\s*협약|협약\s*체결|\bMOU\b|간담회|토론회|세미나|포럼|학술대회|출범|선포|정조준|다짐|결의대회|비전\s*선포|안전\s*다짐|확대\s*방침|도입\s*방침|점검\s*나서|예방에\s*나서|예방하겠|근절\s*나서|행사\s*개최|박람회|공모전|위촉|발대식|기념식|축제|개막식|페스티벌|체육대회|한마당|걷기대회|음악회|전시회/;
const INCIDENT_RE = /수사|기소|입건|구속|송치|혐의|선고|판결|적발|검거|체포|구형|고발|고소|압수수색|재판|숨진|숨져|사망|다쳐|부상|범행|처벌|벌금|징역|피의자|피고|영장|덜미|기소|불구속/;

/** 사건(수사·기소·선고 등)이 아닌 홍보·예방·행사 기사면 true → 범죄 분류 제외 */
export function isNonIncidentPR(text: string): boolean {
  return PR_EVENT_RE.test(text) && !INCIDENT_RE.test(text);
}

/** 제목이 '그날의 형 선고' 헤드라인인가(미래·가사 제외) */
export function isTitleVerdict(title: string): boolean {
  if (!title) return false;
  if (FUTURE_RE.test(title) || CIVIL_RE.test(title)) return false;
  return TITLE_VERDICT_RE.test(title);
}

export function detectFreshVerdict(text: string, publishedAt: Date): boolean {
  if (CIVIL_RE.test(text)) return false; // 가사·민사 등 형사 아님
  if (!COURT_RE.test(text)) return false;
  // (1) '이미 선고됨'(과거완료) 표현이 있어야 한다 — '7월 24일 선고 예정' 같은 미래 announcement 제외
  const PAST = /선고했|선고받|선고됐|선고를\s*내렸|선고가\s*내려|내려졌|법정구속(했|됐|돼|을)|실형을?\s*선고(?!\s*(예정|할|한다|될|공판|앞))|무죄를?\s*선고(?!\s*(예정|할|한다|될|공판))|유죄를?\s*선고(?!\s*(예정|할|한다|될))|징역[^.\n]{0,12}선고(?!\s*(예정|할|한다|될|공판|앞))|집행유예[^.\n]{0,10}선고(?!\s*(예정|할|한다|될))|벌금[^.\n]{0,10}선고(?!\s*(예정|할|한다|될))|파기환송(했|됐)|원심을?\s*(확정|파기)|형을?\s*확정/;
  if (!PAST.test(text)) return false;
  const pm = publishedAt.getMonth() + 1, pd = publishedAt.getDate();
  const pv = new Date(publishedAt.getTime() - 86400000);
  const vm = pv.getMonth() + 1, vd = pv.getDate();
  // (2) 어제/오늘을 가리키는 표현
  if (/이날|오늘|금일|당일|어제|전날|하루\s*전/.test(text)) return true;
  // (3) 'M월 D일'(월·일) 이 기사일/전일과 일치
  let m: RegExpExecArray | null;
  const reMD = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/g;
  while ((m = reMD.exec(text))) {
    const mo = Number(m[1]), d = Number(m[2]);
    if ((mo === pm && d === pd) || (mo === vm && d === vd)) return true;
  }
  // (4) 월 없는 'D일' — 기사 발행 월 기준으로 기사일/전일과 일치
  const reD = /(\d{1,2})\s*일/g;
  while ((m = reD.exec(text))) {
    const d = Number(m[1]);
    if (d === pd || (vm === pm && d === vd)) return true;
  }
  return false;
}

/** 범죄유형 1차 분류 (법원 판결 관련은 '공판'으로 우선 분류) */
export function classifyCrime(input: ClassifyInput, opts: { skipTitleTrial?: boolean } = {}): CrimeResult {
  const text = buildHaystack(input);
  const underlying = scoreCrimeCategory(text); // 기저 범죄유형(공판일 때 살인/사기 등)

  // 형사사법제도·정책 우선 판정 — 사건(판결)을 배경으로 인용한 정책 기사가 공판으로 오분류되지 않게
  const policyHit = text.match(POLICY_RE);
  if (policyHit) {
    return {
      crimeType: "형사사법제도/정책",
      crimeSubtype: "형사사법제도/정책",
      confidence: 0.85,
      evidenceKeywords: [policyHit[0]],
      reason: `형사사법제도·정책 관련 표현('${policyHit[0]}') → '형사사법제도/정책'으로 분류`,
    };
  }

  // 사건이 아닌 홍보·예방·행사 기사(중대재해 예방 로드맵 등)는 범죄 아님 → 기타
  if (isNonIncidentPR(text)) {
    return { crimeType: "기타", crimeSubtype: "기타", confidence: 0.4, evidenceKeywords: [], reason: "사건(수사·기소·선고)이 아닌 홍보·예방·행사 기사 → 기타" };
  }

  // 공판: 제목에 '그날의 형 선고' 헤드라인이 있으면 인정(미래·가사 제외). 본문 기반은 reclassify-trial 가 보강.
  if (!opts.skipTitleTrial && isTitleVerdict(input.title ?? "")) {
    return {
      crimeType: "공판",
      crimeSubtype: underlying?.cat ?? "기타",
      confidence: 0.9,
      evidenceKeywords: [(input.title ?? "").match(TITLE_VERDICT_RE)?.[0] ?? "선고"],
      reason: `제목의 형 선고 표현 → '공판'(기저: ${underlying?.cat ?? "기타"})`,
    };
  }

  if (!underlying) {
    return {
      crimeType: "기타",
      crimeSubtype: "기타",
      confidence: 0.3,
      evidenceKeywords: [],
      reason: "범죄유형 키워드가 본문에서 식별되지 않아 '기타'로 분류(검토 필요)",
    };
  }

  // 신뢰도: 매칭 키워드 수 기반
  const matched = underlying.hits.length;
  const confidence = Math.min(0.95, 0.45 + matched * 0.15);
  return {
    crimeType: underlying.cat,
    crimeSubtype: underlying.sub,
    confidence: Number(confidence.toFixed(2)),
    evidenceKeywords: underlying.hits.slice(0, 8),
    reason: `본문/제목에 '${underlying.hits.slice(0, 4).join("', '")}' 키워드 포함 → ${underlying.cat}(${underlying.sub})`,
  };
}

// 법원명 → 대응 검찰청 (판결·선고 기사에서 가장 강한 관할 신호, 2026-07-28 신설)
//  지법↔지검, 지원↔지청 대응. 긴 이름부터 검사해야 '서울중앙지법'이 '서울지법'보다 먼저 잡힌다.
const COURT_TO_OFFICE: [RegExp, string][] = [
  [/서울중앙지법|서울중앙지방법원/, "서울중앙지방검찰청"],
  [/서울동부지법|서울동부지방법원/, "서울동부지방검찰청"],
  [/서울남부지법|서울남부지방법원/, "서울남부지방검찰청"],
  [/서울북부지법|서울북부지방법원/, "서울북부지방검찰청"],
  [/서울서부지법|서울서부지방법원/, "서울서부지방검찰청"],
  [/서울행정법원|서울가정법원/, "서울중앙지방검찰청"],
  [/의정부지법\s*고양지원|고양지원/, "고양지청"],
  [/의정부지법|의정부지방법원/, "의정부지방검찰청"],
  [/인천지법\s*부천지원|부천지원/, "부천지청"],
  [/인천지법|인천지방법원/, "인천지방검찰청"],
  [/수원지법\s*성남지원|성남지원/, "성남지청"],
  [/수원지법\s*안양지원|안양지원/, "안양지청"],
  [/수원지법\s*안산지원|안산지원/, "안산지청"],
  [/수원지법\s*평택지원|평택지원/, "평택지청"],
  [/수원지법\s*여주지원|여주지원/, "여주지청"],
  [/수원지법|수원지방법원/, "수원지방검찰청"],
  [/춘천지법\s*강릉지원|강릉지원/, "강릉지청"],
  [/춘천지법\s*원주지원|원주지원/, "원주지청"],
  [/춘천지법|춘천지방법원/, "춘천지방검찰청"],
  [/대전지법\s*천안지원|천안지원/, "천안지청"],
  [/대전지법\s*홍성지원|홍성지원/, "홍성지청"],
  [/대전지법|대전지방법원/, "대전지방검찰청"],
  [/청주지법\s*충주지원|충주지원/, "충주지청"],
  [/청주지법|청주지방법원/, "청주지방검찰청"],
  [/대구지법\s*서부지원|대구서부지원/, "대구서부지청"],
  [/대구지법\s*포항지원|포항지원/, "포항지청"],
  [/대구지법\s*경주지원|경주지원/, "경주지청"],
  [/대구지법\s*안동지원|안동지원/, "안동지청"],
  [/대구지법\s*김천지원|김천지원/, "김천지청"],
  [/대구지법|대구지방법원/, "대구지방검찰청"],
  [/부산지법\s*동부지원|부산동부지원/, "부산동부지청"],
  [/부산지법\s*서부지원|부산서부지원/, "부산서부지청"],
  [/부산지법|부산지방법원/, "부산지방검찰청"],
  [/울산지법|울산지방법원/, "울산지방검찰청"],
  [/창원지법\s*진주지원|진주지원/, "진주지청"],
  [/창원지법\s*통영지원|통영지원/, "통영지청"],
  [/창원지법\s*마산지원|마산지원/, "마산지청"],
  [/창원지법|창원지방법원/, "창원지방검찰청"],
  [/광주지법\s*목포지원|목포지원/, "목포지청"],
  [/광주지법\s*순천지원|순천지원/, "순천지청"],
  [/광주지법|광주지방법원/, "광주지방검찰청"],
  [/전주지법\s*군산지원|군산지원/, "군산지청"],
  [/전주지법|전주지방법원/, "전주지방검찰청"],
  [/제주지법|제주지방법원/, "제주지방검찰청"],
  [/광주고법|광주고등법원/, "광주고등검찰청"],
  [/대전고법|대전고등법원/, "대전고등검찰청"],
  [/대구고법|대구고등법원/, "대구고등검찰청"],
  [/부산고법|부산고등법원/, "부산고등검찰청"],
  [/수원고법|수원고등법원/, "수원고등검찰청"],
  [/서울고법|서울고등법원/, "서울고등검찰청"],
];

/** 본문에 언급된 법원명으로 대응 검찰청을 찾는다(판결·선고 기사의 강한 관할 신호) */
export function courtOfficeName(text: string): { office: string; court: string } | null {
  for (const [re, office] of COURT_TO_OFFICE) {
    const m = text.match(re);
    if (m) return { office, court: m[0] };
  }
  return null;
}

/** 검찰청 1차 분류 (5단계 추정 로직) */
export function classifyOffices(input: ClassifyInput, offices: OfficeLite[]): OfficeMatchResult[] {
  const text = buildHaystack(input);
  const results: OfficeMatchResult[] = [];

  // 0단계: 법원명 직접 언급(서울중앙지법 등) → 대응 검찰청을 최우선 후보로 (2026-07-28)
  //  제목 우선, 없으면 본문. 판결·선고 기사에서 우연한 지명 언급보다 훨씬 신뢰도가 높다.
  const courtHit = courtOfficeName(input.title ?? "") ?? courtOfficeName(text);
  const courtOffice = courtHit ? offices.find((o) => o.name === courtHit.office) : undefined;
  if (courtOffice) {
    results.push({
      officeId: courtOffice.id,
      officeName: courtOffice.name,
      officeType: courtOffice.type,
      region: courtOffice.region,
      confidence: 0.92,
      matchType: "DIRECT_MENTION",
      reason: `'${courtHit!.court}' 언급 → 대응 검찰청(${courtOffice.name})`,
      evidence: [courtHit!.court],
    });
  }

  for (const office of offices) {
    const nameKw = office.searchKeywords.filter(isOfficeNameKeyword);
    const regionKw = office.searchKeywords.filter((k) => !isOfficeNameKeyword(k));
    const police = office.policeStations ?? [];

    const nameHit = countHits(text, nameKw);
    // 지역·경찰서 키워드는 앞경계 검사 — '부정선거'→'정선'(정선군) 같은 부분 문자열 오탐 방지
    const regionHit = countHitsBounded(text, regionKw);
    const policeHit = countHitsBounded(text, police);

    let matchType: OfficeMatchType | null = null;
    let confidence = 0;
    let reason = "";
    let evidence: string[] = [];

    if (nameHit.count > 0) {
      matchType = "DIRECT_MENTION";
      confidence = 0.95;
      evidence = nameHit.hits;
      reason = `본문에 '${nameHit.hits[0]}' 직접 언급`;
    } else if (regionHit.count > 0) {
      matchType = "REGION_INFERRED";
      confidence = Math.min(0.68, 0.5 + regionHit.count * 0.06);
      evidence = regionHit.hits;
      reason = `관할 지역 '${regionHit.hits.slice(0, 2).join("', '")}' 언급(검찰청 직접 언급 없음 · 추정)`;
    } else if (policeHit.count > 0) {
      matchType = "POLICE_INFERRED";
      confidence = 0.55;
      evidence = policeHit.hits;
      reason = `관할 경찰서 '${policeHit.hits[0]}' 언급 기반 추정`;
    }

    // 공식 보도자료 출처가 해당 청이면 가산
    if ((input.sourceName ?? "").includes(office.name) && input.sourceType?.includes("OFFICIAL")) {
      if (!matchType) {
        matchType = "PRESS_SOURCE";
        reason = `공식 보도자료 출처(${office.name}) 기반`;
        evidence = [office.name];
      }
      confidence = Math.max(confidence, 0.9);
    }

    if (matchType) {
      results.push({
        officeId: office.id,
        officeName: office.name,
        officeType: office.type,
        region: office.region,
        confidence: Number(confidence.toFixed(2)),
        matchType,
        reason,
        evidence,
      });
    }
  }

  // '광주' 모호성 해소: 경기 광주(성남지청) vs 광주광역시(광주지검) — 본문에 호남 신호가 있으면
  //  '광주' 지역 히트만으로 잡힌 성남지청 후보를 배제한다(전남도청·통합시 기사 오분류 방지, 2026-07-27)
  const HONAM_RE = /전남|전라남도|전라도|호남|무안|나주|목포|여수|순천|담양|화순|장성|영광|함평|광산구|전남도청|빛고을|광주광역시|광주시청|광주고등법원|광주지방법원/;
  //  성남지청 후보가 '광주' 지역 히트로만 잡힌 경우 배제(경기 광주 vs 광주광역시). evidence에 광주가 하나라도 있으면 적용.
  const filtered = HONAM_RE.test(text)
    ? results.filter(
        (r) => !(r.officeName.includes("성남") && r.matchType !== "DIRECT_MENTION" && r.evidence.some((e) => e.includes("광주"))),
      )
    : results;

  // 신뢰도 내림차순, 동률이면 지청>지검>고검>대검 (구체적 관할 우선)
  const typeRank: Record<string, number> = { 지청: 4, 지방검찰청: 3, 고등검찰청: 2, 대검찰청: 1 };
  return filtered.sort(
    (a, b) => b.confidence - a.confidence || (typeRank[b.officeType] ?? 0) - (typeRank[a.officeType] ?? 0),
  );
}

/** 고파급 키워드 추출 */
export function detectHighImpact(input: ClassifyInput): string[] {
  const text = buildHaystack(input);
  const found = new Set<string>();
  for (const [group, kws] of Object.entries(HIGH_IMPACT_KEYWORDS)) {
    if (countHits(text, kws).count > 0) found.add(group);
  }
  return Array.from(found);
}

/** 검토 필요 판정 + 사유 */
export function computeReviewReasons(params: {
  input: ClassifyInput;
  offices: OfficeMatchResult[];
  crime: CrimeResult;
}): string[] {
  const { input, offices, crime } = params;
  const reasons: string[] = [];
  const primary = offices[0];
  const bodyLen = (input.fullText ?? input.summary ?? "").length;

  if (!primary) reasons.push("관련 검찰청을 식별하지 못함");
  else {
    if (primary.confidence < 0.7) reasons.push("검찰청 분류 신뢰도 낮음(0.7 미만)");
    if (primary.matchType === "REGION_INFERRED") reasons.push("검찰청 직접 언급 없음 · 지역 기반 추정");
    if (primary.matchType === "POLICE_INFERRED") reasons.push("검찰청 직접 언급 없음 · 관할 경찰서 기반 추정");
  }
  if (crime.confidence < 0.7) reasons.push("범죄유형 분류 신뢰도 낮음(0.7 미만)");
  if (crime.crimeType === "기타") reasons.push("범죄유형 불명확");
  if (bodyLen > 0 && bodyLen < 120) reasons.push("본문이 짧아 근거 부족");

  const sensitive = countHits(buildHaystack(input), SENSITIVE_REVIEW_KEYWORDS);
  if (sensitive.count > 0)
    reasons.push(`민감 키워드 포함(${sensitive.hits.slice(0, 2).join(", ")}) · 실명/명예훼손 주의`);

  const strongOffices = offices.filter((o) => o.confidence >= 0.5);
  if (strongOffices.length >= 2) reasons.push("복수 검찰청이 언급됨 · 관할 확인 필요");

  return Array.from(new Set(reasons));
}
