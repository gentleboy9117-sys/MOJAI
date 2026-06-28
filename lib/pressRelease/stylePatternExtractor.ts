// =====================================================================
// 스타일 패턴 추출기
//  * 레퍼런스를 제목 패턴별로 묶어 "스타일 패턴"을 만든다.
//  * 구조/톤/금지표현/권장표현 리스트를 산출(사실관계 미사용).
// =====================================================================
import { analyzeReference, type ReferenceAnalysis } from "./referenceAnalyzer";
import { classifyTitlePattern } from "./titlePatternAnalyzer";

export interface StylePattern {
  patternName: string;
  description: string;
  examples: string[];
  structure: string[];
  toneRules: string[];
  forbiddenExpressions: string[];
  preferredExpressions: string[];
  titlePatternType?: string;
}

/** 유죄/피의사실 단정 등 금지 표현 (safetyRewrite와 정합) */
const FORBIDDEN_EXPRESSIONS: string[] = [
  "편취했다",
  "횡령했다",
  "배임했다",
  "범행을 저질렀다",
  "범죄자이다",
  "주범이다",
  "불법이다",
  "명백하다",
  "반드시 엄벌",
  "악질적이다",
  "국민적 공분",
];

/** 권장(완화) 표현 */
const PREFERRED_EXPRESSIONS: string[] = [
  "혐의를 받고 있다",
  "혐의를 받고 있는 것으로 알려졌다",
  "공식 발표에 따르면",
  "보도에 따르면",
  "관련 절차가 진행 중인 것으로 알려졌다",
  "법과 원칙에 따라",
];

/** 제목 패턴별 설명 */
const PATTERN_DESCRIPTION: Record<string, string> = {
  "성과 발표형": "수사 성과·실적을 요약 강조하는 발표자료 형식",
  "수사 결과 발표형": "특정 사건의 수사·처분 결과를 발표하는 형식",
  "합동수사 출범형": "합동수사본부·TF 출범을 알리는 형식",
  "우수사례 선정형": "우수 사례 선정·표창을 알리는 형식",
  "정책 대응형": "현안 대응 정책 방향을 알리는 형식",
  "범죄 근절 캠페인형": "예방·홍보 캠페인을 알리는 형식",
  "제도 개선형": "제도·절차 개선을 알리는 형식",
  "국제공조형": "국제공조·협력을 알리는 형식",
};

/**
 * 레퍼런스 목록을 제목 패턴 type별로 그룹화하여 StylePattern[]을 생성.
 * examples에는 "제목"만 담는다(본문 사실 미포함).
 */
export function extractStylePatterns(
  refs: { title: string; plainText?: string | null }[]
): StylePattern[] {
  // type → { titles, analyses }
  const groups = new Map<string, { titles: string[]; analyses: ReferenceAnalysis[] }>();

  for (const ref of refs) {
    const type = classifyTitlePattern(ref.title || "").type;
    const analysis = analyzeReference({ title: ref.title, plainText: ref.plainText });
    const g = groups.get(type) || { titles: [], analyses: [] };
    if (ref.title) g.titles.push(ref.title);
    g.analyses.push(analysis);
    groups.set(type, g);
  }

  const patterns: StylePattern[] = [];
  for (const [type, g] of groups.entries()) {
    // 그룹 내 구조/톤 합집합(빈도순 정렬은 단순화)
    const structureSet = new Set<string>();
    const toneSet = new Set<string>();
    for (const a of g.analyses) {
      a.structureSections.forEach((s) => structureSet.add(s));
      a.toneRules.forEach((t) => toneSet.add(t));
    }

    patterns.push({
      patternName: `${type} 스타일`,
      description: PATTERN_DESCRIPTION[type] || `${type} 발표자료 형식`,
      examples: g.titles.slice(0, 5),
      structure:
        structureSet.size > 0
          ? Array.from(structureSet)
          : ["사건 개요", "수사 결과", "처분 결과", "의의 및 향후 계획"],
      toneRules: Array.from(toneSet),
      forbiddenExpressions: [...FORBIDDEN_EXPRESSIONS],
      preferredExpressions: [...PREFERRED_EXPRESSIONS],
      titlePatternType: type,
    });
  }

  return patterns;
}
