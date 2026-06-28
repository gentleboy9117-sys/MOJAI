import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";
import { selectReferences, generatePressRelease, type PressReleaseInput } from "@/lib/pressRelease";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 보도자료 초안 생성 — 사용자 입력 사실만 사용. 레퍼런스는 형식 참고용.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.generatePressRelease(ctx.user.role)) return fail(...ERROR.FORBIDDEN);
    const body = (await req.json().catch(() => ({}))) as Partial<PressReleaseInput>;
    if (!body.officeName || !body.caseSummary) {
      return fail("BAD_REQUEST", "발표 주체 검찰청과 사건 개요는 필수입니다.", 400);
    }
    const input: PressReleaseInput = {
      officeName: body.officeName, releaseType: body.releaseType ?? "INVESTIGATION_RESULT",
      caseStage: body.caseStage ?? "INDICTED", crimeType: body.crimeType ?? "",
      caseSummary: body.caseSummary, charges: body.charges ?? "", legalKeywords: body.legalKeywords ?? [],
      suspectDescription: body.suspectDescription ?? "", victimDescription: body.victimDescription ?? "",
      damageScale: body.damageScale ?? "", investigationResult: body.investigationResult ?? "",
      dispositionResult: body.dispositionResult ?? "", futurePlan: body.futurePlan ?? "",
      publicScope: body.publicScope ?? "", anonymizationRules: body.anonymizationRules ?? "",
      emphasisMessage: body.emphasisMessage ?? "", attachments: body.attachments ?? [],
      lengthOption: body.lengthOption ?? "normal",
      includeTitleCandidates: body.includeTitleCandidates ?? true, includeQA: body.includeQA ?? true,
      includeRiskCheck: body.includeRiskCheck ?? true, includeChecklist: body.includeChecklist ?? true,
    };

    const refs = await prisma.pressReleaseReference.findMany({ where: { isUsableForStyleReference: true }, take: 50 });
    const selected = selectReferences(
      input,
      refs.map((r) => ({ id: r.id, title: r.title, titlePatternType: r.titlePatternType ?? undefined, officeName: r.officeName ?? undefined, sourceUrl: r.sourceUrl ?? undefined, crimeType: undefined })),
      3,
    );
    const draft = await generatePressRelease(input, selected);

    const gen = await prisma.generatedPressRelease.create({
      data: {
        title: draft.title, inputFactsJson: JSON.stringify(input), targetOfficeName: input.officeName,
        releaseType: input.releaseType, crimeType: input.crimeType, caseStage: input.caseStage,
        dispositionResult: input.dispositionResult, publicScope: input.publicScope, anonymizationRules: input.anonymizationRules,
        draftMarkdown: draft.draftMarkdown, riskCheckJson: draft.riskCheck ? JSON.stringify(draft.riskCheck) : null,
        referenceIds: JSON.stringify(selected.map((s) => s.id)), createdById: ctx.user.id,
        inputFacts: {
          create: {
            officeName: input.officeName, releaseType: input.releaseType, crimeType: input.crimeType,
            caseSummary: input.caseSummary, charges: input.charges, legalKeywords: JSON.stringify(input.legalKeywords),
            damageScale: input.damageScale, suspectDescription: input.suspectDescription, victimDescription: input.victimDescription,
            investigationResult: input.investigationResult, dispositionResult: input.dispositionResult,
            futurePlan: input.futurePlan, publicScope: input.publicScope, anonymizationRules: input.anonymizationRules,
          },
        },
      },
    });
    await writeAudit({ userId: ctx.user.id, action: AUDIT_ACTIONS.GENERATE_PRESS_RELEASE, targetType: "GeneratedPressRelease", targetId: gen.id, ipAddress: ctx.ip });

    return ok({ id: gen.id, ...draft });
  });
}
