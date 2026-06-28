import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, handle } from "@/lib/api/response";
import { getAssemblySummary } from "@/lib/publicSafety/publicSafetyDashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 공안 대시보드 요약 카드 (공개 일정 기준 집계)
export async function GET(_req: NextRequest) {
  return handle(async () => {
    const summary = await getAssemblySummary(prisma, new Date());
    return ok(summary);
  });
}
