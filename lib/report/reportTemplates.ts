// =====================================================================
// 보고서 유형 정의 (5종) — 대상별 자동 변환
// =====================================================================
export type ReportType =
  | "EXEC_SUMMARY"
  | "ANALYST_DETAIL"
  | "POLICY_TREND"
  | "MEDIA_RESPONSE"
  | "MEETING_BULLET";

export interface ReportTypeMeta {
  key: ReportType;
  label: string;
  short: string;
  audience: string;
  description: string;
  /** 포함 섹션 키 */
  sections: string[];
}

export const REPORT_TYPES: ReportTypeMeta[] = [
  {
    key: "EXEC_SUMMARY",
    label: "기관장용 1페이지 요약",
    short: "기관장 보고",
    audience: "기관장",
    description: "핵심 이슈 5개·주요 변화·주목할 점. 1페이지 내외, 짧고 정돈된 문장.",
    sections: ["summary", "top5", "notable"],
  },
  {
    key: "ANALYST_DETAIL",
    label: "실무자용 상세 브리핑",
    short: "실무 분석",
    audience: "분석관",
    description: "검찰청별·범죄유형별 상세 현황, 기사별 출처, 검토 필요 항목 포함.",
    sections: ["summary", "top5", "byOffice", "byCrime", "trend", "review", "sources"],
  },
  {
    key: "POLICY_TREND",
    label: "정책 참고용 동향 보고서",
    short: "정책 동향",
    audience: "정책 담당",
    description: "지역별·유형별 추세, 반복 이슈, 제도 개선 참고 포인트(단정적 제안 지양).",
    sections: ["summary", "byCrime", "trend", "policyNote", "sources"],
  },
  {
    key: "MEDIA_RESPONSE",
    label: "언론 대응 참고용 요약",
    short: "언론 대응",
    audience: "공보 담당",
    description: "언론 보도 프레임·반복 표현, 공식 발표와 언론 보도 차이, 민감 표현 주의.",
    sections: ["summary", "top5", "mediaFrame", "review", "sources"],
  },
  {
    key: "MEETING_BULLET",
    label: "회의자료용 bullet report",
    short: "회의자료",
    audience: "회의 참석자",
    description: "bullet·표 중심, 논의 필요 항목·결정 필요사항·후속 조치.",
    sections: ["summaryBullet", "top5", "byOffice", "decisions", "sources"],
  },
];

export function getReportTypeMeta(key: ReportType): ReportTypeMeta {
  return REPORT_TYPES.find((t) => t.key === key) ?? REPORT_TYPES[1];
}
