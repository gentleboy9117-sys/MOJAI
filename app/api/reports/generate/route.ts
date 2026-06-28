import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";
import { buildReportData } from "@/lib/report/buildReportData";
import { generateReportMarkdown } from "@/lib/report/reportGenerator";
import { checkText } from "@/lib/report/riskChecker";
import type { ReportType } from "@/lib/report/reportTemplates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY = 86400000;
function periodFromBody(b: any): { start: Date; end: Date } {
  const end = b.endDate ? new Date(b.endDate) : new Date();
  if (b.startDate) return { start: new Date(b.startDate), end };
  if (b.period === "all") return { start: new Date(0), end };
  const days = b.period === "today" ? 1 : b.period === "30d" ? 30 : b.period === "7d" ? 7 : 7;
  return { start: new Date(end.getTime() - days * DAY), end };
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.generateReport(ctx.user.role)) return fail(...ERROR.FORBIDDEN);
    const body = await req.json().catch(() => ({}));
    const reportType = (body.reportType ?? "ANALYST_DETAIL") as ReportType;
    const { start, end } = periodFromBody(body);

    const data = await buildReportData({ start, end, generatedBy: ctx.user.name });
    const { title, markdown } = generateReportMarkdown(data, reportType);
    const safety = checkText(markdown);

    const report = await prisma.report.create({
      data: {
        title, reportType, periodStart: start, periodEnd: end,
        filtersJson: JSON.stringify(body.filters ?? {}),
        markdownContent: markdown, safetyCheckJson: JSON.stringify(safety),
        sourceCount: data.sources.length, issueCount: data.issueCount, createdById: ctx.user.id,
      },
    });
    await writeAudit({ userId: ctx.user.id, action: AUDIT_ACTIONS.GENERATE_REPORT, targetType: "Report", targetId: report.id, metadata: { reportType }, ipAddress: ctx.ip });

    return ok({ id: report.id, title, reportType, markdown, safety, sourceCount: data.sources.length, issueCount: data.issueCount });
  });
}
