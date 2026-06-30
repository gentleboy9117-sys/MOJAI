import { NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api/response";
import { generatePressSimple, type PressSimpleInput } from "@/lib/pressReleaseSimple";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 보도자료 초안(간소화) 생성 — 입력 사실만 사용.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const b = (await req.json().catch(() => ({}))) as Partial<PressSimpleInput>;
    if (!b.officeName || !b.caseSummary || !b.disposition) {
      return fail("BAD_REQUEST", "검찰청·사건 개요·처분 결과는 필수입니다.", 400);
    }
    const input: PressSimpleInput = {
      officeName: b.officeName, division: b.division, chief: b.chief, crimeName: b.crimeName,
      caseSummary: b.caseSummary, disposition: b.disposition, dispositionDate: b.dispositionDate,
      significance: b.significance, emphasis: b.emphasis, futurePlan: b.futurePlan,
    };
    return ok(await generatePressSimple(input));
  });
}
