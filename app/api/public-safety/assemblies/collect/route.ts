import { NextRequest } from "next/server";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";
import { prisma } from "@/lib/db/prisma";
import { crawlRegionalAssembliesAndClassify, matchAllAssembliesToArticles } from "@/lib/publicSafety/runAssemblyPipeline";
import { crawlDetailedAssemblies } from "@/lib/publicSafety/assemblyDetailCrawler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 공개 집회 일정 수집(전국 18개 지방경찰청 게시판 실크롤) → 관할 분류 → upsert → 관련 보도 매칭
//  * 상세 본문 파싱 가능 사이트(서울 등)는 개별 집회 단위로 정밀 교체.
//  * 집회·시위는 범죄로 단정하지 않으며, '공개 일정 정보'만 다룬다.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.editClassification(ctx.user.role)) return fail(...ERROR.FORBIDDEN);

    const now = new Date();
    const result = await crawlRegionalAssembliesAndClassify(prisma, now);
    const detailed = await crawlDetailedAssemblies(prisma, now, { maxPosts: 8 }).catch(() => []);
    const detailedAssemblies = detailed.reduce((s, d) => s + d.assemblies, 0);
    if (detailedAssemblies) await matchAllAssembliesToArticles(prisma, now);

    await writeAudit({
      userId: ctx.user.id,
      action: "COLLECT_ASSEMBLY",
      targetType: "AssemblyEvent",
      metadata: { ...result, detailedAssemblies },
      ipAddress: ctx.ip,
    });

    return ok({
      ...result,
      detailedAssemblies,
      note:
        result.savedAssemblies === 0
          ? "수집된 공개 일정이 없습니다(소스 확인 필요)."
          : `전국 ${result.okSources}/${result.sources}개 경찰청 수집·관할 분류 완료(서울 등 ${detailedAssemblies}건 개별 정밀). 참고용, 담당자 검토 필요.`,
    });
  });
}
