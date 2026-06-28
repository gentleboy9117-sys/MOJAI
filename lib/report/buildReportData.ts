// 보고서 데이터 집계 — DB 조회 후 ReportData 구성(보고서 생성기/일일 브리핑 공용)
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
}): Promise<ReportData> {
  const { start, end, generatedBy } = opts;
  const now = opts.now ?? new Date();

  const [articles, topIssues, officeRows, trendAlerts] = await Promise.all([
    prisma.article.findMany({ where: { publishedAt: { gte: start, lte: end } }, orderBy: { publishedAt: "desc" } }),
    getTopIssues({ periodStart: start, periodEnd: end, limit: 5 }),
    getOfficeHeatmap({ periodStart: start, periodEnd: end }),
    computeTrendAlerts({ now }),
  ]);

  const issueCount = await prisma.issueCluster.count({ where: { lastPublishedAt: { gte: start, lte: end } } });

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

  const mainOffices = officeRows.slice(0, 5).map((o) => o.officeName);
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
