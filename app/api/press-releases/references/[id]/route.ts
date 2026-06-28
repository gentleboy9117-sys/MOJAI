import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { analyzeReference } from "@/lib/pressRelease";
import { asArray } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const r = await prisma.pressReleaseReference.findUnique({ where: { id: params.id } });
    if (!r) return fail(...ERROR.NOT_FOUND);
    const analysis = analyzeReference({ title: r.title, plainText: r.plainText, markdownContent: r.markdownContent });
    return ok({
      id: r.id, title: r.title, officeName: r.officeName, publishedAt: r.publishedAt,
      sourceUrl: r.sourceUrl, plainText: r.plainText, markdownContent: r.markdownContent,
      attachmentTypes: asArray<string>(r.attachmentTypes), titlePatternType: r.titlePatternType,
      analysis,
    });
  });
}
