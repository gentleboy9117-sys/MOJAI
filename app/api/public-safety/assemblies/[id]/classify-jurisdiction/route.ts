import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";
import { classifyAssemblyJurisdiction } from "@/lib/publicSafety/assemblyJurisdictionClassifier";
import { getJurisdictionOffices } from "@/lib/publicSafety/runAssemblyPipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 관할(추정) 분류기 재실행 — 자동 추정이며 단정 아님(담당자 검토 필요)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.editClassification(ctx.user.role)) return fail(...ERROR.FORBIDDEN);

    const e = await prisma.assemblyEvent.findUnique({ where: { id: params.id } });
    if (!e) return fail(...ERROR.NOT_FOUND);

    const offices = await getJurisdictionOffices(prisma);
    const j = classifyAssemblyJurisdiction(
      {
        locationName: e.locationName,
        address: e.address ?? undefined,
        district: e.district ?? undefined,
        policeStationName: e.policeStationName ?? undefined,
      },
      offices,
    );

    const updated = await prisma.assemblyEvent.update({
      where: { id: e.id },
      data: {
        prosecutionOfficeId: j.officeId ?? null,
        prosecutionOfficeName: j.officeName ?? null,
        jurisdictionConfidence: j.confidence,
        jurisdictionReason: j.reason,
        jurisdictionMethod: j.method,
        needsHumanReview: j.needsHumanReview,
        reviewReason: j.needsHumanReview ? j.reason : null,
      },
    });

    await writeAudit({
      userId: ctx.user.id,
      action: "CLASSIFY_ASSEMBLY_JURISDICTION",
      targetType: "AssemblyEvent",
      targetId: e.id,
      metadata: { method: j.method, confidence: j.confidence, officeName: j.officeName },
      ipAddress: ctx.ip,
    });

    return ok({
      id: updated.id,
      prosecutionOfficeId: updated.prosecutionOfficeId,
      prosecutionOfficeName: updated.prosecutionOfficeName,
      jurisdictionConfidence: updated.jurisdictionConfidence,
      jurisdictionReason: updated.jurisdictionReason,
      jurisdictionMethod: updated.jurisdictionMethod,
      needsHumanReview: updated.needsHumanReview,
    });
  });
}
