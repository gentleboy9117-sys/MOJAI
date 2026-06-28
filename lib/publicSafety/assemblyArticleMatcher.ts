// =====================================================================
// [공안] 집회 공개일정 ↔ 관련 공개 보도 매칭기
//  * 관련 기사는 '범죄' 가 아니라 '집회 관련 보도' 다.
//  * 법적 이슈 키워드는 '공개 보도 기준 법적 이슈 가능성 언급' 으로만 표기한다(확정 아님).
//  * 점수는 공개 보도와 일정 간 '관련성' 추정치이며 범죄 판단이 아니다.
// =====================================================================
import { LEGAL_ISSUE_KEYWORDS } from "./assemblySafetyRules";

export interface MatchAssemblyInput {
  eventDate: Date;
  title?: string;
  locationName?: string;
  district?: string;
  organizerName?: string;
  topicSummary?: string;
}

export interface MatchArticleInput {
  id: string;
  title: string;
  summary?: string | null;
  fullText?: string | null;
  publishedAt: Date;
}

/** 집회·시위 관련 보도에서 흔히 등장하는 일반 주제 키워드(범죄 단정 아님) */
const TOPIC_KEYWORDS = ["집회", "시위", "행진", "집회·시위", "도심"];
/** 본문에 등장 시 가점되는 일반 키워드(범죄 단정 아님) */
const BODY_CONTEXT_KEYWORDS = [
  "집회",
  "시위",
  "행진",
  "충돌",
  "경찰",
  "연행",
  "고발",
  "수사",
];
/** 검·경 언급 가점 */
const AGENCY_KEYWORDS = ["검찰", "지검", "경찰", "경찰서"];

export type AssemblyRelationType =
  | "same_day_report"
  | "next_day_report"
  | "follow_up_report"
  | "legal_issue_report"
  | "unrelated_or_low_confidence";

export interface AssemblyArticleMatch {
  relationType: AssemblyRelationType;
  relationConfidence: number;
  relationReason: string;
  matchedKeywords: string[];
  matchedLocation: boolean;
  matchedDate: boolean;
  hasLegalIssueMention: boolean;
  legalIssueKeywords: string[];
}

function dayDiff(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((db - da) / 86400000);
}

function buildHaystack(article: MatchArticleInput): { title: string; full: string } {
  const title = article.title ?? "";
  const full = `${title} ${article.summary ?? ""} ${article.fullText ?? ""}`;
  return { title, full };
}

/** 공개 보도 텍스트(제목+요약) 내 법적 이슈 키워드 탐지 */
export function detectLegalIssueKeywords(article: MatchArticleInput): string[] {
  const text = `${article.title ?? ""} ${article.summary ?? ""}`;
  return LEGAL_ISSUE_KEYWORDS.filter((k) => text.includes(k));
}

/**
 * 단일 집회 ↔ 단일 기사 매칭 (사양 §8.2 점수표).
 *  장소명 +30 / 행정구 +10 / 일자 언급 +20 / 단체명 +30 / 주제 키워드 +20 /
 *  제목에 장소·단체 +20 / 본문 일반 키워드 +10 / 검·경 언급 +10
 *  relationConfidence = min(1, score/100)
 */
export function matchAssemblyArticle(
  assembly: MatchAssemblyInput,
  article: MatchArticleInput,
): AssemblyArticleMatch {
  const { title: titleText, full } = buildHaystack(article);
  const matchedKeywords: string[] = [];
  let score = 0;

  // 장소명 +30
  const loc = (assembly.locationName ?? "").trim();
  let matchedLocation = false;
  if (loc.length >= 2 && full.includes(loc)) {
    score += 30;
    matchedLocation = true;
    matchedKeywords.push(loc);
  }

  // 행정구 +10
  const district = (assembly.district ?? "").trim();
  if (district.length >= 2 && full.includes(district)) {
    score += 10;
    matchedLocation = true;
    if (!matchedKeywords.includes(district)) matchedKeywords.push(district);
  }

  // 일자 언급 +20 (집회 당일/다음날/같은 달 일자 표기 추정)
  const diff = dayDiff(assembly.eventDate, article.publishedAt);
  const ev = assembly.eventDate;
  const datePhrases = [
    `${ev.getMonth() + 1}월 ${ev.getDate()}일`,
    `${ev.getMonth() + 1}.${ev.getDate()}`,
    `${ev.getDate()}일`,
  ];
  const matchedDate =
    Math.abs(diff) <= 1 || datePhrases.some((p) => full.includes(p));
  if (matchedDate) {
    score += 20;
  }

  // 단체명(주최) +30
  const org = (assembly.organizerName ?? "").trim();
  if (org.length >= 2 && full.includes(org)) {
    score += 30;
    matchedKeywords.push(org);
  }

  // 주제 키워드 +20
  if (TOPIC_KEYWORDS.some((k) => full.includes(k))) {
    score += 20;
    for (const k of TOPIC_KEYWORDS) if (full.includes(k) && !matchedKeywords.includes(k)) matchedKeywords.push(k);
  }

  // 제목에 장소/단체 +20
  if ((loc.length >= 2 && titleText.includes(loc)) || (org.length >= 2 && titleText.includes(org))) {
    score += 20;
  }

  // 본문 일반 키워드 +10
  if (BODY_CONTEXT_KEYWORDS.some((k) => full.includes(k))) {
    score += 10;
  }

  // 검·경 언급 +10
  if (AGENCY_KEYWORDS.some((k) => full.includes(k))) {
    score += 10;
  }

  const relationConfidence = Math.min(1, score / 100);

  // 법적 이슈 가능성 언급(확정 아님)
  const legalIssueKeywords = detectLegalIssueKeywords(article);
  const hasLegalIssueMention = legalIssueKeywords.length > 0;

  // 관계 유형 결정
  let relationType: AssemblyRelationType;
  if (relationConfidence < 0.5) {
    relationType = "unrelated_or_low_confidence";
  } else if (hasLegalIssueMention) {
    relationType = "legal_issue_report";
  } else if (diff <= 0) {
    relationType = "same_day_report";
  } else if (diff === 1) {
    relationType = "next_day_report";
  } else {
    relationType = "follow_up_report";
  }

  const relationReason = buildReason({
    matchedLocation,
    matchedDate,
    matchedOrg: org.length >= 2 && full.includes(org),
    hasLegalIssueMention,
    diff,
    relationConfidence,
  });

  return {
    relationType,
    relationConfidence,
    relationReason,
    matchedKeywords,
    matchedLocation,
    matchedDate,
    hasLegalIssueMention,
    legalIssueKeywords,
  };
}

function buildReason(p: {
  matchedLocation: boolean;
  matchedDate: boolean;
  matchedOrg: boolean;
  hasLegalIssueMention: boolean;
  diff: number;
  relationConfidence: number;
}): string {
  if (p.relationConfidence < 0.5) {
    return "공개 보도와의 관련성이 낮아 자동 연결을 보류함(담당자 검토 필요)";
  }
  const parts: string[] = [];
  if (p.matchedLocation) parts.push("장소·행정구 일치");
  if (p.matchedDate) parts.push("집회 일자 인접/언급");
  if (p.matchedOrg) parts.push("주최(공개자료 표기) 언급");
  const base = parts.length ? `공개 보도에서 ${parts.join(" · ")} 확인` : "공개 보도에서 집회 관련 표현 확인";
  const timing =
    p.diff <= 0 ? "(집회 당일 보도)" : p.diff === 1 ? "(집회 다음날 보도)" : "(후속 보도)";
  const legal = p.hasLegalIssueMention ? " · 공개 보도 기준 법적 이슈 가능성 언급 포함" : "";
  return `${base} ${timing}${legal}`;
}

/**
 * 집회 1건 ↔ 기사 다수 매칭.
 *  windowDays 내 기사를 우선 평가하고, relationConfidence >= 0.5 인 링크를 반환한다.
 */
export function matchAssemblyToArticles(
  assembly: MatchAssemblyInput,
  articles: MatchArticleInput[],
  opts: { windowDays?: number } = {},
): { article: MatchArticleInput; match: AssemblyArticleMatch }[] {
  const windowDays = opts.windowDays ?? 2;
  const out: { article: MatchArticleInput; match: AssemblyArticleMatch }[] = [];
  for (const article of articles) {
    const diff = dayDiff(assembly.eventDate, article.publishedAt);
    // 집회 전 1일 ~ 집회 후 windowDays 일 범위만 평가(후속 보도 고려)
    if (diff < -1 || diff > Math.max(windowDays, 1)) continue;
    const match = matchAssemblyArticle(assembly, article);
    if (match.relationConfidence >= 0.5) out.push({ article, match });
  }
  out.sort((a, b) => b.match.relationConfidence - a.match.relationConfidence);
  return out;
}
