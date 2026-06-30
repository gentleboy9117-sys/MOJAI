import { NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api/response";
import { generateTextPool, type TextPoolInput } from "@/lib/textPool";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 문자풀(기자단 신속 공보) 초안 생성 — 입력 사실만 사용.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const b = (await req.json().catch(() => ({}))) as Partial<TextPoolInput>;
    if (!b.officeName || !b.caseSummary || !b.disposition) {
      return fail("BAD_REQUEST", "검찰청·사건 개요·처분 결과는 필수입니다.", 400);
    }
    const input: TextPoolInput = {
      officeName: b.officeName,
      division: b.division,
      chief: b.chief,
      crimeName: b.crimeName,
      caseSummary: b.caseSummary,
      disposition: b.disposition,
      dispositionDate: b.dispositionDate,
      significance: b.significance,
      futurePlan: b.futurePlan,
      footnote: b.footnote,
      style: b.style === "concise" ? "concise" : "formal",
      includeHeader: b.includeHeader !== false,
      includeDisclaimer: b.includeDisclaimer !== false,
    };
    return ok(await generateTextPool(input));
  });
}
