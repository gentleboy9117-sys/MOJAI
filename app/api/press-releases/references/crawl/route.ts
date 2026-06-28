import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";
import { checkCollectRateLimit } from "@/lib/security/rateLimit";
import { getPressReleaseProvider, SpoPressReleaseProvider } from "@/lib/providers/pressRelease/SpoPressReleaseProvider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 대검 검찰발표자료 레퍼런스 수집(Firecrawl) — 미설정 시 샘플 폴백
export async function POST(req: NextRequest) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.generatePressRelease(ctx.user.role)) return fail(...ERROR.FORBIDDEN);
    const rate = checkCollectRateLimit("press-crawl");
    if (!rate.ok) return fail(...ERROR.RATE_LIMITED);

    const body = await req.json().catch(() => ({}));
    const limit = Number(body.limit ?? process.env.PRESS_RELEASE_REFERENCE_LIMIT ?? 50);

    let refs = await getPressReleaseProvider().collectList(limit).catch(() => []);
    let usedFallback = false;
    if (!refs.length) {
      refs = await new SpoPressReleaseProvider().loadSampleReferences();
      usedFallback = true;
    }

    let saved = 0;
    for (const r of refs.slice(0, limit)) {
      if (!r.contentHash) continue;
      await prisma.pressReleaseReference.upsert({
        where: { contentHash: r.contentHash },
        update: { title: r.title, officeName: r.officeName ?? null, plainText: r.plainText ?? null },
        create: {
          title: r.title, officeName: r.officeName ?? null, publishedAt: r.publishedAt ?? null,
          sourceUrl: r.sourceUrl, listPageUrl: r.listPageUrl ?? null, viewCount: r.viewCount ?? null,
          markdownContent: r.markdownContent ?? null, plainText: r.plainText ?? null,
          attachmentUrls: r.attachmentUrls ? JSON.stringify(r.attachmentUrls) : null,
          attachmentTypes: r.attachmentTypes ? JSON.stringify(r.attachmentTypes) : null,
          contentHash: r.contentHash,
        },
      });
      saved++;
    }
    await writeAudit({ userId: ctx.user.id, action: AUDIT_ACTIONS.CRAWL_PRESS_REF, metadata: { collected: refs.length, saved, usedFallback }, ipAddress: ctx.ip });
    return ok({ collected: refs.length, saved, usedFallback, note: usedFallback ? "FIRECRAWL_API_KEY 미설정 — 샘플 레퍼런스 사용" : "Firecrawl 수집 완료" });
  });
}
