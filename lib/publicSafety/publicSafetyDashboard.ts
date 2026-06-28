// =====================================================================
// [공안] 대시보드 집계
//  * 집회·시위는 '공개 일정 정보' 로만 집계한다(범죄 통계 아님).
//  * 관련 보도는 '집회 관련 보도' 로 집계한다.
//  * 법적 이슈 언급 수는 '공개 보도 기준 법적 이슈 가능성 언급' 건수다(확정 아님).
// =====================================================================
import type { PrismaClient } from "@prisma/client";
import { asArray } from "@/lib/utils";
import { OFFICE_ORDER, OFFICE_TO_HIGH } from "./assemblyJurisdictionClassifier";

const DAY = 86400000;

export type DashboardPeriod = "today" | "tomorrow" | "dayafter" | "7d" | "30d" | "all";

function periodRange(period: DashboardPeriod, now: Date): { start?: Date; end?: Date } {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "today":
      return { start: startOfToday, end: new Date(startOfToday.getTime() + DAY) };
    case "tomorrow":
      return {
        start: new Date(startOfToday.getTime() + DAY),
        end: new Date(startOfToday.getTime() + 2 * DAY),
      };
    case "dayafter":
      return {
        start: new Date(startOfToday.getTime() + 2 * DAY),
        end: new Date(startOfToday.getTime() + 3 * DAY),
      };
    case "7d":
      return { start: startOfToday, end: new Date(startOfToday.getTime() + 7 * DAY) };
    case "30d":
      return { start: startOfToday, end: new Date(startOfToday.getTime() + 30 * DAY) };
    case "all":
    default:
      return {};
  }
}

export interface AssemblySummary {
  todayCount: number;
  tomorrowCount: number;
  byOfficeCount: number;
  withRelatedReportCount: number;
  legalIssueMentionCount: number;
  reviewNeededCount: number;
}

/** 요약 카드용 집계 */
export async function getAssemblySummary(
  prisma: PrismaClient,
  now: Date = new Date(),
): Promise<AssemblySummary> {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + DAY);
  const startOfDayAfter = new Date(startOfToday.getTime() + 2 * DAY);

  const [todayCount, tomorrowCount, distinctOffices, reviewNeededCount, linkAgg] =
    await Promise.all([
      prisma.assemblyEvent.count({
        where: { eventDate: { gte: startOfToday, lt: startOfTomorrow } },
      }),
      prisma.assemblyEvent.count({
        where: { eventDate: { gte: startOfTomorrow, lt: startOfDayAfter } },
      }),
      prisma.assemblyEvent.findMany({
        where: { prosecutionOfficeId: { not: null } },
        select: { prosecutionOfficeId: true },
        distinct: ["prosecutionOfficeId"],
      }),
      prisma.assemblyEvent.count({ where: { needsHumanReview: true } }),
      prisma.assemblyArticleLink.findMany({
        select: { assemblyEventId: true, hasLegalIssueMention: true },
      }),
    ]);

  const withReport = new Set(linkAgg.map((l) => l.assemblyEventId));
  const legalIssueMentionCount = linkAgg.filter((l) => l.hasLegalIssueMention).length;

  return {
    todayCount,
    tomorrowCount,
    byOfficeCount: distinctOffices.length,
    withRelatedReportCount: withReport.size,
    legalIssueMentionCount,
    reviewNeededCount,
  };
}

export interface AssemblyByOfficeRow {
  officeId: string | null;
  officeName: string;
  highOffice: string | null;
  assemblyCount: number;
  mainLocations: string[];
  relatedReportCount: number;
  legalIssueCount: number;
  reviewNeededCount: number;
  avgJurisdictionConfidence: number;
}

/** 검찰청 관할별 집회 현황 */
export async function getAssemblyByOffice(
  prisma: PrismaClient,
  period: DashboardPeriod = "7d",
  now: Date = new Date(),
  dateStr?: string,
): Promise<AssemblyByOfficeRow[]> {
  let start: Date | undefined;
  let end: Date | undefined;
  if (dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    start = new Date(y, m - 1, d);
    end = new Date(start.getTime() + DAY);
  } else {
    ({ start, end } = periodRange(period, now));
  }
  const where = start ? { eventDate: { gte: start, lt: end } } : {};

  const events = await prisma.assemblyEvent.findMany({
    where,
    select: {
      id: true,
      prosecutionOfficeId: true,
      prosecutionOfficeName: true,
      locationName: true,
      jurisdictionConfidence: true,
      needsHumanReview: true,
    },
    orderBy: { eventDate: "asc" },
  });

  const eventIds = events.map((e) => e.id);
  const links = eventIds.length
    ? await prisma.assemblyArticleLink.findMany({
        where: { assemblyEventId: { in: eventIds } },
        select: { assemblyEventId: true, hasLegalIssueMention: true },
      })
    : [];

  const reportByEvent = new Map<string, { count: number; legal: number }>();
  for (const l of links) {
    const cur = reportByEvent.get(l.assemblyEventId) ?? { count: 0, legal: 0 };
    cur.count += 1;
    if (l.hasLegalIssueMention) cur.legal += 1;
    reportByEvent.set(l.assemblyEventId, cur);
  }

  const byOffice = new Map<
    string,
    {
      officeId: string | null;
      officeName: string;
      assemblyCount: number;
      locations: Map<string, number>;
      relatedReportCount: number;
      legalIssueCount: number;
      reviewNeededCount: number;
      confidenceSum: number;
      confidenceN: number;
    }
  >();

  for (const e of events) {
    const key = e.prosecutionOfficeId ?? "__none__";
    const row =
      byOffice.get(key) ??
      {
        officeId: e.prosecutionOfficeId,
        officeName: e.prosecutionOfficeName ?? "미분류 (관할 미상)",
        assemblyCount: 0,
        locations: new Map<string, number>(),
        relatedReportCount: 0,
        legalIssueCount: 0,
        reviewNeededCount: 0,
        confidenceSum: 0,
        confidenceN: 0,
      };
    row.assemblyCount += 1;
    if (e.locationName) row.locations.set(e.locationName, (row.locations.get(e.locationName) ?? 0) + 1);
    if (e.needsHumanReview) row.reviewNeededCount += 1;
    if (typeof e.jurisdictionConfidence === "number") {
      row.confidenceSum += e.jurisdictionConfidence;
      row.confidenceN += 1;
    }
    const rep = reportByEvent.get(e.id);
    if (rep) {
      row.relatedReportCount += rep.count;
      row.legalIssueCount += rep.legal;
    }
    byOffice.set(key, row);
  }

  const rows: AssemblyByOfficeRow[] = Array.from(byOffice.values()).map((r) => ({
    officeId: r.officeId,
    officeName: r.officeName,
    highOffice: r.officeId ? OFFICE_TO_HIGH[r.officeName] ?? null : null,
    assemblyCount: r.assemblyCount,
    mainLocations: Array.from(r.locations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([loc]) => loc),
    relatedReportCount: r.relatedReportCount,
    legalIssueCount: r.legalIssueCount,
    reviewNeededCount: r.reviewNeededCount,
    avgJurisdictionConfidence: r.confidenceN ? r.confidenceSum / r.confidenceN : 0,
  }));

  // 고검-지검-지청 순 정렬(미분류 맨 뒤)
  rows.sort((a, b) => {
    const oa = a.officeId ? OFFICE_ORDER[a.officeName] ?? 9998 : 9999;
    const ob = b.officeId ? OFFICE_ORDER[b.officeName] ?? 9998 : 9999;
    return oa - ob;
  });
  return rows;
}

export interface RelatedNewsRow {
  assemblyEventId: string;
  assemblyDate: Date;
  locationName: string;
  officeName: string;
  articleId: string;
  articleTitle: string;
  sourceName: string;
  publishedAt: Date | null;
  relationConfidence: number;
  relationReason: string;
  relationType: string;
  hasLegalIssueMention: boolean;
  needsHumanReview: boolean;
}

/** 집회 관련 보도 현황(링크 + 집회 + 기사 조인) */
export async function getRelatedNews(
  prisma: PrismaClient,
  period: DashboardPeriod = "7d",
  now: Date = new Date(),
): Promise<RelatedNewsRow[]> {
  const { start, end } = periodRange(period, now);
  const eventWhere = start ? { eventDate: { gte: start, lt: end } } : {};

  const events = await prisma.assemblyEvent.findMany({
    where: eventWhere,
    select: {
      id: true,
      eventDate: true,
      locationName: true,
      prosecutionOfficeName: true,
    },
  });
  if (events.length === 0) return [];
  const eventMap = new Map(events.map((e) => [e.id, e]));

  const links = await prisma.assemblyArticleLink.findMany({
    where: { assemblyEventId: { in: events.map((e) => e.id) } },
    orderBy: { relationConfidence: "desc" },
  });
  if (links.length === 0) return [];

  const articleIds = [...new Set(links.map((l) => l.articleId))];
  const articles = await prisma.article.findMany({
    where: { id: { in: articleIds } },
    select: { id: true, title: true, sourceName: true, publishedAt: true },
  });
  const articleMap = new Map(articles.map((a) => [a.id, a]));

  const rows: RelatedNewsRow[] = [];
  for (const l of links) {
    const e = eventMap.get(l.assemblyEventId);
    const a = articleMap.get(l.articleId);
    if (!e) continue;
    rows.push({
      assemblyEventId: l.assemblyEventId,
      assemblyDate: e.eventDate,
      locationName: e.locationName,
      officeName: e.prosecutionOfficeName ?? "관할 추정",
      articleId: l.articleId,
      articleTitle: a?.title ?? "(보도 제목 확인 불가)",
      sourceName: a?.sourceName ?? "출처 미상",
      publishedAt: a?.publishedAt ?? null,
      relationConfidence: l.relationConfidence,
      relationReason: l.relationReason ?? "",
      relationType: l.relationType,
      hasLegalIssueMention: l.hasLegalIssueMention,
      needsHumanReview: l.needsHumanReview,
    });
  }
  return rows;
}

/** 링크 row 의 matchedKeywords(JSON) 파싱 헬퍼 — UI/응답 공용 */
export function parseLinkKeywords(matchedKeywords: string | null): string[] {
  return asArray<string>(matchedKeywords);
}
