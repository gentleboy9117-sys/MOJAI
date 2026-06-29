"use client";
import { useMemo, useState } from "react";
import { ExternalLink, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { IssueSubNav } from "@/components/issues/IssueSubNav";
import { cn, formatDate } from "@/lib/utils";
import { pickDistinctTop } from "@/lib/client/dedupeSimilar";
import { calendarRange, type CalPeriod } from "@/lib/periodRange";
import { KoreaOfficeMap } from "@/components/issues/KoreaOfficeMap";

interface ArticleRow {
  id: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  originalUrl: string;
  primaryOfficeName?: string | null;
  crimeType?: string | null;
  issueClusterId?: string | null;
  issueScore: number;
}
interface HeatRow { officeName: string; issueCount: number; articleCount: number }

function rank(arr: string[]): { name: string; count: number }[] {
  const m = new Map<string, number>();
  arr.forEach((a) => a && m.set(a, (m.get(a) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}

function isRealUrl(url?: string | null): boolean {
  return !!url && /^https?:\/\//i.test(url) && !/(example|\.invalid|\/sample\/|localhost)/i.test(url);
}

function Periods({ value, onChange }: { value: CalPeriod; onChange: (p: CalPeriod) => void }) {
  return (
    <div className="flex rounded-md border border-line p-0.5">
      {(["today", "week", "month"] as const).map((v) => (
        <button key={v} onClick={() => onChange(v)} className={cn("rounded px-2 py-0.5 text-caption transition-colors", value === v ? "bg-primary font-medium text-white" : "text-ink-muted hover:text-ink-title")}>
          {v === "today" ? "금일" : v === "week" ? "금주" : "금월"}
        </button>
      ))}
    </div>
  );
}

/** 가로 막대 행 */
function BarRow({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const pct = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-36 shrink-0 truncate text-body-s text-ink-title sm:w-44">
        {label} <span className="text-ink-muted">({value})</span>
      </span>
      <div className="h-3.5 flex-1 overflow-hidden rounded bg-gray-5">
        <div className={cn("h-full rounded", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function IssueMonitoringPage() {
  const { data, loading } = useApi<ArticleRow[]>("/api/articles?period=all&limit=300&sort=score");
  const [pTop, setPTop] = useState<CalPeriod>("month");
  const [pOffice, setPOffice] = useState<CalPeriod>("month");
  const [pCrime, setPCrime] = useState<CalPeriod>("month");
  // 검찰청별 이슈 분포는 전국 전체 집계 API 사용(상위 300 샘플이 아닌 전수)
  const { data: heat } = useApi<HeatRow[]>(`/api/dashboard/office-heatmap?period=${pOffice}`);

  const rows = useMemo(() => data ?? [], [data]);
  const inRange = (period: CalPeriod) => {
    const r = calendarRange(period);
    const s = r.start.getTime(), e = r.end.getTime();
    return rows.filter((x) => { const t = new Date(x.publishedAt).getTime(); return t >= s && t <= e; });
  };

  const notable = useMemo(() => pickDistinctTop(inRange(pTop), 10), [rows, pTop]);
  const offices = useMemo(
    () => [...(heat ?? [])].map((h) => ({ name: h.officeName, count: h.issueCount })).filter((o) => o.count > 0).sort((a, b) => b.count - a.count),
    [heat],
  );
  const crimes = useMemo(() => rank(inRange(pCrime).map((r) => r.crimeType || "기타")), [rows, pCrime]);
  const crimeMax = crimes[0]?.count ?? 0;

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">이슈 모니터링</h1>
        <p className="text-body-s text-ink-muted">검찰 관련 주요 이슈 현황을 정리한 화면입니다.</p>
      </div>
      <IssueSubNav />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : !rows.length ? (
        <EmptyState icon={<LayoutDashboard className="h-8 w-8" />} title="수집된 이슈가 없습니다" desc="기사가 수집되면 집계됩니다." />
      ) : (
        <div className="space-y-4">
          {/* 주요 이슈 Top 10 */}
          <Card>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>주요 이슈 Top 10</CardTitle>
                <span className="mt-0.5 block text-detail text-ink-muted">파급도 = 보도량·출처 수·확산 속도 등으로 산정한 공개보도 영향력(0~100)</span>
              </div>
              <Periods value={pTop} onChange={setPTop} />
            </CardHeader>
            <CardContent className="p-0">
              {!notable.length ? (
                <p className="py-4 text-center text-body-s text-ink-muted">해당 기간 이슈가 없습니다.</p>
              ) : (
                <ul className="max-h-[300px] divide-y divide-line overflow-y-auto scrollbar-thin">
                  {notable.map((a, i) => (
                    <li key={a.id} className="flex items-start gap-3 px-3 py-1.5 hover:bg-gray-5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-caption font-bold text-white">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        {isRealUrl(a.originalUrl) ? (
                          <a href={a.originalUrl} target="_blank" rel="noreferrer" className="group flex items-start gap-1 text-body-s font-medium text-ink-title hover:text-primary">
                            <span className="line-clamp-1 hover:underline">{a.title.split(" - ")[0]}</span>
                            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-40 group-hover:opacity-100" />
                          </a>
                        ) : (
                          <span className="line-clamp-1 text-body-s font-medium text-ink-title">{a.title.split(" - ")[0]}</span>
                        )}
                        <p className="text-detail text-ink-muted">파급도 {a.issueScore} · {formatDate(a.publishedAt)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge tone="navy">{a.primaryOfficeName ?? "관할 미상"}</Badge>
                        <Badge tone="blue">{a.crimeType || "기타"}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* 검찰청별 이슈 분포(전국 지도) */}
          <Card>
            <CardHeader>
              <CardTitle>검찰청별 이슈 분포 (전국)</CardTitle>
              <Periods value={pOffice} onChange={setPOffice} />
            </CardHeader>
            <CardContent>
              <KoreaOfficeMap data={offices} />
              <p className="mt-2 text-detail text-ink-disabled">· 원의 크기·진하기 = 이슈 수. 검찰청 소재 도시 기준 집계(법무부/대검찰청 등 전국 단위 제외).</p>
            </CardContent>
          </Card>

          {/* 범죄유형 분류(전체) */}
          <Card>
            <CardHeader>
              <CardTitle>범죄유형 분류 (전체)</CardTitle>
              <Periods value={pCrime} onChange={setPCrime} />
            </CardHeader>
            <CardContent>
              {crimes.length ? (
                <div className="space-y-1.5">
                  {crimes.map((c) => <BarRow key={c.name} label={c.name} value={c.count} max={crimeMax} tone="bg-blue-60" />)}
                </div>
              ) : (
                <p className="text-body-s text-ink-muted">집계된 범죄유형이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
