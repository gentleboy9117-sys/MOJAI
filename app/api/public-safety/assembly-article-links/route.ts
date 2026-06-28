import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, handle } from "@/lib/api/response";
import { asArray } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 집회 ↔ 공개 보도 링크 목록 (필터: assemblyEventId / legalIssueOnly / needsReview)
export async function GET(req: NextRequest) {
  return handle(async () => {
    const sp = req.nextUrl.searchParams;
    const assemblyEventId = sp.get("assemblyEventId") || undefined;
    const legalIssueOnly = sp.get("legalIssueOnly") === "true";
    const needsReview = sp.get("needsReview") === "true";
    const limit = Math.min(500, Number(sp.get("limit") || 200));

    const where: any = {};
    if (assemblyEventId) where.assemblyEventId = assemblyEventId;
    if (legalIssueOnly) where.hasLegalIssueMention = true;
    if (needsReview) where.needsHumanReview = true;

    const links = await prisma.assemblyArticleLink.findMany({
      where,
      orderBy: { relationConfidence: "desc" },
      take: limit,
    });

    const eventIds = [...new Set(links.map((l) => l.assemblyEventId))];
    const articleIds = [...new Set(links.map((l) => l.articleId))];
    const [events, articles] = await Promise.all([
      eventIds.length
        ? prisma.assemblyEvent.findMany({
            where: { id: { in: eventIds } },
            select: {
              id: true,
              eventDate: true,
              locationName: true,
              prosecutionOfficeName: true,
            },
          })
        : Promise.resolve([]),
      articleIds.length
        ? prisma.article.findMany({
            where: { id: { in: articleIds } },
            select: { id: true, title: true, sourceName: true, publishedAt: true },
          })
        : Promise.resolve([]),
    ]);
    const eventMap = new Map(events.map((e) => [e.id, e]));
    const articleMap = new Map(articles.map((a) => [a.id, a]));

    const list = links.map((l) => {
      const e = eventMap.get(l.assemblyEventId);
      const a = articleMap.get(l.articleId);
      return {
        id: l.id,
        assemblyEventId: l.assemblyEventId,
        assemblyDate: e?.eventDate ?? null,
        locationName: e?.locationName ?? null,
        officeName: e?.prosecutionOfficeName ?? "관할 추정",
        articleId: l.articleId,
        articleTitle: a?.title ?? "(보도 제목 확인 불가)",
        sourceName: a?.sourceName ?? "출처 미상",
        publishedAt: a?.publishedAt ?? null,
        relationType: l.relationType,
        relationConfidence: l.relationConfidence,
        relationReason: l.relationReason,
        matchedKeywords: asArray<string>(l.matchedKeywords),
        hasLegalIssueMention: l.hasLegalIssueMention,
        legalIssueKeywords: asArray<string>(l.legalIssueKeywords),
        needsHumanReview: l.needsHumanReview,
      };
    });

    return ok(list, { count: list.length });
  });
}
