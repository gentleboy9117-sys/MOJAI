import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 분석관 검토 완료 — needsHumanReview=false, (선택) 관할 수동 수정
// 관할 수정 시 AssemblyJurisdictionCorrection 기록 + 이벤트 갱신 + 감사
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.reviewArticle(ctx.user.role)) return fail(...ERROR.FORBIDDEN);

    const e = await prisma.assemblyEvent.findUnique({ where: { id: params.id } });
    if (!e) return fail(...ERROR.NOT_FOUND);

    const body = await req.json().catch(() => ({} as any));
    const correctedOfficeId: string | undefined =
      typeof body.correctedOfficeId === "string" && body.correctedOfficeId
        ? body.correctedOfficeId
        : undefined;
    const reason: string | undefined =
      typeof body.reason === "string" ? body.reason : undefined;

    const data: any = {
      needsHumanReview: false,
      reviewReason: null,
      reviewedByUserId: ctx.user.id,
      reviewedAt: new Date(),
    };

    if (correctedOfficeId && correctedOfficeId !== e.prosecutionOfficeId) {
      const office = await prisma.prosecutionOffice.findUnique({
        where: { id: correctedOfficeId },
        select: { id: true, name: true },
      });
      if (!office) return fail(...ERROR.BAD_REQUEST);

      await prisma.assemblyJurisdictionCorrection.create({
        data: {
          assemblyEventId: e.id,
          previousOfficeId: e.prosecutionOfficeId ?? null,
          correctedOfficeId: office.id,
          reason: reason ?? "담당자 수동 관할 수정",
          correctedBy: ctx.user.id ?? null,
        },
      });

      data.prosecutionOfficeId = office.id;
      data.prosecutionOfficeName = office.name;
      data.jurisdictionMethod = "MANUAL";
      data.jurisdictionConfidence = 1;
      data.jurisdictionReason = reason ?? "담당자 수동 관할 수정(확정)";
    }

    const updated = await prisma.assemblyEvent.update({ where: { id: e.id }, data });

    await writeAudit({
      userId: ctx.user.id,
      action: "REVIEW_ASSEMBLY",
      targetType: "AssemblyEvent",
      targetId: e.id,
      metadata: {
        correctedOfficeId: correctedOfficeId ?? null,
        changed: Object.keys(data),
      },
      ipAddress: ctx.ip,
    });

    return ok({
      id: updated.id,
      needsHumanReview: updated.needsHumanReview,
      prosecutionOfficeId: updated.prosecutionOfficeId,
      prosecutionOfficeName: updated.prosecutionOfficeName,
      jurisdictionMethod: updated.jurisdictionMethod,
    });
  });
}
