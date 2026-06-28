import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { can } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.viewAuditLogs(ctx.user.role)) return fail(...ERROR.FORBIDDEN);

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(300, Number(req.nextUrl.searchParams.get("limit") || 100)),
      include: { user: { select: { name: true, email: true } } },
    });
    return ok(
      logs.map((l) => ({
        id: l.id, action: l.action, targetType: l.targetType, targetId: l.targetId,
        user: l.user?.name ?? "(시스템)", ipAddress: l.ipAddress,
        metadata: l.metadataJson ? JSON.parse(l.metadataJson) : null, createdAt: l.createdAt,
      })),
      { count: logs.length },
    );
  });
}
