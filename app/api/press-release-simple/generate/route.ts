import { NextRequest } from "next/server";
import { ok, fail, handle } from "@/lib/api/response";
import { generatePressRelease, type PressReleaseInput } from "@/lib/pressRelease";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SimpleBody {
  officeName?: string; division?: string; chief?: string; crimeName?: string;
  caseSummary?: string; disposition?: string; dispositionDate?: string;
  significance?: string; emphasis?: string; futurePlan?: string;
}

function stageOf(d: string): string {
  if (d.includes("구속 기소")) return "INDICTED_DETAINED";
  if (d.includes("불구속 기소")) return "INDICTED_NOT_DETAINED";
  if (d.includes("약식")) return "INDICTED";
  if (d.includes("불기소")) return "NON_INDICTMENT";
  if (d.includes("기소")) return "INDICTED";
  if (d.includes("구속영장")) return "ARREST_WARRANT";
  if (d.includes("입건") || d.includes("압수") || d.includes("구형")) return "UNDER_INVESTIGATION";
  return "INDICTED";
}

// 보도자료 초안(간소화 입력 → 검찰 보도자료 표준 양식 전체 생성)
export async function POST(req: NextRequest) {
  return handle(async () => {
    const b = (await req.json().catch(() => ({}))) as SimpleBody;
    if (!b.officeName || !b.caseSummary || !b.disposition) {
      return fail("BAD_REQUEST", "검찰청·사건 개요·처분 결과는 필수입니다.", 400);
    }
    const office = b.division ? `${b.officeName} ${b.division}` : b.officeName;
    const input: PressReleaseInput = {
      officeName: office,
      releaseType: "INVESTIGATION_RESULT",
      caseStage: stageOf(b.disposition),
      crimeType: b.crimeName ?? "",
      caseSummary: b.caseSummary,
      charges: b.crimeName ?? "",
      legalKeywords: b.crimeName ? b.crimeName.split(/[·,]/).map((s) => s.trim()).filter(Boolean) : [],
      suspectDescription: "",
      victimDescription: "",
      damageScale: "",
      investigationResult: b.significance ?? "",
      dispositionResult: `${b.disposition}${b.dispositionDate ? ` (${b.dispositionDate})` : ""}`,
      futurePlan: b.futurePlan ?? "",
      publicScope: "",
      anonymizationRules: "",
      emphasisMessage: b.emphasis ?? "",
      attachments: [],
      lengthOption: "normal",
      includeTitleCandidates: false,
      includeQA: false,
      includeRiskCheck: false,
      includeChecklist: false,
    };
    const draft = await generatePressRelease(input, []);
    return ok({ draft: draft.draftMarkdown });
  });
}
