// =====================================================================
// MockLLMProvider — API 키 없이 오프라인 동작(기본/데모/CI).
// 결정적(deterministic) 휴리스틱. 항상 needs_human_review=true 로 안전측.
// =====================================================================
import type { LlmClassifyInput, LlmClassifyOutput, LlmProvider } from "./types";
import { CRIME_TAXONOMY, countHits } from "@/lib/classifiers/taxonomy";

function softSummarize(title: string, body: string): string {
  const base = (body || title).replace(/\s+/g, " ").trim().slice(0, 90);
  return `보도에 따르면 ${base}${base.length >= 90 ? "…" : ""} (참고용 요약)`;
}

export class MockLLMProvider implements LlmProvider {
  readonly name = "mock";

  async classify(input: LlmClassifyInput): Promise<LlmClassifyOutput> {
    const text = `${input.title} ${input.bodyExcerpt}`;
    // 범죄유형: 키워드 최다 매칭
    let crimeType = "기타";
    let crimeSubtype = "기타";
    let evidence: string[] = [];
    let bestScore = 0;
    for (const cat of CRIME_TAXONOMY) {
      for (const sub of cat.subtypes) {
        const hit = countHits(text, sub.keywords);
        if (hit.count > bestScore) {
          bestScore = hit.count;
          crimeType = cat.type;
          crimeSubtype = sub.name;
          evidence = hit.hits;
        }
      }
    }
    // 검찰청: 본문에 등장하는 첫 번째 청명
    const office = input.officeNames.find((n) => text.includes(n) || text.includes(n.replace("지방검찰청", "지검")));
    return {
      related_offices: office
        ? [{ office_name: office, confidence: 0.6, reason: "(mock) 본문 내 청명 추정" }]
        : [],
      crime_type: crimeType,
      crime_subtype: crimeSubtype,
      crime_confidence: bestScore > 0 ? Math.min(0.7, 0.4 + bestScore * 0.1) : 0.3,
      evidence_keywords: evidence,
      one_line_summary: softSummarize(input.title, input.bodyExcerpt),
      short_reason: "(mock) 키워드 기반 추정",
      risk_level: "low",
      needs_human_review: true,
    };
  }

  async summarize(input: { title: string; bodyExcerpt: string }): Promise<string> {
    return softSummarize(input.title, input.bodyExcerpt);
  }

  async generateReport(input: { systemPrompt: string; userPrompt: string }): Promise<string> {
    // Mock: LLM 폴리싱 없이 빈 문자열 반환 → 호출측 결정적 템플릿 사용
    return "";
  }
}
