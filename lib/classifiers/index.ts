// =====================================================================
// 분류 오케스트레이터: 키워드 1차 분류 → (선택)LLM 보조 → 결과 통합
//  * confidence 와 근거를 항상 함께 반환(LLM 결과 100% 신뢰 금지)
// =====================================================================
import {
  classifyCrime,
  classifyOffices,
  computeReviewReasons,
  detectHighImpact,
  buildHaystack,
} from "./keyword-rules";
import type {
  ArticleClassificationResult,
  ClassifyInput,
  OfficeLite,
  OfficeMatchResult,
} from "./types";
import { OFFICE_MATCH_LABEL } from "./types";
import type { LlmProvider } from "@/lib/providers/llm/types";
import { classifyAllOffices } from "@/lib/publicSafety/assemblyJurisdictionClassifier";

export * from "./types";

/** 키워드 기반 동기 분류 (오프라인 동작, seed/스크립트 기본) */
// 법무부 소관(검찰개혁·공소청 등 제도 개편) → 법무부
const MOJ_RE = /법무부|검찰\s*개혁|공소청|기소청|수사청\s*분리|검찰\s*분리|검수완박|검수원복/;
// 그 외 검찰 제도·조직 이슈(특정 지방검찰청 관할 아님) → 대검찰청
const INSTITUTIONAL_RE =
  /검찰총장|검찰\s*인사|검사\s*인사|검찰\s*직제|검찰\s*조직|검찰청법|검찰\s*독립|수사권|기소권|검경\s*수사|공수처|검찰\s*예산|중수청|중대범죄수사청/;

export function classifyArticle(input: ClassifyInput, offices: OfficeLite[]): ArticleClassificationResult {
  const officeMatches = classifyOffices(input, offices);
  const crime = classifyCrime(input);
  let primary = officeMatches[0];

  // 발생 장소(구·시군)·관할 경찰서·대응 법원·랜드마크 기준 정밀 관할(복수 가능, 경계검사).
  //  * 검찰청명이 직접 언급된 경우(DIRECT_MENTION)는 그대로 두고, 그 외엔 정밀 결과로 보강.
  if (!primary || primary.matchType !== "DIRECT_MENTION") {
    const precise = classifyAllOffices(buildHaystack(input), offices as any);
    if (precise.length) {
      const mapped: OfficeMatchResult[] = precise.map((p) => {
        const o = offices.find((of) => of.id === p.officeId);
        return {
          officeId: p.officeId, officeName: p.officeName, officeType: o?.type ?? "", region: o?.region ?? "",
          confidence: 0.9, matchType: "DIRECT_MENTION" as const,
          reason: `발생 장소(${p.hint}) 기준 ${p.officeName}`, evidence: [p.hint],
        };
      });
      officeMatches.length = 0;
      officeMatches.push(...mapped);
      primary = mapped[0];
    }
  }

  // 제도·조직 이슈(특정 지검 직접 언급 없음): 법무부 소관·검찰 제도/조직 모두 → 법무부/대검찰청
  if (!primary || primary.matchType !== "DIRECT_MENTION") {
    const hay = buildHaystack(input);
    const institutionTarget = (MOJ_RE.test(hay) || INSTITUTIONAL_RE.test(hay))
      ? offices.find((o) => o.name === "법무부/대검찰청" || o.type === "법무부/대검찰청")
      : undefined;
    if (institutionTarget) {
      primary = {
        officeId: institutionTarget.id, officeName: institutionTarget.name,
        officeType: institutionTarget.type, region: institutionTarget.region,
        confidence: 0.85, matchType: "INSTITUTION",
        reason: `특정 지방검찰청 관할이 아닌 제도·조직 이슈 → ${institutionTarget.name}`,
        evidence: [],
      };
      officeMatches.unshift(primary);
    }
  }

  // 형사사법제도/정책은 특정 지검 사건이 아니라 제도 사안 → 관할을 항상 법무부/대검찰청으로
  //  (국회가 여의도에 있어 서울남부 등으로 오분류되는 것 방지)
  // 특별검사(특검) 사건은 검찰과 별도 조직 → 개별 지검이 아니라 법무부/대검찰청으로 집계(2026-07-29 지시)
  //  특검 재판이 서울중앙지법에서 열려 서울중앙지검으로 잡히던 것을 상위기관으로 통일한다.
  //  특검이 수사·기소한 대표 사건명도 포함 — 제목에 '특검'이 없어도 특검 사건이다(2026-07-29)
  const SPECIAL_COUNSEL_RE =
    /특별검사|특검(팀|팀장|보|법|이|은|을|과|의|에|,|\s|$)|내란\s*특검|김건희\s*특검|채\s*해병\s*특검|채해병\s*특검|순직해병\s*특검|민중기\s*특검|조은석\s*특검|이명현\s*특검|특별검사보|내란\s*(우두머리|가담|혐의|사건|재판)|체포\s*방해|체포영장\s*집행\s*방해|비상계엄\s*(선포|사건)|도이치모터스|명태균|이종섭\s*(호주|도피)|채\s*상병|순직\s*해병/;
  //  판정은 '제목' 기준 — 요약에 섞인 연관기사 문구로 무관한 사건이 특검으로 끌려가는 것 방지(2026-07-29)
  const scHit = SPECIAL_COUNSEL_RE.test(input.title ?? "");
  if (scHit) {
    const moj = offices.find((o) => o.name === "법무부/대검찰청" || o.type === "법무부/대검찰청");
    if (moj) {
      primary = {
        officeId: moj.id, officeName: moj.name, officeType: moj.type, region: moj.region,
        confidence: 0.9, matchType: "INSTITUTION",
        reason: "특별검사 사건(검찰과 별도 조직) → 법무부/대검찰청으로 집계",
        evidence: ["특검"],
      };
      officeMatches.length = 0;
      officeMatches.push(primary);
    }
  }

  //  단, 특정 지검·지청이 직접 언급된 사건 기사는 그 관할을 유지한다
  //  (예: '강남서 수사 무마 의혹' 기사가 요약의 '보완수사권' 한 구절로 대검으로 흡수되던 문제, 2026-07-29 감사)
  const hasDirectOffice = officeMatches.some(
    (o) => o.matchType === "DIRECT_MENTION" && (o.officeType === "지방검찰청" || o.officeType === "지청"),
  );
  if (!scHit && crime.crimeType === "형사사법제도/정책" && !hasDirectOffice) {
    const moj = offices.find((o) => o.name === "법무부/대검찰청" || o.type === "법무부/대검찰청");
    if (moj) {
      primary = {
        officeId: moj.id, officeName: moj.name, officeType: moj.type, region: moj.region,
        confidence: 0.9, matchType: "INSTITUTION",
        reason: "형사사법제도/정책 사안 → 법무부/대검찰청",
        evidence: [],
      };
      officeMatches.length = 0;
      officeMatches.push(primary);
    }
  }

  const highImpact = detectHighImpact(input);
  const reviewReasons = computeReviewReasons({ input, offices: officeMatches, crime });

  const classificationReasons = buildClassificationReasons(crime, primary, officeMatches);
  const keywords = extractKeywords(input, crime.evidenceKeywords, primary);

  return {
    offices: officeMatches,
    primaryOffice: primary,
    region: primary?.region,
    crime,
    keywords,
    highImpact,
    needsHumanReview: reviewReasons.length > 0,
    reviewReasons,
    classificationReasons,
  };
}

/** AI 분류 설명(#16): 키워드/본문 근거를 사람이 읽을 수 있게 */
function buildClassificationReasons(
  crime: ReturnType<typeof classifyCrime>,
  primary: OfficeMatchResult | undefined,
  all: OfficeMatchResult[],
): string[] {
  const out: string[] = [];
  out.push(crime.reason);
  if (primary) {
    out.push(`관할 추정 근거(${OFFICE_MATCH_LABEL[primary.matchType]}): ${primary.reason}`);
  } else {
    out.push("관할 추정 근거: 검찰청/관할지역 키워드 미식별 — 추정 불가");
  }
  const others = all.slice(1, 3).filter((o) => o.confidence >= 0.5);
  if (others.length) out.push(`함께 언급된 검찰청: ${others.map((o) => o.officeName).join(", ")}`);
  return out;
}

function extractKeywords(
  input: ClassifyInput,
  crimeKeywords: string[],
  primary?: OfficeMatchResult,
): string[] {
  const set = new Set<string>(crimeKeywords);
  if (primary) set.add(primary.officeName.replace(/지방검찰청|검찰청/, "지검").replace("지검청", "지검"));
  detectHighImpact(input).forEach((k) => set.add(k));
  return Array.from(set).slice(0, 10);
}

/**
 * LLM 보조 분류(#5,#10-1). 키워드 결과가 약할 때 보강.
 * LLM 결과는 keyword 결과와 '병합'하며, 직접 언급(DIRECT_MENTION)은 LLM보다 우선한다.
 */
export async function classifyArticleWithLlm(
  input: ClassifyInput,
  offices: OfficeLite[],
  llm: LlmProvider,
): Promise<ArticleClassificationResult> {
  const base = classifyArticle(input, offices);

  // 키워드 분류가 충분히 강하면 LLM 생략(비용/원문 최소 전송)
  const strongEnough =
    (base.primaryOffice?.confidence ?? 0) >= 0.8 && base.crime.confidence >= 0.75;
  if (strongEnough) return base;

  try {
    const llmRes = await llm.classify({
      title: input.title,
      sourceName: input.sourceName ?? "",
      bodyExcerpt: (input.fullText ?? input.summary ?? "").slice(
        0,
        Number(process.env.LLM_MAX_INPUT_CHARS ?? 1500),
      ),
      officeNames: offices.map((o) => o.name),
    });

    // 범죄유형: 키워드가 '기타'면 LLM 결과 채택
    if (base.crime.crimeType === "기타" && llmRes.crime_type) {
      base.crime = {
        crimeType: llmRes.crime_type,
        crimeSubtype: llmRes.crime_subtype || base.crime.crimeSubtype,
        confidence: Math.min(0.9, llmRes.crime_confidence || 0.6),
        evidenceKeywords: llmRes.evidence_keywords ?? [],
        reason: `(LLM 보조) ${llmRes.short_reason ?? llmRes.one_line_summary ?? ""}`,
      };
      base.classificationReasons.push(`LLM 보조 분류: ${base.crime.reason}`);
    }

    // 검찰청: 직접 언급이 없을 때만 LLM 추정 채택
    if ((!base.primaryOffice || base.primaryOffice.matchType !== "DIRECT_MENTION") && llmRes.related_offices?.length) {
      const top = llmRes.related_offices[0];
      const matched = offices.find((o) => o.name === top.office_name);
      if (matched) {
        const llmMatch: OfficeMatchResult = {
          officeId: matched.id,
          officeName: matched.name,
          officeType: matched.type,
          region: matched.region,
          confidence: Math.min(0.75, top.confidence || 0.6),
          matchType: "LLM_ASSIST",
          reason: `(LLM 보조 추정) ${top.reason ?? ""}`,
          evidence: [],
        };
        // 기존 결과보다 신뢰도 높을 때만 primary 교체
        if (!base.primaryOffice || llmMatch.confidence > base.primaryOffice.confidence) {
          base.offices = [llmMatch, ...base.offices.filter((o) => o.officeId !== matched.id)];
          base.primaryOffice = llmMatch;
          base.region = matched.region;
        }
      }
    }

    if (llmRes.one_line_summary && !input.summary) {
      // 요약 비어있으면 LLM 한줄 요약 활용(호출측에서 사용)
      (base as ArticleClassificationResult & { llmSummary?: string }).llmSummary =
        llmRes.one_line_summary;
    }

    base.reviewReasons = computeReviewReasons({ input, offices: base.offices, crime: base.crime });
    if (llmRes.needs_human_review) base.reviewReasons.push("LLM이 사람 검토 권고");
    base.needsHumanReview = base.reviewReasons.length > 0;
  } catch (e) {
    base.classificationReasons.push("LLM 보조 분류 실패 — 키워드 결과만 사용");
  }

  return base;
}

/** 제목+URL 기반 콘텐츠 해시(중복 수집 방지) */
export function contentHashOf(title: string, url: string): string {
  const s = `${title.trim()}::${url.trim()}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return `h${(h >>> 0).toString(16)}_${s.length}`;
}
