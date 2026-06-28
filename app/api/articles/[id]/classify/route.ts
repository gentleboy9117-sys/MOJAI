import { NextRequest } from "next/server";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";
import { reclassifyArticle } from "@/lib/pipeline/runPipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.editClassification(ctx.user.role)) return fail(...ERROR.FORBIDDEN);
    const body = await req.json().catch(() => ({}));
    const r = await reclassifyArticle(params.id, undefined, body.useLlm === true);
    await writeAudit({ userId: ctx.user.id, action: AUDIT_ACTIONS.CLASSIFY, targetType: "Article", targetId: params.id, ipAddress: ctx.ip });
    return ok({
      crimeType: r.crime.crimeType, crimeSubtype: r.crime.crimeSubtype, crimeConfidence: r.crime.confidence,
      primaryOffice: r.primaryOffice ?? null, needsHumanReview: r.needsHumanReview,
      reviewReasons: r.reviewReasons, classificationReasons: r.classificationReasons,
    });
  });
}
