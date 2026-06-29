// =====================================================================
// 검찰청별 이슈 현황(히트맵/랭킹) — 표·카드 기반(MVP)
//  * 전일 대비 증감 포함. 지도 시각화는 향후 확장.
// =====================================================================
import { prisma } from "@/lib/db/prisma";

export interface OfficeHeatRow {
  officeId: string;
  officeName: string;
  region: string;
  type: string;
  articleCount: number;
  issueCount: number;
  mainCrimeType?: string;
  reviewNeeded: number;
  importantIssues: number; // 보도 파급도 높음/매우 높음
  deltaPrev: number; // 직전 동일 기간 대비 기사 수 증감
}

function topKey(map: Map<string, number>): string | undefined {
  let best: string | undefined;
  let n = -1;
  for (const [k, v] of map) if (v > n) ((best = k), (n = v));
  return best;
}

export async function getOfficeHeatmap(opts: {
  periodStart: Date;
  periodEnd: Date;
  prevStart?: Date;
  prevEnd?: Date;
}): Promise<OfficeHeatRow[]> {
  const { periodStart, periodEnd } = opts;
  // 전기간(동기간 대비) 범위: 명시값이 있으면 사용, 없으면 직전 동일 span
  const span = periodEnd.getTime() - periodStart.getTime();
  const prevStart = opts.prevStart ?? new Date(periodStart.getTime() - span);
  const prevEnd = opts.prevEnd ?? periodStart;

  const [articles, prevArticles, offices] = await Promise.all([
    prisma.article.findMany({
      where: { publishedAt: { gte: periodStart, lte: periodEnd }, primaryOfficeId: { not: null } },
      select: { primaryOfficeId: true, crimeType: true, needsHumanReview: true, issueClusterId: true, issueLevel: true },
    }),
    prisma.article.findMany({
      where: { publishedAt: { gte: prevStart, lte: prevEnd }, primaryOfficeId: { not: null } },
      select: { primaryOfficeId: true },
    }),
    prisma.prosecutionOffice.findMany({ select: { id: true, name: true, region: true, type: true } }),
  ]);

  const officeMap = new Map(offices.map((o) => [o.id, o]));
  const prevCount = new Map<string, number>();
  for (const a of prevArticles) prevCount.set(a.primaryOfficeId!, (prevCount.get(a.primaryOfficeId!) ?? 0) + 1);

  type Agg = { articleCount: number; clusters: Set<string>; crime: Map<string, number>; review: number; important: number };
  const agg = new Map<string, Agg>();
  for (const a of articles) {
    const id = a.primaryOfficeId!;
    const g = agg.get(id) ?? { articleCount: 0, clusters: new Set(), crime: new Map(), review: 0, important: 0 };
    g.articleCount++;
    if (a.issueClusterId) g.clusters.add(a.issueClusterId);
    if (a.crimeType) g.crime.set(a.crimeType, (g.crime.get(a.crimeType) ?? 0) + 1);
    if (a.needsHumanReview) g.review++;
    if (a.issueLevel === "high" || a.issueLevel === "critical") g.important++;
    agg.set(id, g);
  }

  const rows: OfficeHeatRow[] = [];
  for (const [id, g] of agg) {
    const o = officeMap.get(id);
    if (!o) continue;
    rows.push({
      officeId: id,
      officeName: o.name,
      region: o.region,
      type: o.type,
      articleCount: g.articleCount,
      issueCount: g.clusters.size,
      mainCrimeType: topKey(g.crime),
      reviewNeeded: g.review,
      importantIssues: g.important,
      deltaPrev: g.articleCount - (prevCount.get(id) ?? 0),
    });
  }
  return rows.sort((a, b) => b.articleCount - a.articleCount || b.importantIssues - a.importantIssues);
}
