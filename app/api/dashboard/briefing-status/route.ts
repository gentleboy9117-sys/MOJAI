import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, handle } from "@/lib/api/response";
import { asArray } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  return handle(async () => {
    const run = await prisma.briefingRun.findFirst({ orderBy: { runAt: "desc" } });
    if (!run) return ok(null);
    return ok({
      id: run.id,
      runAt: run.runAt,
      status: run.status,
      articleCount: run.articleCount,
      issueCount: run.issueCount,
      reviewNeededCount: run.reviewNeededCount,
      topIssueIds: asArray<string>(run.topIssueIds),
      reportId: run.reportId,
      message: run.message,
    });
  });
}
