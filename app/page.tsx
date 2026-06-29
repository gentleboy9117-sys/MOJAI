import { WorkAreaCards } from "@/components/dashboard/WorkAreaCards";
import { DashboardSections } from "@/components/dashboard/DashboardSections";
import { DailyBriefingStatus } from "@/components/dashboard/DailyBriefingStatus";
import { TrendAlerts } from "@/components/dashboard/TrendAlerts";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">대시보드</h1>
        <p className="text-body-s text-ink-muted">기획검사 업무 현황 한눈에 보기 — 공개 자료 기반 시스템</p>
      </div>
      <WorkAreaCards />
      {/* 각 모니터링 섹션 첫 항목 요약: 이슈 검찰청별 · 공판 검찰청별 · 공안 모니터링 */}
      <DashboardSections />
      <div className="grid gap-4 lg:grid-cols-2">
        <DailyBriefingStatus />
        <TrendAlerts />
      </div>
    </div>
  );
}
