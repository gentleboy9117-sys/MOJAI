import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { appToday } from "@/lib/appToday";
import { ok, handle } from "@/lib/api/response";
import { getRelatedNews, type DashboardPeriod } from "@/lib/publicSafety/publicSafetyDashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 집회 관련 보도 현황 (관련 보도는 범죄가 아니라 공개 보도)
export async function GET(req: NextRequest) {
  return handle(async () => {
    const period = (req.nextUrl.searchParams.get("period") || "7d") as DashboardPeriod;
    const rows = await getRelatedNews(prisma, period, appToday());
    return ok(rows, { count: rows.length });
  });
}
