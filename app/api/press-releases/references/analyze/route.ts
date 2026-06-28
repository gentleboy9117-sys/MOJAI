import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";
import { extractStylePatterns, classifyTitlePattern } from "@/lib/pressRelease";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 레퍼런스 구조/문체/제목 패턴 분석 → StylePattern 저장
export async function POST(req: NextRequest) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.generatePressRelease(ctx.user.role)) return fail(...ERROR.FORBIDDEN);

    const refs = await prisma.pressReleaseReference.findMany({ take: 100 });
    const patterns = extractStylePatterns(refs.map((r) => ({ title: r.title, plainText: r.plainText })));

    await prisma.pressReleaseStylePattern.deleteMany();
    for (const p of patterns) {
      await prisma.pressReleaseStylePattern.create({
        data: {
          patternName: p.patternName, description: p.description ?? null,
          examplesJson: JSON.stringify(p.examples ?? []), structureJson: JSON.stringify(p.structure ?? []),
          toneRulesJson: JSON.stringify(p.toneRules ?? []),
          forbiddenExpressionsJson: JSON.stringify(p.forbiddenExpressions ?? []),
          preferredExpressionsJson: JSON.stringify(p.preferredExpressions ?? []),
          titlePatternType: p.titlePatternType ?? null,
        },
      });
    }
    for (const r of refs) {
      const c = classifyTitlePattern(r.title);
      await prisma.pressReleaseReference.update({ where: { id: r.id }, data: { titlePatternType: c.type } });
    }
    await writeAudit({ userId: ctx.user.id, action: AUDIT_ACTIONS.ANALYZE_PRESS_STYLE, metadata: { patterns: patterns.length, references: refs.length }, ipAddress: ctx.ip });
    return ok({ patterns: patterns.length, references: refs.length });
  });
}
