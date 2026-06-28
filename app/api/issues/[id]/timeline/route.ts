import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";
import { buildTimeline } from "@/lib/timeline/timelineExtractor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 단일 이슈 타임라인 재생성(보도 기반)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.editClassification(ctx.user.role)) return fail(...ERROR.FORBIDDEN);

    const cluster = await prisma.issueCluster.findUnique({ where: { id: params.id }, include: { articles: true } });
    if (!cluster) return fail(...ERROR.NOT_FOUND);

    const timeline = buildTimeline(cluster.articles.map((a) => ({ id: a.id, title: a.title, summary: a.summary, publishedAt: a.publishedAt, sourceType: a.sourceType })));
    await prisma.issueTimelineEvent.deleteMany({ where: { issueClusterId: cluster.id } });
    if (timeline.length) {
      await prisma.issueTimelineEvent.createMany({ data: timeline.map((t) => ({ issueClusterId: cluster.id, articleId: t.articleId, eventDate: t.eventDate, eventTitle: t.eventTitle, eventSummary: t.eventSummary, sourceType: t.sourceType, confidence: t.confidence })) });
    }
    await writeAudit({ userId: ctx.user.id, action: "GENERATE_TIMELINE", targetType: "IssueCluster", targetId: cluster.id, ipAddress: ctx.ip });
    return ok({ events: timeline.length });
  });
}
