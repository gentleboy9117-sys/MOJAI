// 내용 유사도 기반 '서로 다른 사건' 추출 — Top 목록에서 같은 사건 중복 제거.
//  클러스터(사건) 우선 + 제목 핵심 내용 bigram Jaccard 로 같은 사건 재차 제거.

export function cleanCore(title: string): string {
  return title
    .split(" - ")[0]
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[0-9]+/g, "")
    // 사법 절차/판결 표현 제거
    .replace(/오늘|어제|내일|[1-3]심|항소심|상고심|항소|상고|선고|구형|혐의|징역|벌금|금고|집행유예|집유|무죄|유죄|실형|기소|불기소|송치|판결|불복|파기|환송|개월|년|월|원|집회|시위/g, "")
    // 수사·기관 주체 제거(인물명만 남기기)
    .replace(/특검|검찰|경찰|법원|법무부|대검|고검|지검|검찰청|특별검사/g, "")
    // 직함·직위 제거
    .replace(/전\s?법무부?장관|법무부?장관|장관|차관|국무총리|총리|시장|군수|구청장|도지사|교육감|국회의원|시의원|구의원|도의원|의원|의장|위원장|위원|회장|부회장|대표이사|대표|사장|본부장|청장|서장|판사|검사|변호사|前|전\s/g, "")
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

// 같은 사건 판정: 토큰 유사도 0.35↑ 이거나, 공통 인물·사안명(부분문자열) 4자↑ + 토큰 유사도 0.15↑
//  (예: '건진법사' 구형 기사 vs 무죄 기사처럼 핵심 인물명만 공유해도 같은 사건으로 병합)
function sameEvent(ga: Set<string>, gb: Set<string>, ca: string, cb: string): boolean {
  const j = jaccard(ga, gb);
  // 직함·기관어를 걷어낸 핵심(주로 인물·사안명)이 4자 이상 연속 일치하면 같은 사건으로 본다.
  return j >= 0.3 || lcsLen(ca, cb) >= 3;
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
