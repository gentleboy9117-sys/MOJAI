// =====================================================================
// LLM Provider 추상화 — 운영 시 내부망 설치형 LLM 으로 교체 가능
// =====================================================================
import type { RiskLevel } from "@/lib/types";

export interface LlmClassifyInput {
  title: string;
  sourceName: string;
  bodyExcerpt: string; // 최소 텍스트만 전송(원문 전체 금지)
  officeNames: string[];
}

export interface LlmRelatedOffice {
  office_name: string;
  confidence: number;
  reason: string;
}

// 10-1 프롬프트 출력 계약
export interface LlmClassifyOutput {
  related_offices: LlmRelatedOffice[];
  crime_type: string;
  crime_subtype: string;
  crime_confidence: number;
  evidence_keywords: string[];
  one_line_summary: string;
  short_reason?: string;
  risk_level: RiskLevel;
  needs_human_review: boolean;
}

export interface LlmProvider {
  readonly name: string;
  /** 분류(검찰청/범죄유형). JSON 출력 강제. */
  classify(input: LlmClassifyInput): Promise<LlmClassifyOutput>;
  /** 한 줄 요약(명예훼손 위험 표현 완화, '보도에 따르면') */
  summarize(input: { title: string; bodyExcerpt: string }): Promise<string>;
  /** 보고서 본문 생성(10-2) */
  generateReport(input: { systemPrompt: string; userPrompt: string }): Promise<string>;
}

/** LLM 결과 방어적 정규화 */
export function coerceClassifyOutput(raw: unknown): LlmClassifyOutput {
  const o = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown, d = 0) => (typeof v === "number" && !Number.isNaN(v) ? v : d);
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
  return {
    related_offices: Array.isArray(o.related_offices)
      ? (o.related_offices as unknown[]).map((x) => {
          const r = (x ?? {}) as Record<string, unknown>;
          return {
            office_name: String(r.office_name ?? ""),
            confidence: num(r.confidence, 0.5),
            reason: String(r.reason ?? ""),
          };
        })
      : [],
    crime_type: String(o.crime_type ?? "기타"),
    crime_subtype: String(o.crime_subtype ?? ""),
    crime_confidence: num(o.crime_confidence, 0.5),
    evidence_keywords: arr(o.evidence_keywords),
    one_line_summary: String(o.one_line_summary ?? ""),
    short_reason: o.short_reason ? String(o.short_reason) : undefined,
    risk_level: (["low", "medium", "high"].includes(String(o.risk_level)) ? o.risk_level : "low") as RiskLevel,
    needs_human_review: o.needs_human_review !== false,
  };
}
