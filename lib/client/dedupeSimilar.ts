// 내용 유사도 기반 '서로 다른 사건' 추출 — Top 목록에서 같은 사건 중복 제거.
//  클러스터(사건) 우선 + 제목 핵심 내용 bigram Jaccard 로 같은 사건 재차 제거.

export function cleanCore(title: string): string {
  return title
    .split(" - ")[0]
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[0-9]+/g, "")
    .replace(/오늘|어제|내일|[1-3]심|항소심|상고심|선고|구형|혐의|징역|벌금|금고|집행유예|무죄|유죄|실형|검찰|법원|기소|송치|판결|개월|년|월|원|집회|시위/g, "")
    .replace(/[^가-힣a-zA-Z]/g, "");
}

function bigrams(s: string): Set<string> {
  const g = new Set<string>();
  if (s.length <= 1) { if (s) g.add(s); return g; }
  for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2));
  return g;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** 두 문자열의 최장 공통 부분문자열 길이(같은 인물·사안명 탐지용) */
function lcsLen(a: string, b: string): number {
  if (!a || !b) return 0;
  let max = 0;
  const dp = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      if (a[i - 1] === b[j - 1]) { dp[j] = prev + 1; if (dp[j] > max) max = dp[j]; }
      else dp[j] = 0;
      prev = tmp;
    }
  }
  return max;
}

// 같은 사건 판정: 토큰 유사도 0.35↑ 이거나, 공통 부분문자열 5자↑ + 토큰 유사도 0.25↑
function sameEvent(ga: Set<string>, gb: Set<string>, ca: string, cb: string): boolean {
  const j = jaccard(ga, gb);
  return j >= 0.35 || (lcsLen(ca, cb) >= 5 && j >= 0.25);
}

export interface DistinctRow {
  title: string;
  issueClusterId?: string | null;
  issueScore?: number | null;
  publishedAt: string;
}

/** 파급도 순으로 '서로 다른 사건' n개 추출(클러스터 + 내용 유사도 + 공통 인물·사안명) */
export function pickDistinctTop<T extends DistinctRow>(rows: T[], n: number): T[] {
  const sorted = [...rows].sort(
    (a, b) => (b.issueScore ?? 0) - (a.issueScore ?? 0) || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const out: T[] = [];
  const grams: Set<string>[] = [];
  const cleans: string[] = [];
  const seenCluster = new Set<string>();
  for (const a of sorted) {
    if (a.issueClusterId && seenCluster.has(a.issueClusterId)) continue;
    const c = cleanCore(a.title);
    const g = bigrams(c);
    if (grams.some((pg, i) => sameEvent(g, pg, c, cleans[i]))) continue; // 같은 사건 → 제외
    out.push(a);
    grams.push(g);
    cleans.push(c);
    if (a.issueClusterId) seenCluster.add(a.issueClusterId);
    if (out.length >= n) break;
  }
  return out;
}
