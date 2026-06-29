import { NextRequest } from "next/server";
import { ok, handle } from "@/lib/api/response";
import { getOfficeHeatmap } from "@/lib/dashboard/officeHeatmap";
import { calendarRange, type CalPeriod } from "@/lib/periodRange";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handle(async () => {
    // 달력 기준 기간(오늘/금주/금월) + 동기간 대비 — 구버전(7d/30d) 요청은 month로 처리
    const raw = req.nextUrl.searchParams.get("period");
    const period: CalPeriod = raw === "today" ? "today" : raw === "week" ? "week" : "month";
    const r = calendarRange(period);
    const rows = await getOfficeHeatmap({ periodStart: r.start, periodEnd: r.end, prevStart: r.prevStart, prevEnd: r.prevEnd });
    return ok(rows, { count: rows.length, period, deltaLabel: r.deltaLabel });
  });
}
