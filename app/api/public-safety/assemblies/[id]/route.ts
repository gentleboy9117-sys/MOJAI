import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { asArray } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 공개 집회 일정 상세 + 관할 추정 근거 + 관련 보도 링크 + 출처
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const e = await prisma.assemblyEvent.findUnique({
      where: { id: params.id },
      include: { articleLinks: { orderBy: { relationConfidence: "desc" } } },
    });
    if (!e) return fail(...ERROR.NOT_FOUND);

    // 관련 기사 본문(공개 보도) 조인
    const articleIds = [...new Set(e.articleLinks.map((l) => l.articleId))];
    const articles = articleIds.length
      ? await prisma.article.findMany({
          where: { id: { in: articleIds } },
          select: {
            id: true,
            title: true,
            summary: true,
            sourceName: true,
            sourceType: true,
            publishedAt: true,
            originalUrl: true,
            canDisplayFullText: true,
          },
        })
      : [];
    const articleMap = new Map(articles.map((a) => [a.id, a]));

    const relatedArticles = e.articleLinks.map((l) => {
      const a = articleMap.get(l.articleId);
      return {
        linkId: l.id,
        articleId: l.articleId,
        title: a?.title ?? "(보도 제목 확인 불가)",
        summary: a?.summary ?? null,
        sourceName: a?.sourceName ?? "출처 미상",
        sourceType: a?.sourceType ?? "WEB_NEWS",
        publishedAt: a?.publishedAt ?? null,
        originalUrl: a?.originalUrl ?? null,
        relationType: l.relationType,
        relationConfidence: l.relationConfidence,
        relationReason: l.relationReason,
        matchedKeywords: asArray<string>(l.matchedKeywords),
        matchedLocation: l.matchedLocation,
        matchedDate: l.matchedDate,
        hasLegalIssueMention: l.hasLegalIssueMention,
        legalIssueKeywords: asArray<string>(l.legalIssueKeywords),
      };
    });

    const dto = {
      id: e.id,
      eventDate: e.eventDate,
      startTime: e.startTime,
      endTime: e.endTime,
      title: e.title,
      locationName: e.locationName,
      address: e.address,
      district: e.district,
      policeStationName: e.policeStationName,
      organizerName: e.organizerName,
      expectedParticipants: e.expectedParticipants,
      marchRoute: e.marchRoute,
      topicSummary: e.topicSummary,
      sourceName: e.sourceName,
      sourceUrl: e.sourceUrl,
      sourcePostTitle: e.sourcePostTitle,
      sourcePublishedAt: e.sourcePublishedAt,
      collectedAt: e.collectedAt,
      attachmentUrls: asArray<string>(e.attachmentUrls),
      // 관할(추정)
      prosecutionOfficeId: e.prosecutionOfficeId,
      prosecutionOfficeName: e.prosecutionOfficeName,
      jurisdictionConfidence: e.jurisdictionConfidence,
      jurisdictionReason: e.jurisdictionReason,
      jurisdictionMethod: e.jurisdictionMethod,
      needsHumanReview: e.needsHumanReview,
      reviewReason: e.reviewReason,
      reviewedAt: e.reviewedAt,
      relatedArticles,
      hasLegalIssueMention: relatedArticles.some((a) => a.hasLegalIssueMention),
      notice:
        "집회·시위는 헌법상 기본권 행사일 수 있으며 범죄로 단정하지 않습니다. 관할은 추정이며, 관련 보도는 공개 보도입니다. 최종 판단은 담당자.",
    };
    return ok(dto);
  });
}
