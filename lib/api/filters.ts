// 기사/이슈 조회 필터 파싱
import type { Prisma } from "@prisma/client";

const DAY = 86400000;

export function parsePeriod(sp: URLSearchParams, defaultDays = 7): { start: Date; end: Date } {
  const end = sp.get("endDate") ? new Date(sp.get("endDate")!) : new Date();
  const preset = sp.get("period");
  if (sp.get("startDate")) return { start: new Date(sp.get("startDate")!), end };
  let days = defaultDays;
  if (preset === "today") days = 1;
  else if (preset === "7d") days = 7;
  else if (preset === "30d") days = 30;
  else if (preset === "all") return { start: new Date(0), end };
  return { start: new Date(end.getTime() - days * DAY), end };
}

export interface ArticleFilters {
  start: Date;
  end: Date;
  officeId?: string;
  /** officeId의 자손 청까지 포함한 확장 목록(라우트에서 계산해 주입) */
  officeIds?: string[];
  region?: string;
  crimeType?: string;
  source?: string;
  keyword?: string;
  needsReview?: boolean;
  minConfidence?: number;
}

export function parseArticleFilters(sp: URLSearchParams): ArticleFilters {
  const { start, end } = parsePeriod(sp, 30);
  return {
    start,
    end,
    officeId: sp.get("officeId") || undefined,
    region: sp.get("region") || undefined,
    crimeType: sp.get("crimeType") || undefined,
    source: sp.get("source") || undefined,
    keyword: sp.get("keyword") || undefined,
    needsReview: sp.get("needsReview") === "true" ? true : undefined,
    minConfidence: sp.get("minConfidence") ? Number(sp.get("minConfidence")) : undefined,
  };
}

export function buildArticleWhere(f: ArticleFilters): Prisma.ArticleWhereInput {
  const where: Prisma.ArticleWhereInput = {
    publishedAt: { gte: f.start, lte: f.end },
  };
  if (f.officeIds && f.officeIds.length) where.primaryOfficeId = { in: f.officeIds };
  else if (f.officeId) where.primaryOfficeId = f.officeId;
  if (f.region) where.primaryRegion = f.region;
  if (f.crimeType) where.crimeType = f.crimeType;
  if (f.source) where.sourceName = { contains: f.source };
  if (f.needsReview) where.needsHumanReview = true;
  if (f.minConfidence != null) where.officeConfidence = { gte: f.minConfidence };
  if (f.keyword) {
    where.OR = [
      { title: { contains: f.keyword } },
      { summary: { contains: f.keyword } },
      { keywords: { contains: f.keyword } },
    ];
  }
  return where;
}
