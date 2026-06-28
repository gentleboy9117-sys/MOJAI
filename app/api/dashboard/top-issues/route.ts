import { NextRequest } from "next/server";
import { ok, handle } from "@/lib/api/response";
import { parsePeriod } from "@/lib/api/filters";
import { getTopIssues } from "@/lib/dashboard/topIssues";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const sp = req.nextUrl.searchParams;
    const { start, end } = parsePeriod(sp, 7);
    const limit = Number(sp.get("limit") || 5);
    const issues = await getTopIssues({ periodStart: start, periodEnd: end, limit });
    return ok(issues);
  });
}
