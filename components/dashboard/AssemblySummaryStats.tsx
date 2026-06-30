"use client";
import { Stat } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";

interface Summary {
  todayCount: number;
  tomorrowCount: number;
  byOfficeCount: number;
  withRelatedReportCount: number;
}

/** 대시보드 상단 요약 카드 — 집회·시위 현황(공안 대시보드 요약 재사용) */
export function AssemblySummaryStats() {
  const { data: s, loading } = useApi<Summary>("/api/public-safety/dashboard/summary");
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="오늘 공개 집회" value={loading ? "…" : (s?.todayCount ?? 0)} sub="공개 일정 정보" />
      <Stat label="내일 예정" value={loading ? "…" : (s?.tomorrowCount ?? 0)} sub="공개 일정 정보" />
      <Stat label="관할 검찰청" value={loading ? "…" : (s?.byOfficeCount ?? 0)} sub="곳" />
      <Stat label="관련 보도 있는 일정" value={loading ? "…" : (s?.withRelatedReportCount ?? 0)} sub="공개 보도" />
    </div>
  );
}
