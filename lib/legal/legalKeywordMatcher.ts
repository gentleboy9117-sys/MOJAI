// =====================================================================
// 참고 법령/죄명 키워드 매칭
//  * 법적 판단이 아니다. "관련 가능 / 참고 법령 키워드"로만 표시한다.
//  * 실제 법률 판단은 사람이 한다.
// =====================================================================

export interface LegalEntry {
  keyword: string;
  category: "법률" | "죄명" | "형법조항";
  aliases?: string[];
  crimeHints?: string[]; // 범죄유형 기반 '관련 가능' 추천
}

export const LEGAL_DICTIONARY: LegalEntry[] = [
  { keyword: "특정경제범죄가중처벌법", category: "법률", aliases: ["특경법", "특정경제범죄"], crimeHints: ["경제범죄"] },
  { keyword: "자본시장과 금융투자업에 관한 법률(자본시장법)", category: "법률", aliases: ["자본시장법", "시세조종", "미공개정보"], crimeHints: ["경제범죄"] },
  { keyword: "형법상 사기", category: "죄명", aliases: ["사기죄", "사기"], crimeHints: ["경제범죄"] },
  { keyword: "형법상 횡령", category: "죄명", aliases: ["횡령죄", "횡령"], crimeHints: ["경제범죄"] },
  { keyword: "형법상 배임", category: "죄명", aliases: ["배임죄", "배임"], crimeHints: ["경제범죄"] },
  { keyword: "전기통신금융사기 피해방지 및 피해금 환급에 관한 특별법", category: "법률", aliases: ["통신사기피해환급법", "보이스피싱"], crimeHints: ["경제범죄"] },
  { keyword: "마약류 관리에 관한 법률", category: "법률", aliases: ["마약류관리법", "마약"], crimeHints: ["마약범죄"] },
  { keyword: "정보통신망 이용촉진 및 정보보호 등에 관한 법률", category: "법률", aliases: ["정보통신망법", "해킹"], crimeHints: ["디지털범죄"] },
  { keyword: "성폭력범죄의 처벌 등에 관한 특례법", category: "법률", aliases: ["성폭력처벌법"], crimeHints: ["성범죄/아동청소년범죄"] },
  { keyword: "아동·청소년의 성보호에 관한 법률", category: "법률", aliases: ["청소년성보호법", "아청법"], crimeHints: ["성범죄/아동청소년범죄"] },
  { keyword: "공직선거법", category: "법률", aliases: ["공직선거법위반"], crimeHints: ["선거범죄", "부패/공직범죄"] },
  { keyword: "부정청탁 및 금품등 수수의 금지에 관한 법률(청탁금지법)", category: "법률", aliases: ["청탁금지법", "김영란법"], crimeHints: ["부패/공직범죄"] },
  { keyword: "특정범죄가중처벌 등에 관한 법률(뇌물)", category: "법률", aliases: ["특가법", "뇌물"], crimeHints: ["부패/공직범죄"] },
  { keyword: "중대재해 처벌 등에 관한 법률", category: "법률", aliases: ["중대재해처벌법", "중대재해"], crimeHints: ["산업재해/중대재해"] },
  { keyword: "조세범 처벌법", category: "법률", aliases: ["조세포탈", "탈세"], crimeHints: ["조세/관세범죄"] },
  { keyword: "관세법", category: "법률", aliases: ["관세포탈", "밀수"], crimeHints: ["조세/관세범죄"] },
  { keyword: "도로교통법", category: "법률", aliases: ["음주운전", "무면허"], crimeHints: ["교통범죄"] },
  { keyword: "출입국관리법", category: "법률", aliases: ["불법체류", "밀입국"], crimeHints: ["출입국/외국인범죄"] },
];

export interface LegalMatch {
  keyword: string;
  category: string;
  confidence: number;
  evidenceText?: string;
  basis: "본문 직접 언급" | "범죄유형 기반 관련 가능";
}

function snippet(text: string, term: string): string | undefined {
  const idx = text.indexOf(term);
  if (idx < 0) return undefined;
  return text.slice(Math.max(0, idx - 20), idx + term.length + 20).trim();
}

/** 참고 법령 키워드 매칭. crimeType 으로 '관련 가능' 추천 보강. */
export function matchLegalKeywords(text: string, crimeType?: string | null): LegalMatch[] {
  const out: LegalMatch[] = [];
  const seen = new Set<string>();

  for (const entry of LEGAL_DICTIONARY) {
    const terms = [entry.keyword, ...(entry.aliases ?? [])];
    const hit = terms.find((t) => text.includes(t));
    if (hit) {
      if (seen.has(entry.keyword)) continue;
      seen.add(entry.keyword);
      out.push({
        keyword: entry.keyword,
        category: entry.category,
        confidence: 0.7,
        evidenceText: snippet(text, hit),
        basis: "본문 직접 언급",
      });
    } else if (crimeType && entry.crimeHints?.includes(crimeType)) {
      if (seen.has(entry.keyword)) continue;
      seen.add(entry.keyword);
      out.push({
        keyword: entry.keyword,
        category: entry.category,
        confidence: 0.4,
        basis: "범죄유형 기반 관련 가능",
      });
    }
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 8);
}

export const LEGAL_DISCLAIMER =
  "위 항목은 기사 표현·키워드 기반의 참고용 분류이며, 실제 법률 적용 여부는 담당자가 판단해야 합니다.";
