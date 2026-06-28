// =====================================================================
// 제목 패턴 분석기
//  * 공개 검찰발표자료의 "제목 형식"만 분류한다(사실관계 미사용).
//  * 8종 패턴 + 휴리스틱 분류기 + 초안 제목 템플릿.
// =====================================================================

export interface TitlePattern {
  type: string;
  description: string;
  keywords: string[];
  /** 토큰 치환 템플릿: {office} {crime} {disposition} {scale} {keyword} */
  exampleTemplate: string;
}

/** 8종 제목 패턴 (RELEASE_TYPES와 라벨 정합) */
export const TITLE_PATTERNS: TitlePattern[] = [
  {
    type: "성과 발표형",
    description: "수사 성과·검거·적발 실적을 요약 강조하는 제목",
    keywords: ["적발", "검거", "성과", "단속", "총력", "근절", "엄정 대응", "구속"],
    exampleTemplate: "{office}, {crime} 사범 {disposition} 등 엄정 대응",
  },
  {
    type: "수사 결과 발표형",
    description: "특정 사건의 수사·처분 결과를 발표하는 제목",
    keywords: ["수사 결과", "기소", "구속기소", "불구속기소", "처분", "송치", "혐의"],
    exampleTemplate: "{office}, {crime} 혐의 {disposition}",
  },
  {
    type: "합동수사 출범형",
    description: "합동수사본부·TF 출범 또는 협의체 구성을 알리는 제목",
    keywords: ["합동수사", "TF", "출범", "협의체", "전담", "수사단", "구성"],
    exampleTemplate: "{office}, {crime} 대응 합동수사 체계 출범",
  },
  {
    type: "우수사례 선정형",
    description: "우수 수사·기획 사례 선정·표창을 알리는 제목",
    keywords: ["우수사례", "선정", "표창", "모범", "우수", "수상"],
    exampleTemplate: "{office}, {crime} 대응 우수사례 선정",
  },
  {
    type: "정책 대응형",
    description: "특정 범죄·현안에 대한 정책 방향·대응 강화를 알리는 제목",
    keywords: ["대응 강화", "방안", "대책", "정책", "추진", "강화"],
    exampleTemplate: "{office}, {crime} 대응 강화 방안 추진",
  },
  {
    type: "범죄 근절 캠페인형",
    description: "예방·홍보 캠페인, 신고 독려를 알리는 제목",
    keywords: ["캠페인", "예방", "홍보", "신고", "근절", "주의보", "당부"],
    exampleTemplate: "{office}, {crime} 근절 캠페인 추진",
  },
  {
    type: "제도 개선형",
    description: "제도·절차 개선, 시스템 도입을 알리는 제목",
    keywords: ["제도", "개선", "도입", "시행", "정비", "운영", "신설"],
    exampleTemplate: "{office}, {crime} 관련 제도 개선 시행",
  },
  {
    type: "국제공조형",
    description: "국제공조·국가간 협력·범죄인 인도 등을 알리는 제목",
    keywords: ["국제공조", "공조", "협력", "인터폴", "범죄인 인도", "해외", "국가간"],
    exampleTemplate: "{office}, {crime} 관련 국제공조 추진",
  },
];

const DEFAULT_TYPE = "수사 결과 발표형";

/**
 * 제목 문자열을 8종 패턴 중 하나로 분류한다(휴리스틱).
 * confidence: 매칭 키워드 수 기반 0..1.
 */
export function classifyTitlePattern(title: string): { type: string; confidence: number } {
  const t = (title || "").toLowerCase();
  let best: { type: string; score: number } = { type: DEFAULT_TYPE, score: 0 };

  for (const pat of TITLE_PATTERNS) {
    let score = 0;
    for (const kw of pat.keywords) {
      if (t.includes(kw.toLowerCase())) score += 1;
    }
    if (score > best.score) best = { type: pat.type, score };
  }

  // 매칭이 전혀 없으면 기본형(낮은 확신)
  if (best.score === 0) return { type: DEFAULT_TYPE, confidence: 0.2 };

  // 점수를 0..1 로 정규화(2개 이상 매칭이면 0.9 수렴)
  const confidence = Math.min(0.95, 0.4 + best.score * 0.25);
  return { type: best.type, confidence };
}

/** 패턴 type → 템플릿 조회 */
export function templateForType(type: string): string {
  return (
    TITLE_PATTERNS.find((p) => p.type === type)?.exampleTemplate ||
    TITLE_PATTERNS.find((p) => p.type === DEFAULT_TYPE)!.exampleTemplate
  );
}

/** 템플릿 토큰 치환 (입력 사실만 사용) */
export function fillTemplate(
  template: string,
  tokens: { office?: string; crime?: string; disposition?: string; scale?: string; keyword?: string }
): string {
  return template
    .replace(/\{office\}/g, (tokens.office || "○○지방검찰청").trim())
    .replace(/\{crime\}/g, (tokens.crime || "관련 범죄").trim())
    .replace(/\{disposition\}/g, (tokens.disposition || "기소").trim())
    .replace(/\{scale\}/g, (tokens.scale || "").trim())
    .replace(/\{keyword\}/g, (tokens.keyword || "").trim())
    .replace(/\s{2,}/g, " ")
    .trim();
}
