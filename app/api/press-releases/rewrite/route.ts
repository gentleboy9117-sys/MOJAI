import { NextRequest } from "next/server";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { rewriteText } from "@/lib/report/safetyRewrite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    if (typeof body.text !== "string") return fail(...ERROR.BAD_REQUEST);
    const { text, changes } = rewriteText(body.text);
    return ok({ text, changes });
  });
}
