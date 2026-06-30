// [공안] 클라이언트 표시용 라벨/상수 (labels.ts 를 건드리지 않기 위한 모듈)
import type { Tone } from "@/lib/client/labels";

/** 공안 모듈 하위 탭 네비게이션 */
export interface SubNavItem {
  label: string;
  href: string;
}

export const PUBLIC_SAFETY_SUBNAV: SubNavItem[] = [
  { label: "공안 모니터링", href: "/public-safety" },
  { label: "집회·시위 일정", href: "/public-safety/assemblies" },
  { label: "집회·시위 보도", href: "/public-safety/related-news" },
  { label: "선거 보도", href: "/public-safety/election-news" },
  { label: "노동·중대재해 보도", href: "/public-safety/labor-news" },
];

/** 관할 추정 방법 라벨 */
export const JURISDICTION_METHOD_LABEL: Record<string, string> = {
  ADDRESS: "주소 기반 추정",
  DISTRICT: "행정구 기반 추정",
  POLICE: "관할 경찰서 기반 추정",
  OFFICE_TABLE: "검찰청 관할표 기반 추정",
  LLM_ASSIST: "보조 추정(기본값)",
  MANUAL: "담당자 수동 확정",
};

/** 관련 보도 관계 유형 라벨 (범죄가 아니라 공개 보도) */
export const RELATION_TYPE_LABEL: Record<string, string> = {
  same_day_report: "집회 당일 보도",
  next_day_report: "집회 다음날 보도",
  follow_up_report: "후속 보도",
  legal_issue_report: "법적 이슈 가능성 언급 보도",
  unrelated_or_low_confidence: "관련성 낮음(검토 필요)",
};

export function relationTypeTone(type: string): Tone {
  switch (type) {
    case "legal_issue_report":
      return "warning";
    case "same_day_report":
      return "blue";
    case "next_day_report":
      return "navy";
    case "follow_up_report":
      return "outline";
    default:
      return "neutral";
  }
}

/** 관할 추정 신뢰도 → 톤 */
export function confidenceTone(confidence?: number | null): Tone {
  const c = confidence ?? 0;
  if (c >= 0.85) return "success";
  if (c >= 0.7) return "blue";
  if (c >= 0.5) return "warning";
  return "danger";
}

/** MANUAL 이 아니거나 검토 필요면 '추정' 으로 표시해야 한다. */
export function isInferredJurisdiction(method?: string | null, needsHumanReview?: boolean): boolean {
  return needsHumanReview === true || (method != null && method !== "MANUAL");
}

export function formatPercent(value?: number | null): string {
  return `${Math.round((value ?? 0) * 100)}%`;
}
