import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 분석관 수동 검토/수정 — 관할/범죄유형/중요도/보고서포함/검토완료
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.reviewArticle(ctx.user.role)) return fail(...ERROR.FORBIDDEN);

    const a = await prisma.article.findUnique({ where: { id: params.id } });
    if (!a) return fail(...ERROR.NOT_FOUND);

    const body = await req.json().catch(() => ({}));
    const data: any = {};
    if (typeof body.crimeType === "string") data.crimeType = body.crimeType;
    if (typeof body.crimeSubtype === "string") data.crimeSubtype = body.crimeSubtype;
    if (typeof body.issueLevel === "string") data.issueLevel = body.issueLevel;
    if (typeof body.includeInReport === "boolean") data.includeInReport = body.includeInReport;
    if (typeof body.issueClusterId === "string") data.issueClusterId = body.issueClusterId;
    if (typeof body.primaryOfficeId === "string") {
      data.primaryOfficeId = body.primaryOfficeId;
      data.officeMatchType = "MANUAL";
      data.officeConfidence = 1;
    }
    if (body.reviewDone === true) {
      data.needsHumanReview = false;
      data.reviewedByUserId = ctx.user.id;
      data.reviewedAt = new Date();
    }

    const updated = await prisma.article.update({ where: { id: a.id }, data });

    if (data.primaryOfficeId || data.crimeType) {
      await prisma.articleClassification.create({
        data: {
          articleId: a.id, prosecutionOfficeId: data.primaryOfficeId ?? a.primaryOfficeId,
          crimeType: data.crimeType ?? a.crimeType, confidence: 1, method: "human", isPrimary: true,
          officeMatchType: "MANUAL", reason: "분석관 수동 수정", editedByUserId: ctx.user.id,
        },
      });
    }
    await writeAudit({ userId: ctx.user.id, action: AUDIT_ACTIONS.REVIEW_ARTICLE, targetType: "Article", targetId: a.id, metadata: { changes: Object.keys(data) }, ipAddress: ctx.ip });
    return ok({ id: updated.id, needsHumanReview: updated.needsHumanReview });
  });
}
