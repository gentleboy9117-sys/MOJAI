"use client";
import { Suspense, useState } from "react";
import { Spinner } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { ReportGenerator } from "@/components/reports/ReportGenerator";

const BRIEFING_TABS = [
  { key: "issue", label: "이슈 브리핑" },
  { key: "trial", label: "공판 브리핑" },
  { key: "safety", label: "공안 브리핑" },
] as const;
type BriefingKey = (typeof BRIEFING_TABS)[number]["key"];

/** [공보] 브리핑 — 이슈/공판/공안 브리핑을 한 화면에서 선택 생성 */
export default function ReportsPage() {
  const [tab, setTab] = useState<BriefingKey>("issue");
  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">브리핑</h1>
        <p className="text-body-s text-ink-muted">
          수집된 자료를 바탕으로 이슈·공판·공안 브리핑 초안을 생성합니다
        </p>
      </div>
      <nav className="flex flex-wrap items-center gap-1 border-b border-line">
        {BRIEFING_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-body-s transition-colors",
              tab === t.key
                ? "border-primary font-bold text-primary"
                : "border-transparent text-ink-muted hover:text-ink-title",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        }
      >
        {/* key로 탭 전환 시 폼·결과 초기화 */}
        <ReportGenerator key={tab} mode={tab} />
      </Suspense>
    </div>
  );
}
