import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { appToday } from "@/lib/appToday";
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
  const end = b.endDate ? new Date(b.endDate) : new Date(appToday().getTime() + 86400000 - 1); // 기준일 말일까지
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

    // 필터 해석 — 검찰청(자손 포함)·범죄유형·기저유형·공안 영역을 실제 집계에 반영
    const f = (body.filters ?? {}) as { officeName?: string; crimeType?: string; crimeSubtype?: string; safetyScope?: string };
    const articleWhere: Record<string, unknown> = {};
    let officeNames: string[] | undefined;
    if (f.officeName) {
      const all = await prisma.prosecutionOffice.findMany({ select: { id: true, name: true, parentId: true } });
      const me = all.find((o) => o.name === f.officeName);
      if (me) {
        const ids = new Set<string>([me.id]);
        let grew = true;
        while (grew) { grew = false; for (const o of all) if (o.parentId && ids.has(o.parentId) && !ids.has(o.id)) { ids.add(o.id); grew = true; } }
        articleWhere.primaryOfficeId = { in: [...ids] };
        officeNames = all.filter((o) => ids.has(o.id)).map((o) => o.name);
      }
    }
    if (f.crimeType) articleWhere.crimeType = f.crimeType;
    if (f.crimeSubtype) articleWhere.crimeSubtype = f.crimeSubtype;
    if (f.safetyScope) {
      const assembly = { OR: [{ title: { contains: "집회" } }, { summary: { contains: "집회" } }, { keywords: { contains: "집회" } }] };
      if (f.safetyScope === "assembly") Object.assign(articleWhere, assembly);
      else if (f.safetyScope === "election") articleWhere.crimeType = "선거범죄";
      else if (f.safetyScope === "labor") articleWhere.crimeType = "노동/중대재해범죄";
      else if (f.safetyScope === "all") articleWhere.OR = [
        { crimeType: "선거범죄" }, { crimeType: "노동/중대재해범죄" },
        { title: { contains: "집회" } }, { summary: { contains: "집회" } }, { keywords: { contains: "집회" } },
      ];
    }
    // 이슈(클러스터) 사후 필터용 상위 유형 라벨 — 기저유형(crimeSubtype)은 기사 필터에만 적용
    const crimeTypeLabel = f.crimeType ?? (f.safetyScope === "election" ? "선거범죄" : f.safetyScope === "labor" ? "노동/중대재해범죄" : undefined);

    const data = await buildReportData({ start, end, generatedBy: ctx.user.name, articleWhere, officeNames, crimeTypeLabel });
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
