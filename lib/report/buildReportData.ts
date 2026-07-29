// 보고서 데이터 집계 — DB 조회 후 ReportData 구성(보고서 생성기/일일 브리핑 공용)
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { asArray } from "@/lib/utils";
import { getTopIssues } from "@/lib/dashboard/topIssues";
import { getOfficeHeatmap } from "@/lib/dashboard/officeHeatmap";
import { computeTrendAlerts } from "@/lib/dashboard/trendAlerts";
import type { ReportData } from "./reportGenerator";

export async function buildReportData(opts: {
  start: Date;
  end: Date;
  generatedBy: string;
  now?: Date;
  /** 기사 추가 필터(검찰청·범죄유형·공안 영역 등) — 통계·요약이 이 범위로 좁혀짐 */
  articleWhere?: Prisma.ArticleWhereInput;
  /** 필터 대상 검찰청 이름 목록(자손 포함) — 이슈 Top·검찰청 표 사후 필터용 */
  officeNames?: string[];
  /** 필터 범죄유형(이슈 Top·트렌드 사후 필터용) */
  crimeTypeLabel?: string;
  /** 공안 등 복합 영역용 — 이슈가 이 유형 중 하나이거나 제목에 키워드가 있으면 통과(2026-07-29) */
  issueScope?: { crimeTypes?: string[]; titleKeywords?: string[] };
}): Promise<ReportData> {
  const { start, end, generatedBy } = opts;
  const now = opts.now ?? new Date();

  const [articles, topIssuesRaw, officeRowsRaw, trendAlertsRaw] = await Promise.all([
    prisma.article.findMany({ where: { publishedAt: { gte: start, lte: end }, ...(opts.articleWhere ?? {}) }, orderBy: { publishedAt: "desc" } }),
    // 유형·검찰청 필터는 조회 후(사후) 적용되므로 넉넉히 가져와야 한다.
    //  limit 20 이면 '공판 브리핑'처럼 특정 유형이 전체 상위권에 없을 때 결과가 비어버린다(2026-07-29).
    getTopIssues({ periodStart: start, periodEnd: end, limit: 500 }),
    getOfficeHeatmap({ periodStart: start, periodEnd: end }),
    computeTrendAlerts({ now }),
  ]);

  // 필터 사후 적용(이슈 Top·검찰청 표·트렌드)
  const officeNameSet = opts.officeNames?.length ? new Set(opts.officeNames) : null;
  const scope = opts.issueScope;
  const inScope = (crimeType?: string | null, title?: string | null) => {
    if (!scope) return true;
    if (scope.crimeTypes?.length && crimeType && scope.crimeTypes.includes(crimeType)) return true;
    if (scope.titleKeywords?.length && title && scope.titleKeywords.some((k) => title.includes(k))) return true;
    return false;
  };
  const topIssues = topIssuesRaw
    .filter((t) => (officeNameSet ? (t.officeName ? officeNameSet.has(t.officeName) : false) : true))
    .filter((t) => (opts.crimeTypeLabel ? t.crimeType === opts.crimeTypeLabel : true))
    .filter((t) => inScope(t.crimeType, t.title))
    .slice(0, 5);
  const officeRows = officeNameSet ? officeRowsRaw.filter((o) => officeNameSet.has(o.officeName)) : officeRowsRaw;
  const trendAlerts = opts.crimeTypeLabel ? trendAlertsRaw.filter((t) => t.crimeType === opts.crimeTypeLabel) : trendAlertsRaw;

  const clustersForCount = await prisma.issueCluster.findMany({
    where: { lastPublishedAt: { gte: start, lte: end } },
    select: { mainCrimeType: true, mainOfficeName: true, title: true },
  });
  const issueCount = clustersForCount
    .filter((c) => (officeNameSet ? (c.mainOfficeName ? officeNameSet.has(c.mainOfficeName) : false) : true))
    .filter((c) => (opts.crimeTypeLabel ? c.mainCrimeType === opts.crimeTypeLabel : true))
    .filter((c) => inScope(c.mainCrimeType, c.title)).length;

  // 검찰청명 맵
  const officeMap = new Map(officeRows.map((o) => [o.officeName, o]));

  // 범죄유형별 통계
  const crimeAgg = new Map<string, { count: number; offices: Map<string, number>; keywords: Map<string, number>; headline?: string }>();
  for (const a of articles) {
    if (!a.crimeType) continue;
    const g = crimeAgg.get(a.crimeType) ?? { count: 0, offices: new Map<string, number>(), keywords: new Map<string, number>(), headline: undefined as string | undefined };
    g.count++;
    if (!g.headline) g.headline = a.title;
    for (const k of asArray<string>(a.keywords)) g.keywords.set(k, (g.keywords.get(k) ?? 0) + 1);
    crimeAgg.set(a.crimeType, g);
  }
  // 범죄유형별 주요 검찰청(이슈 클러스터 기준)
  const clusters = await prisma.issueCluster.findMany({ where: { lastPublishedAt: { gte: start, lte: end } } });
  for (const cl of clusters) {
    if (cl.mainCrimeType && cl.mainOfficeName) {
      const g = crimeAgg.get(cl.mainCrimeType);
      if (g) g.offices.set(cl.mainOfficeName, (g.offices.get(cl.mainOfficeName) ?? 0) + 1);
    }
  }
  const crimeStats = [...crimeAgg.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([crimeType, g]) => ({
      crimeType,
      articleCount: g.count,
      topOffices: [...g.offices.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n),
      keywords: [...g.keywords.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k),
      headline: g.headline,
    }));

  // 검토 필요 항목
  const reviewArticles = articles.filter((a) => a.needsHumanReview).slice(0, 15);
  const officeNameById = new Map((await prisma.prosecutionOffice.findMany({ select: { id: true, name: true } })).map((o) => [o.id, o.name]));

  // 필터가 걸린 경우 '주요 검찰청'은 필터된 기사 기준으로 집계(전체 순위 재사용 방지)
  const hasFilter = !!(opts.articleWhere && Object.keys(opts.articleWhere).length) || !!officeNameSet;
  const mainOffices = hasFilter
    ? (() => {
        const m = new Map<string, number>();
        for (const a of articles) {
          const n = a.primaryOfficeId ? officeNameById.get(a.primaryOfficeId) : undefined;
          if (n) m.set(n, (m.get(n) ?? 0) + 1);
        }
        return [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([n]) => n);
      })()
    : officeRows.slice(0, 5).map((o) => o.officeName);
  const mainCrimeTypes = crimeStats.slice(0, 4).map((c) => c.crimeType);

  return {
    periodStart: start,
    periodEnd: end,
    generatedBy,
    generatedAt: now,
    articleCount: articles.length,
    issueCount,
    mainOffices,
    mainCrimeTypes,
    keyIssues: topIssues.slice(0, 3).map((t) => `${t.title} (${t.officeName ?? "관할 추정"}, 보도 파급도 ${t.issueLevelLabel})`),
    topIssues: topIssues.map((t) => ({
      rank: t.rank, title: t.title, officeName: t.officeName, crimeType: t.crimeType,
      articleCount: t.articleCount, issueLevelLabel: t.issueLevelLabel, score: t.issueScore, reason: t.reason,
    })),
    officeStats: officeRows.slice(0, 12).map((o) => ({
      officeName: o.officeName, region: o.region, articleCount: o.articleCount, issueCount: o.issueCount,
      mainCrimeType: o.mainCrimeType, reviewNeeded: o.reviewNeeded, deltaPrev: o.deltaPrev,
    })),
    crimeStats,
    trendAlerts: trendAlerts.map((t) => ({ crimeType: t.crimeType, recentCount: t.recentCount, baselineAvg: t.baselineAvg, increaseRatio: t.increaseRatio, offices: t.sampleOffices })),
    reviewNeeded: reviewArticles.map((a) => ({
      title: a.title,
      officeName: a.primaryOfficeId ? officeNameById.get(a.primaryOfficeId) : undefined,
      reasons: asArray<string>(a.reviewReasons),
    })),
    sources: articles.slice(0, 50).map((a) => ({ title: a.title, sourceName: a.sourceName, url: a.originalUrl, publishedAt: a.publishedAt })),
  };
}
