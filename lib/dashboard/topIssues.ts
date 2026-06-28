// =====================================================================
// 오늘의 주요 이슈 TOP 5 — 보도 파급도(공개 보도 기준) 상위 이슈
// =====================================================================
import { prisma } from "@/lib/db/prisma";
import { ISSUE_LEVEL_LABEL, type IssueLevel } from "@/lib/scoring/issueScorer";
import { SPREAD_LABEL, type SpreadStatus } from "@/lib/scoring/spreadDetector";
import { asArray } from "@/lib/utils";

export interface TopIssue {
  rank: number;
  id: string;
  title: string;
  officeName?: string;
  crimeType?: string;
  region?: string;
  articleCount: number;
  sourceCount: number;
  issueScore: number;
  issueLevel: IssueLevel;
  issueLevelLabel: string;
  spreadStatus: string;
  spreadLabel: string;
  reason: string;
}

export async function getTopIssues(
  opts: { periodStart?: Date; periodEnd?: Date; limit?: number } = {},
): Promise<TopIssue[]> {
  const where =
    opts.periodStart && opts.periodEnd
      ? { lastPublishedAt: { gte: opts.periodStart, lte: opts.periodEnd } }
      : {};
  const clusters = await prisma.issueCluster.findMany({
    where,
    orderBy: [{ issueScore: "desc" }, { lastPublishedAt: "desc" }],
    take: opts.limit ?? 5,
  });

  return clusters.map((c, i) => {
    const level = (c.issueLevel as IssueLevel) ?? "low";
    const spread = (c.spreadStatus as SpreadStatus) ?? "NEW";
    return {
      rank: i + 1,
      id: c.id,
      title: c.title,
      officeName: c.mainOfficeName ?? undefined,
      crimeType: c.mainCrimeType ?? undefined,
      region: c.mainRegion ?? undefined,
      articleCount: c.articleCount,
      sourceCount: c.sourceCount,
      issueScore: c.issueScore,
      issueLevel: level,
      issueLevelLabel: ISSUE_LEVEL_LABEL[level] ?? level,
      spreadStatus: spread,
      spreadLabel: SPREAD_LABEL[spread] ?? spread,
      reason: asArray<string>(c.scoreReasons)[0] ?? "단일 보도 · 추가 관찰 필요",
    };
  });
}
