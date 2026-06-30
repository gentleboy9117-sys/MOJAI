// =====================================================================
// [C] 검찰발표자료 → 보도자료 초안 생성: 공통 타입
//  * 스타일 레퍼런스 도구. 레퍼런스의 사실관계는 절대 복사하지 않는다.
//  * 모든 산출물은 "초안(draft) — 담당자 검토 필요".
// =====================================================================

/** 보도자료 초안 길이 옵션 */
export type LengthOption = "short" | "normal" | "detailed";

/** 사용자 입력 사실 (이 값들만으로 초안을 생성한다 — 레퍼런스 사실 미사용) */
export interface PressReleaseInput {
  /** 발표 주체 검찰청 (예: 서울중앙지방검찰청) */
  officeName: string;
  /** 전문공보관 성명 (헤더) */
  spokesperson?: string;
  /** 공보 연락처 - 전화 */
  contactPhone?: string;
  /** 공보 연락처 - 팩스 */
  contactFax?: string;
  /** 배포일 (예: 2026. 6. 30.(화)) */
  releaseDate?: string;
  /** 발표 유형 key (RELEASE_TYPES) */
  releaseType: string;
  /** 사건 단계 key (CASE_STAGES) */
  caseStage: string;
  /** 범죄 유형 (예: 사기, 보이스피싱, 마약) */
  crimeType: string;
  /** 사건 개요 (사용자가 입력한 사실) */
  caseSummary: string;
  /** 적용 혐의/죄명 */
  charges: string;
  /** 법률 키워드 */
  legalKeywords: string[];
  /** 피의자 설명 (비식별: A씨 등) */
  suspectDescription: string;
  /** 피해자 설명 (비식별) */
  victimDescription: string;
  /** 피해 규모 (예: 약 ○○억 원) */
  damageScale: string;
  /** 수사 결과 */
  investigationResult: string;
  /** 처분 결과 (예: 구속기소) */
  dispositionResult: string;
  /** 향후 계획 */
  futurePlan: string;
  /** 공개 범위 (예: 전면 공개 / 제한 공개) */
  publicScope: string;
  /** 비실명/비식별 규칙 */
  anonymizationRules: string;
  /** 강조 메시지 */
  emphasisMessage: string;
  /** 첨부자료명 목록 */
  attachments: string[];
  /** 길이 옵션 */
  lengthOption: LengthOption;
  /** 제목 후보 포함 여부 */
  includeTitleCandidates: boolean;
  /** 예상 질의응답 포함 여부 */
  includeQA: boolean;
  /** 리스크 점검 포함 여부 */
  includeRiskCheck: boolean;
  /** 체크리스트 포함 여부 */
  includeChecklist: boolean;
}

/** 발표 유형 (8종) */
export const RELEASE_TYPES: { key: string; label: string }[] = [
  { key: "PERFORMANCE", label: "성과 발표형" },
  { key: "INVESTIGATION_RESULT", label: "수사 결과 발표형" },
  { key: "JOINT_TF", label: "합동수사·TF 출범형" },
  { key: "BEST_PRACTICE", label: "우수사례 선정형" },
  { key: "POLICY_RESPONSE", label: "정책 대응형" },
  { key: "CAMPAIGN", label: "범죄 근절 캠페인형" },
  { key: "SYSTEM_IMPROVEMENT", label: "제도 개선형" },
  { key: "INTERNATIONAL", label: "국제공조·협력형" },
];

/** 사건 단계 (7종) */
export const CASE_STAGES: { key: string; label: string }[] = [
  { key: "INVESTIGATION_STARTED", label: "수사 착수" },
  { key: "UNDER_INVESTIGATION", label: "수사 중" },
  { key: "TRANSFERRED", label: "송치·송검" },
  { key: "INDICTED", label: "기소" },
  { key: "INDICTED_DETAINED", label: "구속기소" },
  { key: "INDICTED_NOT_DETAINED", label: "불구속기소" },
  { key: "DISPOSED", label: "처분 완료" },
];

/** 선정된 레퍼런스 — 스타일 메타데이터만 노출(본문 내용 미포함) */
export interface SelectedReference {
  id: string;
  title: string;
  titlePatternType?: string;
  officeName?: string;
  /** 원문(공개 검찰발표자료 PDF) 링크 */
  sourceUrl?: string;
  /** 유사도 0..1 */
  similarity: number;
  /** 선정 사유(스타일 기준) */
  matchReason: string;
}

/** 생성된 보도자료 초안 */
export interface GeneratedDraft {
  title: string;
  subtitle?: string;
  draftMarkdown: string;
  titleCandidates: string[];
  qa: { q: string; a: string }[];
  checklist: { item: string; checked: boolean }[];
  riskCheck: any;
  referenceNote: SelectedReference[];
}

/** key → label 조회 헬퍼 */
export function releaseTypeLabel(key: string): string {
  return RELEASE_TYPES.find((t) => t.key === key)?.label || key;
}

export function caseStageLabel(key: string): string {
  return CASE_STAGES.find((s) => s.key === key)?.label || key;
}
