import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { asArray } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const g = await prisma.generatedPressRelease.findUnique({ where: { id: params.id }, include: { inputFacts: true } });
    if (!g) return fail(...ERROR.NOT_FOUND);
    return ok({
      id: g.id, title: g.title, targetOfficeName: g.targetOfficeName, releaseType: g.releaseType,
      crimeType: g.crimeType, caseStage: g.caseStage, draftMarkdown: g.draftMarkdown,
      riskCheck: g.riskCheckJson ? JSON.parse(g.riskCheckJson) : null,
      referenceIds: asArray<string>(g.referenceIds),
      createdAt: g.createdAt,
    });
  });
}
