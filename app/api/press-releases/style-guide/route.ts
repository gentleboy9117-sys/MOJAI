import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, handle } from "@/lib/api/response";
import { extractStylePatterns, analyzeReference, aggregateAnalyses } from "@/lib/pressRelease";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 레퍼런스 스타일 가이드(구조/문체/제목 패턴) — 라이브 분석
export async function GET(_req: NextRequest) {
  return handle(async () => {
    const refs = await prisma.pressReleaseReference.findMany({ where: { isUsableForStyleReference: true }, take: 50 });
    const input = refs.map((r) => ({ title: r.title, plainText: r.plainText }));
    const patterns = extractStylePatterns(input);
    const analyses = refs.map((r) => analyzeReference({ title: r.title, plainText: r.plainText, markdownContent: r.markdownContent }));
    const aggregate = aggregateAnalyses(analyses);
    return ok({ patterns, aggregate, referenceCount: refs.length }, {
      notice: "레퍼런스는 형식·문체 참고용입니다. 구체적 사건 내용은 초안에 사용하지 않습니다.",
    });
  });
}
