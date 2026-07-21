import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, handle } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 목록 화면(관할별 보도)과 동일한 제목 정규화 — 동일 기사(다른 매체) 1건 묶음
const normTitle = (t: string) =>
  t.split(" - ")[0].replace(/\[[^\]]*\]/g, "").replace(/[\s·.,'"“”()…\-]/g, "").toLowerCase();

/** 범죄유형별 '전체 기간 · 중복 통합' 기사 수 — 카드 건수와 목록 총계 일치용.
 *  scope=issue: crimeType별 / scope=trial: 공판 기사의 crimeSubtype별 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const scope = req.nextUrl.searchParams.get("scope") === "trial" ? "trial" : "issue";
    const where = scope === "trial" ? { crimeType: "공판" } : {};
    const rows = await prisma.article.findMany({
      where,
      select: { id: true, title: true, crimeType: true, crimeSubtype: true },
    });
    const seenByType = new Map<string, Set<string>>();
    for (const r of rows) {
      const type = scope === "trial" ? r.crimeSubtype || "기타" : r.crimeType || "기타";
      if (!seenByType.has(type)) seenByType.set(type, new Set());
      seenByType.get(type)!.add(normTitle(r.title) || r.id);
    }
    const counts: Record<string, number> = {};
    seenByType.forEach((s, type) => { counts[type] = s.size; });
    return ok(counts);
  });
}
