import { NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api/response";
import { generateTextPool, type TextPoolInput } from "@/lib/textPool";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 문자풀(기자단 신속 공보) 초안 생성 — 입력 사실만 사용.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json().catch(() => ({}))) as Partial<TextPoolInput>;
    if (!body.officeName || !body.caseSummary || !body.disposition) {
      return fail("BAD_REQUEST", "검찰청·사건 개요·처분 결과는 필수입니다.", 400);
    }
    const input: TextPoolInput = {
      officeName: body.officeName,
      crimeType: body.crimeType,
      caseSummary: body.caseSummary,
      disposition: body.disposition,
      dispositionDetail: body.dispositionDetail,
      subject: body.subject,
      occurredAt: body.occurredAt,
    };
    const result = await generateTextPool(input);
    return ok(result);
  });
}
