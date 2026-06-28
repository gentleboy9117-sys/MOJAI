import { NextRequest } from "next/server";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.editClassification(ctx.user.role)) return fail(...ERROR.FORBIDDEN);
    const count = await rebuildClusters();
    await writeAudit({ userId: ctx.user.id, action: AUDIT_ACTIONS.CLUSTER, metadata: { clusters: count }, ipAddress: ctx.ip });
    return ok({ clusters: count });
  });
}
