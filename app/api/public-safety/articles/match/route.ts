import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";
import { matchAllAssembliesToArticles } from "@/lib/publicSafety/runAssemblyPipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 모든 공개 집회 일정 × 최근 공개 보도 매칭 재실행
// (관련 보도는 범죄가 아니라 '공개 보도'. 법적 이슈는 가능성 언급일 뿐 확정 아님.)
export async function POST(req: NextRequest) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.editClassification(ctx.user.role)) return fail(...ERROR.FORBIDDEN);

    const body = (await req.json().catch(() => ({}))) as {
      windowDays?: number;
      lookbackDays?: number;
    };

    const createdLinks = await matchAllAssembliesToArticles(prisma, new Date(), {
      windowDays: body.windowDays,
      lookbackDays: body.lookbackDays,
    });

    await writeAudit({
      userId: ctx.user.id,
      action: "MATCH_ASSEMBLY_ARTICLES",
      targetType: "AssemblyArticleLink",
      metadata: { createdLinks },
      ipAddress: ctx.ip,
    });

    return ok({
      createdLinks,
      note: "집회 공개 일정과 공개 보도 매칭을 갱신했습니다(참고용, 담당자 검토 필요).",
    });
  });
}
