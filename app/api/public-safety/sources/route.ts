import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, handle } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// [공안] 지방청 게시판 출처별 수집 현황 — '정보 반영 시각' 표시용
export async function GET(_req: NextRequest) {
  return handle(async () => {
    const rows = await prisma.assemblySourceStatus.findMany({
      orderBy: [{ lastSuccess: "desc" }, { region: "asc" }],
    });
    const okCount = rows.filter((r) => r.lastSuccess).length;
    const lastCollectedAt = rows.reduce<Date | null>(
      (a, r) => (r.lastCollectedAt && (!a || r.lastCollectedAt > a) ? r.lastCollectedAt : a),
      null,
    );
    return ok({
      totalSources: rows.length,
      okSources: okCount,
      lastCollectedAt,
      sources: rows.map((r) => ({
        sourceName: r.sourceName,
        region: r.region,
        listUrl: r.listUrl,
        supported: r.supported,
        lastCollectedAt: r.lastCollectedAt,
        lastSuccess: r.lastSuccess,
        collectedCount: r.collectedCount,
        latestPostDate: r.latestPostDate,
        latestEventDate: r.latestEventDate,
        message: r.message,
      })),
    });
  });
}
