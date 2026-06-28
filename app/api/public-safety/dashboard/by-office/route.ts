import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, handle } from "@/lib/api/response";
import { getAssemblyByOffice, type DashboardPeriod } from "@/lib/publicSafety/publicSafetyDashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 검찰청 관할별 공개 집회 현황 (관할은 추정)
export async function GET(req: NextRequest) {
  return handle(async () => {
    const period = (req.nextUrl.searchParams.get("period") || "7d") as DashboardPeriod;
    const date = req.nextUrl.searchParams.get("date") || undefined;
    const rows = await getAssemblyByOffice(prisma, period, new Date(), date);
    return ok(rows, { count: rows.length });
  });
}
