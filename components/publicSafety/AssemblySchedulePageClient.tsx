"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { apiPost, getDevUser } from "@/lib/client/api";
import { AssemblyScheduleTable, type AssemblyRow } from "./AssemblyScheduleTable";
import { AssemblyEventDetailPanel } from "./AssemblyEventDetailPanel";

/** [공안] 집회·시위 개요 — 선택 날짜 기준 표 + 상세 */
export function AssemblySchedulePageClient({ date }: { date: string }) {
  const sp = useSearchParams();
  const officeId = sp.get("officeId") || "";
  const [needsReview, setNeedsReview] = useState(false);
  const [selected, setSelected] = useState<string | null>(sp.get("assembly"));
  const [collecting, setCollecting] = useState(false);
  const canAct = getDevUser().role !== "VIEWER";

  // ?assembly= 로 진입 시 선택 동기화
  useEffect(() => {
    const a = sp.get("assembly");
    if (a) setSelected(a);
  }, [sp]);

  const listUrl = useMemo(() => {
    const p = new URLSearchParams();
    p.set("date", date);
    if (officeId) p.set("officeId", officeId);
    if (needsReview) p.set("needsReview", "true");
    return `/api/public-safety/assemblies?${p.toString()}`;
  }, [date, officeId, needsReview]);

  const { data, loading, refetch } = useApi<AssemblyRow[]>(listUrl);

  async function collect() {
    setCollecting(true);
    try {
      await apiPost("/api/public-safety/assemblies/collect", {});
      refetch();
    } finally {
      setCollecting(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
      <Card>
        <CardHeader className="flex-wrap gap-2">
          <CardTitle className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-primary" /> 집회·시위 개요
            <span className="text-detail font-normal text-ink-muted">{data?.length ?? 0}건</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-detail text-ink-body">
              <input
                type="checkbox"
                checked={needsReview}
                onChange={(e) => setNeedsReview(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-line-strong text-primary focus:ring-ring"
              />
              검토 필요만
            </label>
            {canAct && (
              <Button size="sm" variant="secondary" onClick={collect} disabled={collecting}>
                {collecting ? <Spinner /> : <RefreshCw className="h-4 w-4" />} 수집
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 text-center">
              <Spinner />
            </div>
          ) : (
            <AssemblyScheduleTable rows={data ?? []} selectedId={selected} onSelect={setSelected} />
          )}
        </CardContent>
      </Card>

      <Card className="min-h-[400px]">
        <CardContent className="p-0">
          {selected ? (
            <AssemblyEventDetailPanel assemblyId={selected} onReviewed={refetch} />
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 p-6 text-center text-ink-disabled">
              <CalendarDays className="h-8 w-8" />
              <p className="text-body-s">
                왼쪽 표에서 공개 일정을 선택하면
                <br />
                상세 정보가 표시됩니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
