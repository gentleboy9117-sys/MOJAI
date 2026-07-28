import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, handle } from "@/lib/api/response";
import { parseArticleFilters, buildArticleWhere } from "@/lib/api/filters";
import { ISSUE_LEVEL_LABEL, type IssueLevel } from "@/lib/scoring/issueScorer";
import { asArray } from "@/lib/utils";
import { isHistoricalAssemblyOnly } from "@/lib/publicSafety/assemblyNewsFilter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const sp = req.nextUrl.searchParams;
    const f = parseArticleFilters(sp);
    // 고검·대검 등 상위 청 선택 시 산하 지검·지청 기사까지 포함(조직도 롤업 수치와 일치)
    if (f.officeId) {
      const all = await prisma.prosecutionOffice.findMany({ select: { id: true, parentId: true } });
      const ids = new Set<string>([f.officeId]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const o of all) if (o.parentId && ids.has(o.parentId) && !ids.has(o.id)) { ids.add(o.id); grew = true; }
      }
      f.officeIds = [...ids];
    }
    const where = buildArticleWhere(f);
    const limit = Math.min(3000, Number(sp.get("limit") || 100));

    let articles = await prisma.article.findMany({
      where,
      orderBy: sp.get("sort") === "score" ? [{ issueScore: "desc" }, { publishedAt: "desc" }] : { publishedAt: "desc" },
      take: limit,
      include: { issueCluster: { select: { id: true, title: true, articleCount: true, issueLevel: true, issueScore: true } } },
    });
    // 집회·시위 키워드 조회(대시보드 공안 TOP 등)에서는 역사적 회고 기사(5·18 당시 집회 등) 제외
    const kw = sp.get("keyword") ?? "";
    if (/집회|시위/.test(kw)) articles = articles.filter((a) => !isHistoricalAssemblyOnly(a.title, a.summary));

    const officeIds = [...new Set(articles.map((a) => a.primaryOfficeId).filter(Boolean) as string[])];
    const offices = await prisma.prosecutionOffice.findMany({ where: { id: { in: officeIds } }, select: { id: true, name: true } });
    const nameMap = new Map(offices.map((o) => [o.id, o.name]));

    const list = articles.map((a) => ({
      id: a.id,
      title: a.title,
      sourceName: a.sourceName,
      sourceType: a.sourceType,
      publishedAt: a.publishedAt,
      originalUrl: a.resolvedUrl ?? a.originalUrl, // 실제 원문 URL 우선
      summary: a.summary,
      primaryOfficeId: a.primaryOfficeId,
      primaryOfficeName: a.primaryOfficeId ? nameMap.get(a.primaryOfficeId) ?? null : null,
      primaryRegion: a.primaryRegion,
      crimeType: a.crimeType,
      crimeSubtype: a.crimeSubtype,
      classifyConfidence: a.classifyConfidence,
      officeConfidence: a.officeConfidence,
      officeMatchType: a.officeMatchType,
      issueScore: a.issueScore,
      issueLevel: a.issueLevel,
      issueLevelLabel: a.issueLevel ? ISSUE_LEVEL_LABEL[a.issueLevel as IssueLevel] ?? a.issueLevel : null,
      needsHumanReview: a.needsHumanReview,
      reviewReasons: asArray<string>(a.reviewReasons),
      keywords: asArray<string>(a.keywords),
      canDisplayFullText: a.canDisplayFullText,
      licenseType: a.licenseType,
      issueClusterId: a.issueClusterId,
      issueCluster: a.issueCluster,
    }));
    return ok(list, { count: list.length });
  });
}
