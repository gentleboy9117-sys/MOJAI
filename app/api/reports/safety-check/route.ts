import { NextRequest } from "next/server";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { checkText } from "@/lib/report/riskChecker";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 공통 문장 리스크 점검기
export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    if (typeof body.text !== "string") return fail(...ERROR.BAD_REQUEST);
    const result = checkText(body.text);
    const ctx = await getRequestContext(req);
    await writeAudit({ userId: ctx.user.id, action: AUDIT_ACTIONS.SAFETY_CHECK, targetType: "Text", ipAddress: ctx.ip, metadata: { riskLevel: result.riskLevel, findings: result.findings.length } });
    return ok(result);
  });
}
