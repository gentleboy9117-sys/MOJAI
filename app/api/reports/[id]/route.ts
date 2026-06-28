import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const r = await prisma.report.findUnique({ where: { id: params.id } });
    if (!r) return fail(...ERROR.NOT_FOUND);
    return ok({
      id: r.id, title: r.title, reportType: r.reportType,
      periodStart: r.periodStart, periodEnd: r.periodEnd,
      markdown: r.markdownContent,
      safety: r.safetyCheckJson ? JSON.parse(r.safetyCheckJson) : null,
      sourceCount: r.sourceCount, issueCount: r.issueCount, createdAt: r.createdAt,
    });
  });
}
