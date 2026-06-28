// =====================================================================
// OpenAI 호환 LLM 호출 공통 모듈 (OpenAI / 내부망 설치형 모두 사용)
// 원문 전체 전송 금지 — 호출측에서 bodyExcerpt 길이를 제한한다.
// =====================================================================
import type { LlmClassifyInput, LlmClassifyOutput, LlmProvider } from "./types";
import { coerceClassifyOutput } from "./types";
import { ALL_CRIME_TYPES } from "@/lib/classifiers/taxonomy";

export interface OpenAICompatibleConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs?: number;
}

async function chatComplete(
  cfg: OpenAICompatibleConfig,
  system: string,
  user: string,
  json: boolean,
): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), cfg.timeoutMs ?? 30000);
  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(t);
  }
}

/** 코드펜스 제거 후 JSON 파싱 */
function parseJsonLoose(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice);
}

const CLASSIFY_SYSTEM = `너는 한국 검찰청 관할 이슈를 분류하는 보조 AI다. 반드시 JSON만 반환한다.
규칙:
- 본문에 명시되지 않은 사실을 추측하지 말 것.
- 검찰청명을 찾을 수 없으면 지역/관할구역 기반으로 추정하되 confidence를 낮게 줄 것.
- 범죄유형이 불명확하면 "기타"로 분류할 것.
- 명예훼손 위험 표현은 단정하지 말고 "보도에 따르면" 형식으로 요약할 것.
- 실명/개인정보를 추론하지 말 것("A씨" 등 익명 표현은 그대로 유지).`;

function buildClassifyUser(input: LlmClassifyInput): string {
  return JSON.stringify({
    instruction:
      "아래 기사를 읽고 관련 검찰청과 범죄유형을 분류하라. 반드시 지정된 JSON 스키마로만 응답하라.",
    article: {
      title: input.title,
      source: input.sourceName,
      body_excerpt: input.bodyExcerpt,
    },
    office_master: input.officeNames,
    crime_taxonomy: ALL_CRIME_TYPES,
    output_schema: {
      related_offices: [{ office_name: "", confidence: 0.0, reason: "" }],
      crime_type: "",
      crime_subtype: "",
      crime_confidence: 0.0,
      evidence_keywords: [],
      one_line_summary: "",
      short_reason: "",
      risk_level: "low|medium|high",
      needs_human_review: true,
    },
  });
}

export function createOpenAICompatibleProvider(cfg: OpenAICompatibleConfig): LlmProvider {
  return {
    name: cfg.name,
    async classify(input: LlmClassifyInput): Promise<LlmClassifyOutput> {
      const out = await chatComplete(cfg, CLASSIFY_SYSTEM, buildClassifyUser(input), true);
      return coerceClassifyOutput(parseJsonLoose(out));
    },
    async summarize(input) {
      const sys =
        '너는 공개 기사를 1~2문장으로 요약한다. 사실을 단정하지 말고 "보도에 따르면" 형식을 쓴다. 실명/개인정보를 추론하지 않는다.';
      return (
        await chatComplete(
          cfg,
          sys,
          `제목: ${input.title}\n본문 일부: ${input.bodyExcerpt}`,
          false,
        )
      ).trim();
    },
    async generateReport(input) {
      return chatComplete(cfg, input.systemPrompt, input.userPrompt, false);
    },
  };
}
