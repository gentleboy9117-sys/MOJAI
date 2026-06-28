import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 저장된 공안 브리핑 단건 조회
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const b = await prisma.publicSafetyBriefing.findUnique({ where: { id: params.id } });
    if (!b) return fail(...ERROR.NOT_FOUND);
    return ok({
      id: b.id,
      title: b.title,
      briefingType: b.briefingType,
      periodStart: b.periodStart,
      periodEnd: b.periodEnd,
      markdown: b.markdownContent,
      safety: b.safetyCheckJson ? JSON.parse(b.safetyCheckJson) : null,
      createdAt: b.createdAt,
    });
  });
}
