// =====================================================================
// 이슈 타임라인 추출 — 같은 이슈 기사들을 시간순으로 정렬, 사건 흐름 추출
//  * 보도에 나온 사실만. 내부 수사정보처럼 단정하지 않는다.
//  * "보도에 따르면 / 공식 발표에 따르면" 표현 사용.
// =====================================================================

export interface TimelineInput {
  id: string;
  title: string;
  summary?: string | null;
  publishedAt: Date;
  sourceType: string;
}

export interface TimelineEvent {
  articleId: string;
  eventDate: Date;
  eventTitle: string;
  eventSummary: string;
  sourceType: string;
  confidence: number;
}

interface Stage { label: string; keywords: string[]; conf: number }

// 등장 순서대로 단계 라벨 매칭(보도 흐름)
const STAGES: Stage[] = [
  { label: "최초 의혹/인지 보도", keywords: ["의혹", "제기", "인지", "내사", "고발", "진정"], conf: 0.6 },
  { label: "압수수색 보도", keywords: ["압수수색", "압수·수색", "압수"], conf: 0.8 },
  { label: "소환·조사 보도", keywords: ["소환", "출석", "조사", "피의자 신문"], conf: 0.75 },
  { label: "구속영장 관련 보도", keywords: ["구속영장", "영장", "구속 전 피의자 심문", "구인"], conf: 0.8 },
  { label: "송치/송검 보도", keywords: ["송치", "송검", "검찰 송치"], conf: 0.75 },
  { label: "기소 보도", keywords: ["기소", "구속기소", "불구속기소", "공소제기"], conf: 0.85 },
  { label: "법원 판단 관련 보도", keywords: ["선고", "판결", "1심", "항소심", "유죄", "무죄"], conf: 0.75 },
  { label: "추가·후속 보도", keywords: ["추가", "후속", "피해자", "여죄", "확대"], conf: 0.55 },
];

function classifyStage(text: string): { label: string; conf: number } {
  for (const s of STAGES) {
    if (s.keywords.some((k) => text.includes(k))) return { label: s.label, conf: s.conf };
  }
  return { label: "관련 보도", conf: 0.5 };
}

const OFFICIAL_TYPES = ["OFFICIAL_PRESS", "MOJ_SPO_OFFICIAL"];

export function buildTimeline(items: TimelineInput[]): TimelineEvent[] {
  return [...items]
    .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime())
    .map((it) => {
      const text = `${it.title} ${it.summary ?? ""}`;
      const stage = classifyStage(text);
      const prefix = OFFICIAL_TYPES.includes(it.sourceType) ? "공식 발표에 따르면" : "보도에 따르면";
      const body = it.summary?.trim() || it.title.trim();
      return {
        articleId: it.id,
        eventDate: it.publishedAt,
        eventTitle: stage.label,
        eventSummary: `${prefix}, ${body.slice(0, 120)}${body.length > 120 ? "…" : ""}`,
        sourceType: it.sourceType,
        confidence: stage.conf,
      };
    });
}
