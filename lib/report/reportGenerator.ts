// =====================================================================
// 브리핑 보고서 생성기 — 결정적 Markdown 생성(+민감표현 완화).
//  * 데이터 집계는 호출측에서 ReportData 로 준비해 전달한다.
//  * "보도에 따르면/공식 발표에 따르면" 표현, 참고용 명시.
// =====================================================================
import { formatDate } from "@/lib/utils";
import { rewriteMarkdown } from "./safetyRewrite";
import { getReportTypeMeta, type ReportType } from "./reportTemplates";

export interface ReportTopIssue {
  rank: number;
  title: string;
  officeName?: string;
  crimeType?: string;
  articleCount: number;
  issueLevelLabel: string;
  score: number;
  reason: string;
}
export interface ReportOfficeStat {
  officeName: string;
  region: string;
  articleCount: number;
  issueCount: number;
  mainCrimeType?: string;
  reviewNeeded: number;
  deltaPrev?: number;
  headline?: string;
}
export interface ReportCrimeStat {
  crimeType: string;
  articleCount: number;
  topOffices: string[];
  keywords: string[];
  headline?: string;
}
export interface ReportTrend {
  crimeType: string;
  recentCount: number;
  baselineAvg: number;
  increaseRatio: number;
  offices: string[];
}
export interface ReportReviewItem {
  title: string;
  officeName?: string;
  reasons: string[];
}
export interface ReportSource {
  title: string;
  sourceName: string;
  url: string;
  publishedAt: Date;
}

export interface ReportData {
  periodStart: Date;
  periodEnd: Date;
  generatedBy: string;
  generatedAt: Date;
  articleCount: number;
  issueCount: number;
  mainOffices: string[];
  mainCrimeTypes: string[];
  keyIssues: string[];
  topIssues: ReportTopIssue[];
  officeStats: ReportOfficeStat[];
  crimeStats: ReportCrimeStat[];
  trendAlerts: ReportTrend[];
  reviewNeeded: ReportReviewItem[];
  sources: ReportSource[];
}

const NL = "\n";

function s_summary(d: ReportData): string {
  return [
    "## 1. 요약",
    "",
    `- 분석 기간: ${formatDate(d.periodStart)} ~ ${formatDate(d.periodEnd)}`,
    `- 수집 기사 수: ${d.articleCount}건`,
    `- 생성된 이슈 수: ${d.issueCount}건`,
    `- 주요 검찰청: ${d.mainOffices.join(", ") || "-"}`,
    `- 주요 범죄유형: ${d.mainCrimeTypes.join(", ") || "-"}`,
    `- 핵심 이슈 3가지:${d.keyIssues.length ? NL + d.keyIssues.slice(0, 3).map((k, i) => `  ${i + 1}. ${k}`).join(NL) : " -"}`,
  ].join(NL);
}

function s_summaryBullet(d: ReportData): string {
  return [
    "## 1. 요약 (회의용)",
    "",
    `- 기간 ${formatDate(d.periodStart)}~${formatDate(d.periodEnd)} · 기사 ${d.articleCount} · 이슈 ${d.issueCount}`,
    `- 주요 검찰청: ${d.mainOffices.slice(0, 5).join(", ") || "-"}`,
    `- 주요 범죄유형: ${d.mainCrimeTypes.slice(0, 5).join(", ") || "-"}`,
  ].join(NL);
}

function s_top5(d: ReportData): string {
  const rows = d.topIssues
    .slice(0, 5)
    .map(
      (t) =>
        `${t.rank}. **${t.title}**${NL}   - 관련 검찰청: ${t.officeName ?? "추정 불가"} · 범죄유형: ${t.crimeType ?? "-"}${NL}   - 관련 기사 수: ${t.articleCount}건 · 보도 파급도: ${t.issueLevelLabel}(${t.score}/100, 공개 보도 기준)${NL}   - 선정 이유: ${t.reason}`,
    )
    .join(NL);
  return ["## 2. 오늘의 주요 이슈 TOP 5", "", rows || "- 해당 기간 주요 이슈 없음"].join(NL);
}

function s_byOffice(d: ReportData): string {
  const blocks = d.officeStats
    .slice(0, 12)
    .map((o) =>
      [
        `### ${o.officeName}`,
        `- 기사 수: ${o.articleCount}건 · 이슈 수: ${o.issueCount}건${o.deltaPrev != null ? ` · 전일 대비 ${o.deltaPrev >= 0 ? "+" : ""}${o.deltaPrev}` : ""}`,
        `- 주요 범죄유형: ${o.mainCrimeType ?? "-"}`,
        `- 핵심 헤드라인: ${o.headline ?? "-"}`,
        `- 검토 필요 기사: ${o.reviewNeeded}건`,
      ].join(NL),
    )
    .join(NL + NL);
  return ["## 3. 검찰청별 주요 이슈", "", blocks || "- 데이터 없음"].join(NL);
}

function s_byCrime(d: ReportData): string {
  const blocks = d.crimeStats
    .slice(0, 12)
    .map((c) =>
      [
        `### ${c.crimeType}`,
        `- 기사 수: ${c.articleCount}건`,
        `- 주요 사건(대표 헤드라인): ${c.headline ?? "-"}`,
        `- 관련 검찰청: ${c.topOffices.join(", ") || "-"}`,
        `- 반복 키워드: ${c.keywords.slice(0, 6).join(", ") || "-"}`,
      ].join(NL),
    )
    .join(NL + NL);
  return ["## 4. 범죄유형별 주요 이슈", "", blocks || "- 데이터 없음"].join(NL);
}

function s_trend(d: ReportData): string {
  if (!d.trendAlerts.length) return ["## 5. 공개 보도량 증가 감지", "", "- 최근 24시간 기준 유의미한 증가 감지 없음"].join(NL);
  const rows = d.trendAlerts
    .map(
      (t) =>
        `- **${t.crimeType}**: 최근 24시간 ${t.recentCount}건 / 7일 평균 ${t.baselineAvg.toFixed(1)}건 → 약 ${t.increaseRatio.toFixed(1)}배 (공개 보도량 기준 증가) · 주요 관할: ${t.offices.join(", ") || "-"}`,
    )
    .join(NL);
  return ["## 5. 공개 보도량 증가 감지", "", rows].join(NL);
}

function s_review(d: ReportData): string {
  const rows = d.reviewNeeded
    .slice(0, 15)
    .map((r) => `- ${r.title}${r.officeName ? ` (${r.officeName})` : ""} — 사유: ${r.reasons.join(", ")}`)
    .join(NL);
  return ["## 6. 검토 필요 항목", "", rows || "- 검토 필요 항목 없음", "", "_분류 신뢰도가 낮거나 관할 추정·민감 표현이 포함된 기사입니다. 담당자 확인이 필요합니다._"].join(NL);
}

function s_sources(d: ReportData): string {
  const header = "| 제목 | 출처 | 작성일 | URL |" + NL + "|---|---|---|---|";
  const rows = d.sources
    .slice(0, 50)
    .map((s) => `| ${s.title.replace(/\|/g, "/")} | ${s.sourceName} | ${formatDate(s.publishedAt)} | ${s.url} |`)
    .join(NL);
  return ["## 7. 출처 목록", "", header, rows || "| - | - | - | - |"].join(NL);
}

function s_notable(d: ReportData): string {
  const items = d.topIssues
    .filter((t) => t.issueLevelLabel === "높음" || t.issueLevelLabel === "매우 높음")
    .slice(0, 5)
    .map((t) => `- ${t.title} (${t.officeName ?? "관할 추정"} · ${t.crimeType ?? "-"})`)
    .join(NL);
  return ["## 주목할 만한 이슈", "", items || "- 특이 급증/고파급 이슈 없음"].join(NL);
}

function s_policyNote(): string {
  return [
    "## 제도 개선 참고 포인트",
    "",
    "- 반복적으로 보도되는 유형/지역은 공개 동향 관찰 대상으로 참고할 수 있습니다.",
    "- _본 항목은 공개 보도 동향 기반 참고 자료이며, 단정적 정책 제안이 아닙니다._",
  ].join(NL);
}

function s_mediaFrame(d: ReportData): string {
  return [
    "## 언론 보도 프레임 참고",
    "",
    `- 반복 강조 키워드: ${d.crimeStats.flatMap((c) => c.keywords).slice(0, 10).join(", ") || "-"}`,
    "- 공식 발표와 언론 보도의 강조점이 다를 수 있으므로, 공식 발표 기준으로 사실관계를 확인하세요.",
    "- _어느 쪽이 맞다/틀리다 판단하지 않으며, 표현·강조점 차이만 정리합니다._",
  ].join(NL);
}

function s_decisions(d: ReportData): string {
  return [
    "## 논의·결정 필요사항",
    "",
    `- 검토 필요 기사 ${d.reviewNeeded.length}건 처리 방향`,
    "- 주요 이슈 대응 우선순위",
    "- 후속 모니터링 대상 지정",
  ].join(NL);
}

const SECTION_BUILDERS: Record<string, (d: ReportData) => string> = {
  summary: s_summary,
  summaryBullet: s_summaryBullet,
  top5: s_top5,
  byOffice: s_byOffice,
  byCrime: s_byCrime,
  trend: s_trend,
  review: s_review,
  sources: s_sources,
  notable: s_notable,
  policyNote: () => s_policyNote(),
  mediaFrame: s_mediaFrame,
  decisions: s_decisions,
};

const DISCLAIMER =
  "> 이 보고서는 공개 뉴스 및 공식 보도자료를 기반으로 자동 생성된 **참고용 브리핑**이며, 실제 수사 정보나 내부 자료를 포함하지 않습니다. 원문 이용 범위는 각 뉴스 저작권 및 기관 라이선스 정책을 따릅니다. 보도 내용을 사실로 단정하지 않습니다.";

export function generateReportMarkdown(
  data: ReportData,
  type: ReportType,
): { title: string; markdown: string } {
  const meta = getReportTypeMeta(type);
  const title = `전국 검찰청 관할 이슈 브리핑 — ${meta.label}`;

  const head = [
    `# ${title}`,
    "",
    DISCLAIMER,
    "",
    `- 생성자: ${data.generatedBy} · 생성일: ${formatDate(data.generatedAt)}`,
    `- 데이터 기준일: ${formatDate(data.periodStart)} ~ ${formatDate(data.periodEnd)} · 보고서 유형: ${meta.label}`,
    "",
    "---",
    "",
  ].join(NL);

  const body = meta.sections
    .map((key) => SECTION_BUILDERS[key]?.(data) ?? "")
    .filter(Boolean)
    .join(NL + NL);

  const tail = [
    "",
    "## 유의사항",
    "",
    "이 보고서는 공개 자료 기반 참고 브리핑입니다. 수사 사실처럼 단정하지 않으며, 최종 활용 전 담당자 검토가 필요합니다.",
  ].join(NL);

  // 민감 표현 자동 완화
  const raw = head + body + NL + tail;
  const { text } = rewriteMarkdown(raw);
  return { title, markdown: text };
}
