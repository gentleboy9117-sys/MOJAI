// 분류 엔진 공유 타입
export interface OfficeLite {
  id: string;
  name: string;
  type: string;
  region: string;
  searchKeywords: string[];
  policeStations: string[];
}

export type OfficeMatchType =
  | "DIRECT_MENTION"   // 검찰청명 직접 언급
  | "INSTITUTION"      // 검찰 제도·조직 이슈(특정 지검 관할 아님) → 대검찰청
  | "REGION_INFERRED"  // 사건 지역 기반 추정
  | "POLICE_INFERRED"  // 관할 경찰서 기반 추정
  | "PRESS_SOURCE"     // 공식 보도자료 출처 기반
  | "LLM_ASSIST"       // LLM 보조 추정
  | "MANUAL";          // 수동 수정

export const OFFICE_MATCH_LABEL: Record<OfficeMatchType, string> = {
  DIRECT_MENTION: "검찰청명 직접 언급",
  INSTITUTION: "검찰 제도·조직 이슈(대검찰청)",
  REGION_INFERRED: "사건 지역 기반 추정",
  POLICE_INFERRED: "관할 경찰서 기반 추정",
  PRESS_SOURCE: "공식 보도자료 출처 기반",
  LLM_ASSIST: "LLM 보조 추정",
  MANUAL: "수동 수정",
};

/** DIRECT_MENTION / PRESS_SOURCE / MANUAL 외에는 '추정'으로 표시해야 한다. */
export const INFERRED_MATCH_TYPES: OfficeMatchType[] = [
  "REGION_INFERRED",
  "POLICE_INFERRED",
  "LLM_ASSIST",
];

export interface OfficeMatchResult {
  officeId: string;
  officeName: string;
  officeType: string;
  region: string;
  confidence: number;
  matchType: OfficeMatchType;
  reason: string;
  evidence: string[];
}

export interface CrimeResult {
  crimeType: string;
  crimeSubtype?: string;
  confidence: number;
  evidenceKeywords: string[];
  reason: string;
}

export interface ClassifyInput {
  title: string;
  fullText?: string | null;
  summary?: string | null;
  sourceType?: string | null;
  sourceName?: string | null;
}

export interface ArticleClassificationResult {
  offices: OfficeMatchResult[];
  primaryOffice?: OfficeMatchResult;
  region?: string;
  crime: CrimeResult;
  keywords: string[];
  highImpact: string[];
  needsHumanReview: boolean;
  reviewReasons: string[];
  classificationReasons: string[];
}
