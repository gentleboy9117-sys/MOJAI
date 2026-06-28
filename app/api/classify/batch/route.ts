import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";
import { getOfficeLites, reclassifyArticle, rebuildClusters, persistTrendAlerts } from "@/lib/pipeline/runPipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.editClassification(ctx.user.role)) return fail(...ERROR.FORBIDDEN);
    const body = await req.json().catch(() => ({}));
    const offices = await getOfficeLites();

    const where = body.onlyReview ? { needsHumanReview: true } : {};
    const targets = await prisma.article.findMany({ where, select: { id: true }, take: 500 });
    for (const t of targets) await reclassifyArticle(t.id, offices, body.useLlm === true);

    const clusters = await rebuildClusters();
    const trends = await persistTrendAlerts();
    await writeAudit({ userId: ctx.user.id, action: AUDIT_ACTIONS.CLASSIFY_BATCH, metadata: { classified: targets.length, clusters, trends }, ipAddress: ctx.ip });
    return ok({ classified: targets.length, clusters, trends });
  });
}
