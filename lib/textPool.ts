// =====================================================================
// 문자풀(기자단 신속 공보) 초안 생성
//  * 보도자료를 정식으로 내기 전/또는 사건 규모가 보도자료에 못 미칠 때,
//    휴대폰 문자메시지 분량으로 사건개요 + 처분결과를 신속 공보.
//  * LLM 가용 시 폴리싱, 미가용(mock) 시 결정적 템플릿 사용.
// =====================================================================
import { getLlmProvider } from "@/lib/providers/llm";

export interface TextPoolInput {
  officeName: string;
  crimeType?: string;
  caseSummary: string;
  disposition: string; // 처분결과(영장청구/기소/불기소 등)
  dispositionDetail?: string; // 보충(예: 구속영장 청구, 징역 ○년 구형 등)
  subject?: string; // 대상(피의자/피고인 표기 — 익명화)
  occurredAt?: string; // 일자
}

const DISPOSITIONS = [
  "입건",
  "압수수색 실시",
  "체포영장 청구",
  "구속영장 청구",
  "구속영장 발부",
  "구속영장 기각",
  "기소(구속)",
  "기소(불구속)",
  "약식기소",
  "불기소(혐의없음)",
  "불기소(기소유예)",
  "구형",
];
export const TEXT_POOL_DISPOSITIONS = DISPOSITIONS;

export function buildTextPoolTemplate(input: TextPoolInput): string {
  const lines: string[] = [];
  lines.push(`[${input.officeName}] ${input.crimeType ? input.crimeType + " " : ""}사건 공보(문자풀)`);
  lines.push("");
  lines.push(`○ 사건 개요: ${input.caseSummary.trim()}`);
  lines.push(`○ 처분 결과: ${input.disposition}${input.dispositionDetail ? ` — ${input.dispositionDetail.trim()}` : ""}`);
  if (input.subject?.trim()) lines.push(`○ 대상: ${input.subject.trim()}`);
  if (input.occurredAt?.trim()) lines.push(`○ 일자: ${input.occurredAt.trim()}`);
  return lines.join("\n");
}

function buildPrompt(input: TextPoolInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    "당신은 대한민국 검찰청 공보 담당자입니다.",
    "기자단에 신속히 보내는 '문자풀'(휴대폰 문자메시지 1~2건, 약 200~400자) 초안을 작성합니다.",
    "원칙: ① 입력된 사실만 사용(추측·창작 금지) ② 사건 개요와 처분결과를 객관적·간결하게 ③ 무죄추정 원칙, 피의사실 공표 유의, 실명·신상 단정 금지('~ 혐의' 표현) ④ 과장·평가성 표현 배제.",
    "형식: 첫 줄에 [검찰청명] + 사건 표제, 이어서 사건개요/처분결과를 항목으로, 마지막에 신속 공보용 참고자료임을 명시.",
  ].join("\n");
  const userPrompt = [
    `발표 주체: ${input.officeName}`,
    input.crimeType ? `범죄유형: ${input.crimeType}` : "",
    `사건 개요: ${input.caseSummary}`,
    `처분 결과: ${input.disposition}${input.dispositionDetail ? ` (${input.dispositionDetail})` : ""}`,
    input.subject ? `대상: ${input.subject}` : "",
    input.occurredAt ? `일자: ${input.occurredAt}` : "",
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
