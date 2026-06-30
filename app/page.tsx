import { DashboardSections } from "@/components/dashboard/DashboardSections";
import { AssemblySummaryStats } from "@/components/dashboard/AssemblySummaryStats";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">대시보드</h1>
        <p className="text-body-s text-ink-muted">이슈 한눈에 — 각 메뉴로 바로 진입 가능합니다.</p>
      </div>
      {/* 상단 요약 카드(집회·시위 현황) */}
      <AssemblySummaryStats />
      {/* 이슈·공판·공안 모니터링 요약 + 공보 진입 */}
      <DashboardSections />
    </div>
  );
}
