// =====================================================================
// 공유 도메인 타입 — DB(String 저장)와 UI/로직 사이의 단일 계약
// =====================================================================

export const ROLES = ["VIEWER", "ANALYST", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  VIEWER: "사용자",
  ANALYST: "분석관",
  ADMIN: "관리자",
};

export const OFFICE_TYPES = ["대검찰청", "고등검찰청", "지방검찰청", "지청"] as const;
export type OfficeType = (typeof OFFICE_TYPES)[number];

export const REGIONS = [
  "서울", "의정부", "인천", "춘천", "수원", "대전", "청주",
  "대구", "부산", "울산", "창원", "광주", "전주", "제주",
] as const;
export type Region = (typeof REGIONS)[number];

// 저작권/표시 정책
export const LICENSE_TYPES = ["PUBLIC_PRESS", "LICENSED_API", "DEV_CRAWL", "MANUAL"] as const;
export type LicenseType = (typeof LICENSE_TYPES)[number];

export const LICENSE_LABEL: Record<LicenseType, string> = {
  PUBLIC_PRESS: "공식 보도자료(재사용 가능)",
  LICENSED_API: "라이선스 뉴스 API",
  DEV_CRAWL: "개발용 수집(표시 제한)",
  MANUAL: "수동 입력",
};

export const PROVIDER_TYPES = [
  "PUBLIC_PRESS_RELEASE", "LICENSED_NEWS", "DEV_CRAWLER", "RSS",
] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

export const CLASSIFY_METHODS = ["keyword", "llm", "human"] as const;
export type ClassifyMethod = (typeof CLASSIFY_METHODS)[number];

// LLM 분류 결과 계약 (10-1 프롬프트 출력 스키마)
export interface OfficeMatch {
  office_name: string;
  confidence: number;
  reason: string;
}
export interface LlmClassification {
  related_offices: OfficeMatch[];
  crime_type: string;
  crime_subtype: string;
  crime_confidence: number;
  evidence_keywords: string[];
  one_line_summary: string;
  risk_level: RiskLevel;
  needs_human_review: boolean;
}

// 표준 API 응답
export interface ApiOk<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}
export interface ApiErr {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}
export type ApiResponse<T> = ApiOk<T> | ApiErr;
