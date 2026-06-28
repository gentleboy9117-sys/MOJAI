// =====================================================================
// [공안] 집회·시위 공개정보 브리핑 생성기 (사양 §11)
//  * 집회·시위는 헌법상 기본권 행사일 수 있으므로 범죄로 단정하지 않는다.
//  * '공개 일정 정보' + '집회 관련 보도' 만 정리한다.
//  * 법적 이슈는 '공개 보도 기준 법적 이슈 가능성 언급' 으로만 표기한다(확정 아님).
//  * 최종 산출물에 softenAssemblyText 를 적용한다. 모두 참고용(담당자 최종판단).
// =====================================================================
import type { PrismaClient } from "@prisma/client";
import { formatDate } from "@/lib/utils";
import {
  getAssemblyByOffice,
  getRelatedNews,
  type AssemblyByOfficeRow,
  type RelatedNewsRow,
  type DashboardPeriod,
} from "./publicSafetyDashboard";
import { softenAssemblyText } from "./assemblySafetyRules";

export type PublicSafetyBriefingType = "DAILY" | "WEEKLY" | "BY_OFFICE" | "LEGAL_ISSUE_REVIEW";

export const PUBLIC_SAFETY_BRIEFING_TYPES: {
  key: PublicSafetyBriefingType;
  label: string;
  short: string;
  description: string;
}[] = [
  { key: "DAILY", label: "일일 공안 브리핑", short: "일일", description: "오늘·내일 공개 집회 일정과 관련 보도 현황 요약." },
  { key: "WEEKLY", label: "주간 공안 브리핑", short: "주간", description: "최근 7일 공개 집회 일정·관련 보도 추이 정리." },
  { key: "BY_OFFICE", label: "검찰청 관할별 현황", short: "관할별", description: "검찰청 관할별 공개 집회·관련 보도 현황 집계." },
  { key: "LEGAL_ISSUE_REVIEW", label: "법적 이슈 언급 검토", short: "법적 이슈", description: "공개 보도 기준 법적 이슈 가능성 언급·검토 필요 항목 집중." },
];

const NL = "\n";

export interface PublicSafetyBriefingData {
  periodStart: Date;
  periodEnd: Date;
  generatedBy: string;
  generatedAt: Date;
  todayCount: number;
  tomorrowCount: number;
  totalAssemblyCount: number;
  byOffice: AssemblyByOfficeRow[];
  relatedNews: RelatedNewsRow[];
  legalIssueNews: RelatedNewsRow[];
  reviewNeeded: { kind: string; title: string; officeName?: string; reason: string }[];
}

function typeToPeriod(type: PublicSafetyBriefingType): DashboardPeriod {
  if (type === "DAILY") return "today";
  return "7d";
}

/** 브리핑 데이터 집계(검찰청 관할별 + 관련 보도 + 검토 필요) */
export async function buildPublicSafetyBriefingData(
  prisma: PrismaClient,
  opts: { start: Date; end: Date; generatedBy: string; now?: Date; type?: PublicSafetyBriefingType },
): Promise<PublicSafetyBriefingData> {
  const now = opts.now ?? new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 86400000);
  const startOfDayAfter = new Date(startOfToday.getTime() + 2 * 86400000);
  const period = typeToPeriod(opts.type ?? "DAILY");

  const [todayCount, tomorrowCount, byOffice, relatedNews] = await Promise.all([
    prisma.assemblyEvent.count({ where: { eventDate: { gte: startOfToday, lt: startOfTomorrow } } }),
    prisma.assemblyEvent.count({ where: { eventDate: { gte: startOfTomorrow, lt: startOfDayAfter } } }),
    getAssemblyByOffice(prisma, period, now),
    getRelatedNews(prisma, period, now),
  ]);

  const totalAssemblyCount = byOffice.reduce((s, r) => s + r.assemblyCount, 0);
  const legalIssueNews = relatedNews.filter((n) => n.hasLegalIssueMention);

  // 검토 필요 항목: 관할 추정 검토 필요 일정 + 법적 이슈 언급 보도
  const reviewNeeded: PublicSafetyBriefingData["reviewNeeded"] = [];
  const reviewEvents = await prisma.assemblyEvent.findMany({
    where: {
      needsHumanReview: true,
      ...(period === "all" ? {} : { eventDate: { gte: startOfToday } }),
    },
    select: { title: true, locationName: true, prosecutionOfficeName: true, reviewReason: true },
    take: 30,
    orderBy: { eventDate: "asc" },
  });
  for (const e of reviewEvents) {
    reviewNeeded.push({
      kind: "관할 추정",
      title: `${e.title} (${e.locationName})`,
      officeName: e.prosecutionOfficeName ?? "관할 추정",
      reason: e.reviewReason ?? "관할 추정 신뢰도가 낮아 담당자 검토 필요",
    });
  }
  for (const n of legalIssueNews) {
    reviewNeeded.push({
      kind: "법적 이슈 언급",
      title: n.articleTitle,
      officeName: n.officeName,
      reason: "공개 보도 기준 법적 이슈 가능성 언급 — 담당자 검토 필요(확정 아님)",
    });
  }

  return {
    periodStart: opts.start,
    periodEnd: opts.end,
    generatedBy: opts.generatedBy,
    generatedAt: now,
    todayCount,
    tomorrowCount,
    totalAssemblyCount,
    byOffice,
    relatedNews,
    legalIssueNews,
    reviewNeeded,
  };
}

const DISCLAIMER =
  "> 이 브리핑은 서울경찰청 등 **공개자료의 집회·시위 일정** 과 **공개 보도** 를 기반으로 자동 생성된 **참고용 초안** 입니다. 집회·시위는 헌법상 보장되는 기본권(집회·결사의 자유) 행사일 수 있으며, 본 자료는 집회 자체를 범죄로 단정하지 않습니다. 관련 보도는 범죄 사실이 아니라 '공개 보도' 이며, 법적 이슈 표현은 '공개 보도 기준 법적 이슈 가능성 언급'(확정 아님) 입니다. 검찰청 관할은 행정 편의를 위한 추정이며, 최종 판단과 책임은 담당자에게 있습니다.";

function s_summary(d: PublicSafetyBriefingData): string {
  return [
    "## 1. 요약",
    "",
    `- 기준 기간: ${formatDate(d.periodStart)} ~ ${formatDate(d.periodEnd)}`,
    `- 오늘 공개 집회 일정: ${d.todayCount}건 · 내일 예정: ${d.tomorrowCount}건`,
    `- 집계 대상 공개 일정: ${d.totalAssemblyCount}건 · 관할(추정) 검찰청 수: ${d.byOffice.length}곳`,
    `- 집회 관련 보도: ${d.relatedNews.length}건 · 공개 보도 기준 법적 이슈 가능성 언급: ${d.legalIssueNews.length}건`,
    `- 담당자 검토 필요 항목: ${d.reviewNeeded.length}건`,
  ].join(NL);
}

function s_byOffice(d: PublicSafetyBriefingData): string {
  const blocks = d.byOffice
    .slice(0, 12)
    .map((o) =>
      [
        `### ${o.officeName}`,
        `- 공개 집회 일정: ${o.assemblyCount}건`,
        `- 주요 장소: ${o.mainLocations.join(", ") || "-"}`,
        `- 집회 관련 보도: ${o.relatedReportCount}건 · 법적 이슈 가능성 언급: ${o.legalIssueCount}건`,
        `- 관할 추정 평균 신뢰도: ${(o.avgJurisdictionConfidence * 100).toFixed(0)}% · 검토 필요: ${o.reviewNeededCount}건`,
      ].join(NL),
    )
    .join(NL + NL);
  return ["## 2. 검찰청 관할별 집회 현황 (관할 추정)", "", blocks || "- 해당 기간 공개 집회 일정 없음"].join(NL);
}

function s_relatedNews(d: PublicSafetyBriefingData): string {
  const rows = d.relatedNews
    .slice(0, 20)
    .map(
      (n) =>
        `- [${n.officeName}] ${formatDate(n.assemblyDate)} ${n.locationName} — 「${n.articleTitle}」 (${n.sourceName}, 관련도 ${(n.relationConfidence * 100).toFixed(0)}%)${
          n.hasLegalIssueMention ? " · 공개 보도 기준 법적 이슈 가능성 언급" : ""
        }`,
    )
    .join(NL);
  return [
    "## 3. 집회 관련 보도 현황",
    "",
    "_관련 보도는 범죄 사실이 아니라 공개 보도이며, '보도에 따르면' 기준으로 정리합니다._",
    "",
    rows || "- 해당 기간 집회 관련 보도 없음",
  ].join(NL);
}

function s_legalIssue(d: PublicSafetyBriefingData): string {
  const rows = d.legalIssueNews
    .slice(0, 20)
    .map(
      (n) =>
        `- [${n.officeName}] ${formatDate(n.assemblyDate)} ${n.locationName} — 「${n.articleTitle}」 (${n.sourceName})`,
    )
    .join(NL);
  return [
    "## 공개 보도 기준 법적 이슈 가능성 언급",
    "",
    "_아래는 공개 보도에 법적 이슈 관련 표현이 등장한 항목입니다. 확정된 범죄가 아니며, 범죄 분류로 자동 편입하지 않습니다. 반드시 담당자 검토가 필요합니다._",
    "",
    rows || "- 공개 보도 기준 법적 이슈 가능성 언급 항목 없음",
  ].join(NL);
}

function s_review(d: PublicSafetyBriefingData): string {
  const rows = d.reviewNeeded
    .slice(0, 30)
    .map((r) => `- [${r.kind}] ${r.title}${r.officeName ? ` (${r.officeName})` : ""} — ${r.reason}`)
    .join(NL);
  return [
    "## 검토 필요 항목",
    "",
    rows || "- 검토 필요 항목 없음",
    "",
    "_관할 추정 신뢰도가 낮거나 공개 보도 기준 법적 이슈 가능성 언급이 포함된 항목입니다. 담당자 확인이 필요합니다._",
  ].join(NL);
}

function s_notice(): string {
  return [
    "## 유의사항",
    "",
    "- 집회·시위는 헌법상 보장되는 기본권 행사일 수 있으며, 본 자료는 집회 자체를 범죄로 단정하지 않습니다.",
    "- 참가자 개인 식별, 주최/참가 단체의 정치 성향·이념·배후 추론, 감시 목적의 활용을 금지합니다.",
    "- 본 브리핑은 공개자료 기반 참고용 초안입니다. 최종 활용 전 담당자 검토가 필요합니다.",
  ].join(NL);
}

const SECTION_BUILDERS: Record<
  PublicSafetyBriefingType,
  ((d: PublicSafetyBriefingData) => string)[]
> = {
  DAILY: [s_summary, s_byOffice, s_relatedNews, s_review, s_notice],
  WEEKLY: [s_summary, s_byOffice, s_relatedNews, s_review, s_notice],
  BY_OFFICE: [s_summary, s_byOffice, s_review, s_notice],
  LEGAL_ISSUE_REVIEW: [s_summary, s_legalIssue, s_review, s_notice],
};

/** 브리핑 마크다운 생성 — 최종 텍스트에 집회 표현 완화 적용 */
export function generatePublicSafetyBriefingMarkdown(
  data: PublicSafetyBriefingData,
  type: PublicSafetyBriefingType,
): { title: string; markdown: string } {
  const meta =
    PUBLIC_SAFETY_BRIEFING_TYPES.find((t) => t.key === type) ?? PUBLIC_SAFETY_BRIEFING_TYPES[0];
  const title = `공안 집회·시위 공개정보 브리핑 — ${meta.label}`;

  const head = [
    `# ${title}`,
    "",
    DISCLAIMER,
    "",
    `- 생성자: ${data.generatedBy} · 생성일: ${formatDate(data.generatedAt)}`,
    `- 데이터 기준: ${formatDate(data.periodStart)} ~ ${formatDate(data.periodEnd)} · 브리핑 유형: ${meta.label}`,
    "",
    "---",
    "",
  ].join(NL);

  const body = (SECTION_BUILDERS[type] ?? SECTION_BUILDERS.DAILY)
    .map((fn) => fn(data))
    .filter(Boolean)
    .join(NL + NL);

  const raw = head + body;
  // 집회 표현 완화(위험 표현 → 중립 표현)
  const markdown = softenAssemblyText(raw);
  return { title, markdown };
}
