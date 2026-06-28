"use client";
import { useState } from "react";
import { CalendarDays, RefreshCw, Building2, Newspaper, AlertTriangle, CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stat, Spinner } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { apiPost, getDevUser } from "@/lib/client/api";
import { AssemblyScheduleTable, type AssemblyRow } from "./AssemblyScheduleTable";
import { AssemblyEventDetailPanel } from "./AssemblyEventDetailPanel";
import { AssemblySourceStatusPanel } from "./AssemblySourceStatusPanel";
import { AssemblyNewsByOfficePanel } from "./AssemblyNewsByOfficePanel";

interface Summary {
  todayCount: number;
  tomorrowCount: number;
  byOfficeCount: number;
  withRelatedReportCount: number;
  legalIssueMentionCount: number;
  reviewNeededCount: number;
}

/** [공안] 대시보드 (사양 §9): 요약 카드 + 관할별 + 공개 일정 목록 + 상세 */
export function PublicSafetyDashboardPage() {
  const [collecting, setCollecting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const canAct = getDevUser().role !== "VIEWER";

  const summary = useApi<Summary>("/api/public-safety/dashboard/summary");
  const list = useApi<AssemblyRow[]>("/api/public-safety/assemblies?period=7d");

  async function collect() {
    setCollecting(true);
    try {
      await apiPost("/api/public-safety/assemblies/collect", {});
      summary.refetch();
      list.refetch();
    } finally {
      setCollecting(false);
    }
  }

  const s = summary.data;

  return (
    <div className="space-y-5">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="오늘 공개 집회" value={summary.loading ? "…" : (s?.todayCount ?? 0)} sub="공개 일정 정보" />
        <Stat label="내일 예정" value={summary.loading ? "…" : (s?.tomorrowCount ?? 0)} sub="공개 일정 정보" />
        <Stat label="관할(추정) 검찰청" value={summary.loading ? "…" : (s?.byOfficeCount ?? 0)} sub="곳" />
        <Stat label="관련 보도 있는 일정" value={summary.loading ? "…" : (s?.withRelatedReportCount ?? 0)} sub="공개 보도" />
        <Stat
          label="법적 이슈 언급"
          value={summary.loading ? "…" : (s?.legalIssueMentionCount ?? 0)}
          sub="가능성 언급(확정 아님)"
          tone="text-[#9a6a00]"
        />
        <Stat
          label="검토 필요"
          value={summary.loading ? "…" : (s?.reviewNeededCount ?? 0)}
          sub="담당자 확인"
          tone="text-danger"
        />
      </div>

      {/* 출처별 수집 현황 · 정보 반영 시각 */}
      <AssemblySourceStatusPanel />

      {/* 공개 일정 목록 + 상세 */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-primary" /> 공개 집회·시위 일정 (향후 7일)
            </CardTitle>
            {canAct && (
              <Button size="sm" variant="secondary" onClick={collect} disabled={collecting}>
                {collecting ? <Spinner /> : <RefreshCw className="h-4 w-4" />} 공개 일정 수집
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {list.loading ? (
              <div className="py-8 text-center">
                <Spinner />
              </div>
            ) : (
              <AssemblyScheduleTable
                rows={list.data ?? []}
                selectedId={selected}
                onSelect={setSelected}
              />
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[400px]">
          <CardContent className="p-0">
            {selected ? (
              <AssemblyEventDetailPanel
                assemblyId={selected}
                onReviewed={() => {
                  summary.refetch();
                  list.refetch();
                }}
              />
            ) : (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 p-6 text-center text-ink-disabled">
                <CalendarDays className="h-8 w-8" />
                <p className="text-body-s">
                  위 표에서 공개 일정을 선택하면
                  <br />
                  상세 정보·관할 추정·관련 보도가 표시됩니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 집회·시위 / 선거 / 노동·중대재해 보도 (관할별) */}
      <AssemblyNewsByOfficePanel kind="assembly" title="집회·시위 보도" />
      <AssemblyNewsByOfficePanel kind="election" title="선거 보도" />
      <AssemblyNewsByOfficePanel kind="labor" title="노동·중대재해 보도" />
    </div>
  );
}
