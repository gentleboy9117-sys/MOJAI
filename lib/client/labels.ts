// 클라이언트 표시용 라벨/톤 매핑 (서버 라벨 미러)

export const SOURCE_TYPE_LABEL: Record<string, string> = {
  OFFICIAL_PRESS: "공식 보도자료",
  MOJ_SPO_OFFICIAL: "법무부/검찰 공식",
  LICENSED_NEWS: "라이선스 뉴스",
  WEB_NEWS: "언론 기사",
  MANUAL: "수동 입력",
  SAMPLE: "샘플 데이터",
};

export const LICENSE_LABEL: Record<string, string> = {
  PUBLIC_PRESS: "공공자료(재사용 가능)",
  LICENSED_API: "라이선스 필요",
  DEV_CRAWL: "개발용(표시 제한)",
  MANUAL: "수동 입력",
};

export type Tone = "neutral" | "navy" | "blue" | "success" | "warning" | "danger" | "info" | "outline" | "solid";

export function issueLevelTone(level?: string | null): Tone {
  switch (level) {
    case "critical": return "danger";
    case "high": return "warning";
    case "medium": return "blue";
    default: return "neutral";
  }
}

export function spreadTone(status?: string | null): Tone {
  switch (status) {
    case "HIGH_SPREAD": return "danger";
    case "SPREADING": return "warning";
    case "OBSERVING": return "blue";
    case "STABLE": return "neutral";
    default: return "navy";
  }
}

export function sourceTone(sourceType?: string | null): Tone {
  if (sourceType === "OFFICIAL_PRESS" || sourceType === "MOJ_SPO_OFFICIAL") return "navy";
  if (sourceType === "LICENSED_NEWS") return "warning";
  if (sourceType === "WEB_NEWS") return "outline";
  return "neutral";
}

// 좌측 네비게이션 (업무 영역별 그룹)
export interface NavItem { label: string; href: string }
export interface NavGroup { title: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    // 최상단 단독 — 이슈+공안 통합 대시보드
    title: "",
    items: [{ label: "대시보드", href: "/" }],
  },
  {
    title: "이슈 모니터링",
    items: [
      { label: "이슈 모니터링", href: "/issues" },
      { label: "검찰청별 보기", href: "/offices" },
      { label: "범죄유형별 보기", href: "/crime-types" },
      { label: "제도/정책 이슈", href: "/policy-issues" },
      { label: "이슈 브리핑", href: "/reports" },
    ],
  },
  {
    title: "공판 모니터링",
    items: [
      { label: "공판 모니터링", href: "/trials" },
      { label: "검찰청별 보기", href: "/trials/offices" },
      { label: "범죄유형별 보기", href: "/trials/crime-types" },
      { label: "공판 브리핑", href: "/trials/reports" },
    ],
  },
  {
    title: "공안 모니터링",
    items: [
      { label: "공안 모니터링", href: "/public-safety" },
      { label: "집회·시위 일정", href: "/public-safety/assemblies" },
      { label: "집회·시위 보도", href: "/public-safety/related-news" },
      { label: "선거 보도", href: "/public-safety/election-news" },
      { label: "노동·중대재해 보도", href: "/public-safety/labor-news" },
      { label: "공안 브리핑", href: "/public-safety/briefings" },
    ],
  },
  {
    title: "사건 처리 후 발표자료",
    items: [
      { label: "보도자료 초안 생성", href: "/press-release-generator" },
      { label: "검찰발표자료 레퍼런스", href: "/press-release-references" },
      { label: "문장 리스크 점검", href: "/risk-checker" },
    ],
  },
  {
    title: "공통",
    items: [
      { label: "감사 로그", href: "/audit-logs" },
      { label: "설정", href: "/settings" },
    ],
  },
];
