import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";
import { checkCollectRateLimit } from "@/lib/security/rateLimit";
import { getNewsProviders, type CollectOptions } from "@/lib/providers/news";
import { classifyArticle, contentHashOf } from "@/lib/classifiers";
import { getOfficeLites, rebuildClusters } from "@/lib/pipeline/runPipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 뉴스/공식자료 수집 → 분류 → 저장 (운영 모드에서 DevCrawler 비활성)
export async function POST(req: NextRequest) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.editClassification(ctx.user.role)) return fail(...ERROR.FORBIDDEN);
    if (!checkCollectRateLimit().ok) return fail(...ERROR.RATE_LIMITED);

    const body = (await req.json().catch(() => ({}))) as CollectOptions;
    const offices = await getOfficeLites();
    const providers = getNewsProviders();

    let collected = 0;
    let saved = 0;
    for (const p of providers) {
      const raws = await p.collect({ rssUrl: body.rssUrl, urls: body.urls, limit: body.limit ?? 20 }).catch(() => []);
      collected += raws.length;
      for (const a of raws) {
        const hash = contentHashOf(a.title, a.originalUrl);
        const exists = await prisma.article.findUnique({ where: { contentHash: hash }, select: { id: true } });
        if (exists) continue;
        const r = classifyArticle({ title: a.title, fullText: a.fullText, summary: a.summary, sourceType: a.sourceType, sourceName: a.sourceName }, offices);
        const primary = r.primaryOffice;
        await prisma.article.create({
          data: {
            title: a.title, sourceName: a.sourceName, publishedAt: a.publishedAt, originalUrl: a.originalUrl,
            fullText: a.canStoreFullText ? a.fullText ?? null : null, summary: a.summary ?? null,
            licenseType: a.licenseType, sourceType: a.sourceType,
            canStoreFullText: a.canStoreFullText, canDisplayFullText: a.canDisplayFullText, copyrightNotice: a.copyrightNotice ?? null,
            primaryOfficeId: primary?.officeId ?? null, primaryRegion: r.region ?? null,
            crimeType: r.crime.crimeType, crimeSubtype: r.crime.crimeSubtype ?? null,
            classifyConfidence: r.crime.confidence, officeConfidence: primary?.confidence ?? null, officeMatchType: primary?.matchType ?? null,
            needsHumanReview: r.needsHumanReview, reviewReasons: JSON.stringify(r.reviewReasons), keywords: JSON.stringify(r.keywords),
            contentHash: hash,
          },
        });
        saved++;
      }
    }
    if (saved > 0) await rebuildClusters();
    await writeAudit({ userId: ctx.user.id, action: AUDIT_ACTIONS.COLLECT, metadata: { collected, saved }, ipAddress: ctx.ip });
    return ok({ collected, saved, note: saved === 0 ? "수집된 신규 항목이 없습니다(소스 URL/모드 확인)." : "수집·분류·클러스터링 완료" });
  });
}
