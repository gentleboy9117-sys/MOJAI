// =====================================================================
// 문자풀(기자단 신속 공보) 초안 생성 — 실제 검찰 문자풀 형식 반영
//  형식: [○○지방검찰청 알림] 머리표(선택)
//        ○ 처분 요지(부서·부장검사·죄명·처분·일자)
//        ○ 수사 경위·의의(직접수사·입증 등)
//        * 각주(근거·제도)  (선택)
//        ○ 향후 방침(엄정 대응·공소유지·피해자 지원)
//        [공개되는 범죄사실은 재판에 의하여 확정된 사실이 아님…] 고지(선택)
//  문체: 정중체(~하였습니다) / 개조식(~하였음)
//  LLM 가용 시 폴리싱, 미가용(mock) 시 결정적 템플릿 사용.
// =====================================================================
import { getLlmProvider } from "@/lib/providers/llm";

export type TextPoolStyle = "formal" | "concise";

export interface TextPoolInput {
  officeName: string;
  division?: string; // 수사 부서(형사2부, 여성아동범죄조사부 등)
  chief?: string; // 부장검사명
  crimeName?: string; // 정식 죄명
  caseSummary: string; // 사건 개요·경위
  disposition: string; // 처분(구속 기소 등)
  dispositionDate?: string; // 처분 일자
  significance?: string; // 수사 경위·의의
  futurePlan?: string; // 향후 방침
  footnote?: string; // 각주(*)
  style?: TextPoolStyle;
  includeHeader?: boolean; // [○○ 알림] 머리표
  includeDisclaimer?: boolean; // 확정 아님 고지
}

const DISPOSITIONS = [
  "입건",
  "압수수색",
  "체포영장 청구",
  "구속영장 청구",
  "구속영장 발부",
  "구속영장 기각",
  "구속 기소",
  "불구속 기소",
  "약식기소",
  "불기소(혐의없음)",
  "불기소(기소유예)",
  "구형",
];
export const TEXT_POOL_DISPOSITIONS = DISPOSITIONS;

const DEFAULT_PLAN_FORMAL = "향후에도 관련 범죄에 엄정 대응하고, 죄에 상응하는 처벌이 이루어질 수 있도록 공소유지에 만전을 기하겠습니다.";
const DEFAULT_PLAN_CONCISE = "향후에도 관련 범죄에 엄정 대응하고, 죄에 상응하는 처벌이 이루어질 수 있도록 공소유지에 만전을 다할 예정임";

export function buildTextPoolTemplate(input: TextPoolInput): string {
  const concise = input.style === "concise";
  const end = (verb: string) => (concise ? `${verb}하였음` : `${verb}하였습니다.`);
  const lines: string[] = [];

  if (input.includeHeader !== false) {
    lines.push(`[${input.officeName} 알림]`);
    lines.push("");
  }

  // ① 처분 요지
  const subj = `${input.officeName}${input.division ? ` ${input.division}` : ""}${input.chief ? `(부장검사 ${input.chief})` : ""}`;
  const crimePart = input.crimeName ? `${input.crimeName} 혐의로 ` : "";
  const datePart = input.dispositionDate ? `${input.dispositionDate} ` : "";
  lines.push(`○ ${subj}는 ${input.caseSummary.trim()} ${crimePart}${datePart}${end(input.disposition)}`);

  // ② 수사 경위·의의
  if (input.significance?.trim()) lines.push(`○ ${input.significance.trim()}`);
  // 각주
  if (input.footnote?.trim()) lines.push(` * ${input.footnote.trim()}`);
  // ③ 향후 방침
  const plan = input.futurePlan?.trim() || (concise ? DEFAULT_PLAN_CONCISE : DEFAULT_PLAN_FORMAL);
  lines.push(`○ ${plan}`);

  if (input.includeDisclaimer !== false) {
    lines.push("");
    lines.push("[공개되는 범죄사실은 재판에 의하여 확정된 사실이 아님을 유의하여 주시기 바랍니다]");
  }
  return lines.join("\n");
}

function buildPrompt(input: TextPoolInput): { systemPrompt: string; userPrompt: string } {
  const concise = input.style === "concise";
  const systemPrompt = [
    "당신은 대한민국 검찰청 공보 담당자입니다. 기자단에 보내는 '문자풀' 초안을 작성합니다.",
    "아래 형식을 반드시 따르세요:",
    input.includeHeader !== false ? "· 첫 줄: [검찰청명 알림]" : "· 머리표 없음",
    "· '○' 항목 3단 구성: ① 처분 요지(수사 부서·부장검사·정식 죄명·처분(구속/불구속 기소 등)·처분 일자) ② 수사 경위·의의(직접수사·입증 등) ③ 향후 대응·공소유지(필요 시 피해자 지원)",
    "· 제도·근거 보충이 필요하면 ' * ' 각주로 추가",
    input.includeDisclaimer !== false ? "· 마지막 줄: [공개되는 범죄사실은 재판에 의하여 확정된 사실이 아님을 유의하여 주시기 바랍니다]" : "· 고지 문구 없음",
    `· 문체: ${concise ? "개조식" : "서술식"}`,
    "원칙: 입력된 사실만 사용(추측 금지), 무죄추정·피의사실 공표 유의, 객관적·간결.",
  ].filter(Boolean).join("\n");
  const userPrompt = [
    `검찰청: ${input.officeName}`,
    input.division ? `수사 부서: ${input.division}` : "",
    input.chief ? `부장검사: ${input.chief}` : "",
    input.crimeName ? `죄명: ${input.crimeName}` : "",
    `처분: ${input.disposition}${input.dispositionDate ? ` (${input.dispositionDate})` : ""}`,
    `사건 개요·경위: ${input.caseSummary}`,
    input.significance ? `수사 경위·의의: ${input.significance}` : "",
    input.footnote ? `각주: ${input.footnote}` : "",
    input.futurePlan ? `향후 방침: ${input.futurePlan}` : "",
    "",
    "위 사실로 문자풀 초안을 작성하세요.",
  ].filter(Boolean).join("\n");
  return { systemPrompt, userPrompt };
}

export async function generateTextPool(input: TextPoolInput): Promise<{ draft: string; usedLlm: boolean }> {
  const { systemPrompt, userPrompt } = buildPrompt(input);
  let draft = "";
  try {
    draft = (await getLlmProvider().generateReport({ systemPrompt, userPrompt }))?.trim() ?? "";
  } catch {
    draft = "";
  }
  if (!draft) return { draft: buildTextPoolTemplate(input), usedLlm: false };
  return { draft, usedLlm: true };
}
