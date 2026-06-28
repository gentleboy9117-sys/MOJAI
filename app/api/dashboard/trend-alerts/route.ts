import { NextRequest } from "next/server";
import { ok, handle } from "@/lib/api/response";
import { computeTrendAlerts } from "@/lib/dashboard/trendAlerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 공개 보도량 기준 증가 감지(라이브 계산)
export async function GET(_req: NextRequest) {
  return handle(async () => {
    const alerts = await computeTrendAlerts({});
    return ok(alerts, { count: alerts.length, basis: "공개 보도량 기준 (최근 24시간 vs 7일 평균)" });
  });
}
