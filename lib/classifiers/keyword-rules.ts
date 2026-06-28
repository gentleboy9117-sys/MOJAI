// =====================================================================
// 키워드 기반 1차 분류 규칙 (검찰청 / 범죄유형 / 검토필요)
// =====================================================================
import {
  CRIME_TAXONOMY,
  HIGH_IMPACT_KEYWORDS,
  SENSITIVE_REVIEW_KEYWORDS,
  countHits,
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
function scoreCrimeCategory(text: string): { cat: string; sub: string; hits: string[]; score: number } | null {
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
export function detectFreshVerdict(text: string, publishedAt: Date): boolean {
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

  // 공판 판정은 제목이 아니라 '본문 + 선고일(어제/오늘)' 기준으로만 한다(detectFreshVerdict).
  //  → 여기서는 공판으로 분류하지 않고, scripts/reclassify-trial.ts(본문 크롤)가 결정한다.

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

/** 검찰청 1차 분류 (5단계 추정 로직) */
export function classifyOffices(input: ClassifyInput, offices: OfficeLite[]): OfficeMatchResult[] {
  const text = buildHaystack(input);
  const results: OfficeMatchResult[] = [];

  for (const office of offices) {
    const nameKw = office.searchKeywords.filter(isOfficeNameKeyword);
    const regionKw = office.searchKeywords.filter((k) => !isOfficeNameKeyword(k));
    const police = office.policeStations ?? [];

    const nameHit = countHits(text, nameKw);
    const regionHit = countHits(text, regionKw);
    const policeHit = countHits(text, police);

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

  // 신뢰도 내림차순, 동률이면 지청>지검>고검>대검 (구체적 관할 우선)
  const typeRank: Record<string, number> = { 지청: 4, 지방검찰청: 3, 고등검찰청: 2, 대검찰청: 1 };
  return results.sort(
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
