import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { ok, handle } from "@/lib/api/response";
import { parsePeriod } from "@/lib/api/filters";
import { ISSUE_LEVEL_LABEL, type IssueLevel } from "@/lib/scoring/issueScorer";
import { SPREAD_LABEL, type SpreadStatus } from "@/lib/scoring/spreadDetector";
import { asArray } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const sp = req.nextUrl.searchParams;
    const { start, end } = parsePeriod(sp, 30);
    const where: Prisma.IssueClusterWhereInput = { lastPublishedAt: { gte: start, lte: end } };
    if (sp.get("crimeType")) where.mainCrimeType = sp.get("crimeType")!;
    if (sp.get("officeId")) where.mainOfficeId = sp.get("officeId")!;
    if (sp.get("region")) where.mainRegion = sp.get("region")!;
    if (sp.get("minScore")) where.issueScore = { gte: Number(sp.get("minScore")) };
    if (sp.get("q")) where.title = { contains: sp.get("q")! };

    const sort = sp.get("sort");
    const orderBy: Prisma.IssueClusterOrderByWithRelationInput =
      sort === "recent" ? { lastPublishedAt: "desc" } : { issueScore: "desc" };

    const clusters = await prisma.issueCluster.findMany({
      where,
      orderBy: [orderBy, { lastPublishedAt: "desc" }],
      take: Math.min(200, Number(sp.get("limit") || 100)),
    });

    const list = clusters.map((c) => {
      const level = (c.issueLevel as IssueLevel) ?? "low";
      const spread = (c.spreadStatus as SpreadStatus) ?? "NEW";
      return {
        id: c.id,
        title: c.title,
        summary: c.summary,
        officeName: c.mainOfficeName,
        crimeType: c.mainCrimeType,
        region: c.mainRegion,
        issueScore: c.issueScore,
        issueLevel: level,
        issueLevelLabel: ISSUE_LEVEL_LABEL[level] ?? level,
        spreadStatus: spread,
        spreadLabel: SPREAD_LABEL[spread] ?? spread,
        scoreReasons: asArray<string>(c.scoreReasons),
        firstPublishedAt: c.firstPublishedAt,
        lastPublishedAt: c.lastPublishedAt,
        articleCount: c.articleCount,
        sourceCount: c.sourceCount,
        recent24hCount: c.recent24hCount,
        crossOffice: c.crossOffice,
        hasOfficialPress: c.hasOfficialPress,
        hasMediaCoverage: c.hasMediaCoverage,
        highlighted: c.articleCount >= 3, // 다수 보도 사건 강조
      };
    });
    return ok(list, { count: list.length, metric: "보도 파급도 (공개 보도 기준)" });
  });
}
