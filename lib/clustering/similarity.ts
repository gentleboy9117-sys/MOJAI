// =====================================================================
// 기사 유사도 계산 — 사건 중복 기사 자동 묶기의 기반
//   제목/키워드/검찰청/지역/범죄유형/엔티티/날짜를 종합한다.
// =====================================================================

export interface SimArticle {
  id: string;
  title: string;
  keywords: string[];
  primaryOfficeId?: string | null;
  crimeType?: string | null;
  region?: string | null;
  entities?: string[];
  publishedAt: Date;
}

const STOPWORDS = new Set([
  "검찰", "검찰청", "기소", "수사", "혐의", "관련", "오늘", "발표", "보도", "사건", "그리고", "위해",
]);

export function tokenize(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function titleSimilarity(a: string, b: string): number {
  return jaccard(new Set(tokenize(a)), new Set(tokenize(b)));
}

/** 두 기사 종합 유사도 0~1 */
export function articleSimilarity(a: SimArticle, b: SimArticle): number {
  const titleSim = jaccard(new Set(tokenize(a.title)), new Set(tokenize(b.title)));
  const kwSim = jaccard(new Set(a.keywords.map((k) => k.toLowerCase())), new Set(b.keywords.map((k) => k.toLowerCase())));
  const entSim = jaccard(new Set((a.entities || []).map((e) => e.toLowerCase())), new Set((b.entities || []).map((e) => e.toLowerCase())));

  let score = titleSim * 0.4 + kwSim * 0.25 + entSim * 0.08;
  if (a.crimeType && a.crimeType === b.crimeType) score += 0.1;
  if (a.region && a.region === b.region) score += 0.07;
  if (a.primaryOfficeId && a.primaryOfficeId === b.primaryOfficeId) score += 0.1;

  // 날짜 근접 보너스(같은 사건은 보통 며칠 내 보도)
  const days = Math.abs(a.publishedAt.getTime() - b.publishedAt.getTime()) / 86400000;
  if (days <= 3) score += 0.05;
  else if (days <= 7) score += 0.02;

  return Math.min(1, Number(score.toFixed(3)));
}

/** 빠른 1차 그룹핑용 시그니처(범죄유형|지역|상위키워드2) */
export function signatureOf(a: SimArticle): string {
  const topKw = [...a.keywords].sort().slice(0, 2).join("·");
  return `${a.crimeType ?? "기타"}|${a.region ?? "-"}|${topKw}`;
}
