import { NextRequest } from "next/server";
import { ok, handle } from "@/lib/api/response";
import { parsePeriod } from "@/lib/api/filters";
import { getOfficeHeatmap } from "@/lib/dashboard/officeHeatmap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const { start, end } = parsePeriod(req.nextUrl.searchParams, 7);
    const rows = await getOfficeHeatmap({ periodStart: start, periodEnd: end });
    return ok(rows, { count: rows.length });
  });
}
