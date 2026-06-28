import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, handle } from "@/lib/api/response";
import { asArray } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  return handle(async () => {
    const refs = await prisma.pressReleaseReference.findMany({ orderBy: { publishedAt: "desc" }, take: 100 });
    const list = refs.map((r) => ({
      id: r.id,
      title: r.title,
      officeName: r.officeName,
      publishedAt: r.publishedAt,
      sourceUrl: r.sourceUrl,
      titlePatternType: r.titlePatternType,
      snippet: (r.plainText ?? "").slice(0, 120),
      attachmentTypes: asArray<string>(r.attachmentTypes),
      isUsableForStyleReference: r.isUsableForStyleReference,
    }));
    return ok(list, { count: list.length, notice: "공개 검찰발표자료 형식 레퍼런스(스타일 참고용)" });
  });
}
