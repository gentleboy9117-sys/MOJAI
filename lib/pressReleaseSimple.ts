// =====================================================================
// 보도자료 초안(간소화) — 단일 화면에서 즉시 생성. 복붙하기 쉬운 완성형 초안.
//  문장은 검찰 보도자료체, 문단 구성은 자유(형식에 얽매이지 않음).
//  LLM 가용 시 폴리싱, 미가용(mock) 시 결정적 템플릿.
// =====================================================================
import { getLlmProvider } from "@/lib/providers/llm";

export interface PressSimpleInput {
  officeName: string;
  division?: string;
  chief?: string;
  crimeName?: string;
  caseSummary: string;
  disposition: string;
  dispositionDate?: string;
  significance?: string; // 수사 경위·의의
  emphasis?: string; // 강조 메시지(예방 당부 등)
  futurePlan?: string;
}

const DEFAULT_PLAN = "향후에도 관련 범죄에 엄정 대응하고, 죄에 상응하는 처벌이 이루어질 수 있도록 수사 및 공소유지에 최선을 다하겠습니다.";
const DISCLAIMER = "[공개되는 범죄사실은 재판에 의하여 확정된 사실이 아님을 유의하여 주시기 바랍니다]";

export function buildPressTemplate(i: PressSimpleInput): string {
  const subj = `${i.officeName}${i.division ? ` ${i.division}` : ""}${i.chief ? `(부장검사 ${i.chief})` : ""}`;
  const lead = `${subj}는 ${i.caseSummary.trim()} ${i.crimeName ? `${i.crimeName} 혐의로 ` : ""}${i.dispositionDate ? `${i.dispositionDate} ` : ""}${i.disposition}하였습니다.`;
  const parts: string[] = [`□ ${i.officeName} 보도자료`, "", lead];
  if (i.significance?.trim()) parts.push("", i.significance.trim());
  if (i.emphasis?.trim()) parts.push("", i.emphasis.trim());
  parts.push("", i.futurePlan?.trim() || DEFAULT_PLAN);
  parts.push("", DISCLAIMER);
  return parts.join("\n");
}

function buildPrompt(i: PressSimpleInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    "당신은 대한민국 검찰청 공보 담당자입니다. 기자단에 배포하는 '보도자료' 초안을 작성합니다.",
    "목표: 그대로 복사해 쓸 수 있는 완성형 초안.",
    "문체: 검찰 보도자료체(객관적·간결, '~하였습니다'). 문단 구성은 형식에 얽매이지 말고 자연스럽게(처분 요지 → 사건 경위 → 수사 의의 → 향후 방침 흐름 권장).",
    "원칙: 입력된 사실만 사용(추측·창작 금지), 무죄추정·피의사실 공표 유의, 실명·신상 단정 금지('A씨' 등).",
    `마지막에 반드시 '${DISCLAIMER}' 고지를 넣으세요.`,
  ].join("\n");
  const userPrompt = [
    `검찰청: ${i.officeName}`,
    i.division ? `담당부서: ${i.division}` : "",
    i.chief ? `부장검사: ${i.chief}` : "",
    i.crimeName ? `죄명: ${i.crimeName}` : "",
    `처분: ${i.disposition}${i.dispositionDate ? ` (${i.dispositionDate})` : ""}`,
    `사건 개요·경위: ${i.caseSummary}`,
    i.significance ? `수사 의의: ${i.significance}` : "",
    i.emphasis ? `강조 메시지: ${i.emphasis}` : "",
    i.futurePlan ? `향후 방침: ${i.futurePlan}` : "",
    "",
    "위 사실로 보도자료 초안을 작성하세요.",
  ].filter(Boolean).join("\n");
  return { systemPrompt, userPrompt };
}

export async function generatePressSimple(i: PressSimpleInput): Promise<{ draft: string; usedLlm: boolean }> {
  const { systemPrompt, userPrompt } = buildPrompt(i);
  let draft = "";
  try { draft = (await getLlmProvider().generateReport({ systemPrompt, userPrompt }))?.trim() ?? ""; } catch { draft = ""; }
  if (!draft) return { draft: buildPressTemplate(i), usedLlm: false };
  return { draft, usedLlm: true };
}
