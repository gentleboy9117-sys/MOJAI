// =====================================================================
// 레퍼런스 분석기
//  * 공개 검찰발표자료에서 "구조/톤"만 추출한다. 사실관계 미사용.
//  * 본문 텍스트에서 섹션 헤더 패턴을 탐지하고 톤 규칙을 추론한다.
// =====================================================================
import { classifyTitlePattern } from "./titlePatternAnalyzer";

export interface ReferenceAnalysis {
  titlePatternType: string;
  /** 탐지된 본문 구조 섹션명 */
  structureSections: string[];
  /** 추론된 톤 규칙 */
  toneRules: string[];
}

/** 표준 섹션 후보 (검찰발표자료 관용 구조) */
const SECTION_HINTS: { name: string; patterns: RegExp[] }[] = [
  { name: "사건 개요", patterns: [/사건\s*개요/, /사안\s*개요/, /개\s*요/] },
  { name: "수사 경위", patterns: [/수사\s*경위/, /수사\s*착수/, /적발\s*경위/] },
  { name: "수사 결과", patterns: [/수사\s*결과/, /수사\s*내용/, /범죄\s*사실/] },
  { name: "처분 결과", patterns: [/처분\s*결과/, /기소|구속기소|불구속기소|송치|송검/] },
  { name: "의의 및 향후 계획", patterns: [/향후\s*계획/, /의의/, /추진\s*계획/] },
  { name: "당부 말씀", patterns: [/당부/, /협조\s*요청/, /신고\s*안내/] },
];

/** 기본 톤 규칙 (검찰발표자료 보도자료 작성 관용) */
const BASE_TONE_RULES: string[] = [
  "유죄를 단정하지 않고 '혐의를 받고 있다' 표현을 사용한다.",
  "피의자·피해자는 비식별(A씨 등)로 처리한다.",
  "확정되지 않은 사실은 '공식 발표에 따르면', '보도에 따르면'으로 인용한다.",
  "감정적·과장 표현을 피하고 사실 위주로 간결하게 작성한다.",
];

function detectSections(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const hint of SECTION_HINTS) {
    if (hint.patterns.some((re) => re.test(text)) && !found.includes(hint.name)) {
      found.push(hint.name);
    }
  }
  return found;
}

function inferToneRules(text: string): string[] {
  const rules = [...BASE_TONE_RULES];
  if (!text) return rules;
  if (/혐의/.test(text)) rules.push("죄명·혐의는 '~혐의'로 명시한다.");
  if (/구속|불구속/.test(text)) rules.push("신병 상태(구속/불구속)를 명확히 구분한다.");
  if (/당부|협조|신고/.test(text)) rules.push("말미에 국민 협조·신고 당부 문구를 둔다.");
  // 중복 제거
  return Array.from(new Set(rules));
}

/**
 * 단일 레퍼런스 분석 — 제목 패턴 + 구조 섹션 + 톤 규칙.
 * 반환값에 레퍼런스 본문 사실은 포함하지 않는다(구조/톤 메타데이터만).
 */
export function analyzeReference(ref: {
  title: string;
  plainText?: string | null;
  markdownContent?: string | null;
}): ReferenceAnalysis {
  const body = `${ref.plainText || ""}\n${ref.markdownContent || ""}`;
  const titlePatternType = classifyTitlePattern(ref.title || "").type;
  let structureSections = detectSections(body);

  // 본문에서 섹션을 못 찾으면 제목 패턴 기반 기본 구조 제시
  if (structureSections.length === 0) {
    structureSections = ["사건 개요", "수사 결과", "처분 결과", "의의 및 향후 계획"];
  }

  return {
    titlePatternType,
    structureSections,
    toneRules: inferToneRules(body),
  };
}

/** 여러 분석 결과를 집계 — 공통 섹션/톤/제목패턴 분포 */
export function aggregateAnalyses(list: ReferenceAnalysis[]): {
  commonSections: string[];
  commonToneRules: string[];
  titlePatternDistribution: Record<string, number>;
} {
  const sectionCount = new Map<string, number>();
  const toneCount = new Map<string, number>();
  const titlePatternDistribution: Record<string, number> = {};

  for (const a of list) {
    for (const s of a.structureSections) sectionCount.set(s, (sectionCount.get(s) || 0) + 1);
    for (const t of a.toneRules) toneCount.set(t, (toneCount.get(t) || 0) + 1);
    titlePatternDistribution[a.titlePatternType] =
      (titlePatternDistribution[a.titlePatternType] || 0) + 1;
  }

  const n = list.length || 1;
  // 절반 이상 등장한 항목을 "공통"으로 본다(최소 1건은 통과)
  const threshold = Math.max(1, Math.ceil(n / 2));

  const commonSections = Array.from(sectionCount.entries())
    .filter(([, c]) => c >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);

  const commonToneRules = Array.from(toneCount.entries())
    .filter(([, c]) => c >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);

  return { commonSections, commonToneRules, titlePatternDistribution };
}
