import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";
import { checkText } from "@/lib/report/riskChecker";
import {
  buildPublicSafetyBriefingData,
  generatePublicSafetyBriefingMarkdown,
  PUBLIC_SAFETY_BRIEFING_TYPES,
  type PublicSafetyBriefingType,
} from "@/lib/publicSafety/publicSafetyBriefingGenerator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY = 86400000;

function resolveRange(type: PublicSafetyBriefingType, now: Date): { start: Date; end: Date } {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (type === "DAILY") {
    return { start: startOfToday, end: new Date(startOfToday.getTime() + 2 * DAY) };
  }
  // WEEKLY / BY_OFFICE / LEGAL_ISSUE_REVIEW → 향후 7일
  return { start: startOfToday, end: new Date(startOfToday.getTime() + 7 * DAY) };
}

// 공안 브리핑 생성 → 안전 점검(checkText) → PublicSafetyBriefing 저장 + 감사
export async function POST(req: NextRequest) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.generateReport(ctx.user.role)) return fail(...ERROR.FORBIDDEN);

    const body = (await req.json().catch(() => ({}))) as {
      briefingType?: string;
      officeId?: string;
    };
    const briefingType = (
      PUBLIC_SAFETY_BRIEFING_TYPES.some((t) => t.key === body.briefingType)
        ? body.briefingType
        : "DAILY"
    ) as PublicSafetyBriefingType;

    const now = new Date();
    const { start, end } = resolveRange(briefingType, now);

    const data = await buildPublicSafetyBriefingData(prisma, {
      start,
      end,
      generatedBy: ctx.user.name || "분석관",
      now,
      type: briefingType,
    });
    const { title, markdown } = generatePublicSafetyBriefingMarkdown(data, briefingType);
    const safety = checkText(markdown);

    const briefing = await prisma.publicSafetyBriefing.create({
      data: {
        title,
        briefingType,
        periodStart: start,
        periodEnd: end,
        prosecutionOfficeId: body.officeId ?? null,
        filtersJson: JSON.stringify({ briefingType, officeId: body.officeId ?? null }),
        markdownContent: markdown,
        safetyCheckJson: JSON.stringify(safety),
        createdById: ctx.user.id,
      },
    });

    await writeAudit({
      userId: ctx.user.id,
      action: "GENERATE_PUBLIC_SAFETY_BRIEFING",
      targetType: "PublicSafetyBriefing",
      targetId: briefing.id,
      metadata: { briefingType, riskLevel: safety.riskLevel },
      ipAddress: ctx.ip,
    });

    return ok({
      id: briefing.id,
      title,
      briefingType,
      markdown,
      safety,
      periodStart: start,
      periodEnd: end,
      createdAt: briefing.createdAt,
    });
  });
}
