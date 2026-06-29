"use client";
import { Stat } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { AssemblySourceStatusPanel } from "./AssemblySourceStatusPanel";

interface Summary {
  todayCount: number;
  tomorrowCount: number;
  byOfficeCount: number;
  withRelatedReportCount: number;
  legalIssueMentionCount: number;
  reviewNeededCount: number;
}

/** [집회·시위 모니터링] 대시보드 — 요약 카드 + 수집 현황 */
export function PublicSafetyDashboardPage() {
  const summary = useApi<Summary>("/api/public-safety/dashboard/summary");
  const s = summary.data;

  return (
    <div className="space-y-5">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="오늘 공개 집회" value={summary.loading ? "…" : (s?.todayCount ?? 0)} sub="공개 일정 정보" />
        <Stat label="내일 예정" value={summary.loading ? "…" : (s?.tomorrowCount ?? 0)} sub="공개 일정 정보" />
        <Stat label="관할 검찰청" value={summary.loading ? "…" : (s?.byOfficeCount ?? 0)} sub="곳" />
        <Stat label="관련 보도 있는 일정" value={summary.loading ? "…" : (s?.withRelatedReportCount ?? 0)} sub="공개 보도" />
      </div>

      {/* 출처별 수집 현황 · 정보 반영 시각 */}
      <AssemblySourceStatusPanel />
    </div>
  );
}
