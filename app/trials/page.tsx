"use client";
import { useMemo, useState } from "react";
import { ExternalLink, Gavel } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { TrialSubNav } from "@/components/trials/TrialSubNav";
import { cn, formatDate } from "@/lib/utils";
import { pickDistinctTop } from "@/lib/client/dedupeSimilar";
import { calendarRange, type CalPeriod } from "@/lib/periodRange";
import { KoreaChoropleth } from "@/components/issues/KoreaChoropleth";

interface ArticleRow {
  id: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  originalUrl: string;
  summary?: string | null;
  primaryOfficeId?: string | null;
  primaryOfficeName?: string | null;
  primaryRegion?: string | null;
  crimeType?: string | null;
  crimeSubtype?: string | null;
  issueClusterId?: string | null;
  issueScore: number;
  issueLevel: string;
}

const BAR_COLOR = "rgb(0,34,84)";

function topCount(arr: string[], n: number): { name: string; count: number }[] {
  const m = new Map<string, number>();
  arr.forEach((a) => a && m.set(a, (m.get(a) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));
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

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = value > 0 && max > 0 ? Math.max(3, Math.round((Math.log(value + 1) / Math.log(max + 1)) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 truncate text-left text-body-s text-ink-title sm:w-36">{label} <span className="text-ink-muted">({value})</span></span>
      <div className="h-3.5 flex-1 overflow-hidden rounded bg-gray-5"><div className="h-full rounded" style={{ width: `${pct}%`, background: BAR_COLOR }} /></div>
    </div>
  );
}

export default function TrialMonitoringPage() {
  const { data, loading } = useApi<ArticleRow[]>("/api/articles?crimeType=공판&period=all&limit=300");
  const [pTop, setPTop] = useState<CalPeriod>("month");
  const [pOffice, setPOffice] = useState<CalPeriod>("month");
  const [pCrime, setPCrime] = useState<CalPeriod>("month");

  const rows = useMemo(() => data ?? [], [data]);
  const inRange = (period: CalPeriod) => {
    const r = calendarRange(period);
    const s = r.start.getTime(), e = r.end.getTime();
    return rows.filter((x) => { const t = new Date(x.publishedAt).getTime(); return t >= s && t <= e; });
  };

  const notable = useMemo(() => pickDistinctTop(inRange(pTop), 10), [rows, pTop]);
  const trialOffices = useMemo(() => topCount(inRange(pOffice).map((r) => r.primaryOfficeName ?? "").filter(Boolean), 999), [rows, pOffice]);
  const bySubtype = useMemo(() => topCount(inRange(pCrime).map((r) => r.crimeSubtype || "기타"), 99), [rows, pCrime]);
  const crimeMax = bySubtype[0]?.count ?? 0;

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">공판 모니터링</h1>
        <p className="text-body-s text-ink-muted">공판 관련 언론보도를 정리한 화면입니다.</p>
      </div>
      <TrialSubNav />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : !rows.length ? (
        <EmptyState icon={<Gavel className="h-8 w-8" />} title="공판 관련 보도가 없습니다" desc="공판 관련 기사가 수집되면 집계됩니다." />
      ) : (
        <div className="space-y-4">
          {/* 주요 사건 Top 10 — 좌우 5+5 */}
          <Card>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>주요 사건 Top 10</CardTitle>
                <span className="mt-0.5 block text-detail text-ink-muted">파급도 = 보도량·출처 수·확산 속도 등으로 산정한 공개보도 영향력(0~100)</span>
              </div>
              <Periods value={pTop} onChange={setPTop} />
            </CardHeader>
            <CardContent>
              {!notable.length ? (
                <p className="py-4 text-center text-body-s text-ink-muted">해당 기간 공판 보도가 없습니다.</p>
              ) : (
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {notable.map((a, i) => (
                    <div key={a.id} className="flex items-start gap-2 rounded px-1 py-1.5 hover:bg-gray-5">
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
                        <p className="mt-0.5 flex flex-wrap items-center gap-1 text-detail text-ink-muted">
                          <Badge tone="navy">{a.primaryOfficeName ?? "관할 미상"}</Badge>
                          <Badge tone="blue">{a.crimeSubtype || "기타"}</Badge>
                          <span>파급도 {a.issueScore}</span>
                          <span>· {formatDate(a.publishedAt)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* 검찰청별 분포(전국 지도) */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>검찰청별 분포 (전국)</CardTitle>
                <Periods value={pOffice} onChange={setPOffice} />
              </CardHeader>
              <CardContent>
                <KoreaChoropleth offices={trialOffices} />
              </CardContent>
            </Card>

            {/* 범죄유형 분류(막대) */}
            <Card>
              <CardHeader>
                <CardTitle>범죄유형 분류</CardTitle>
                <Periods value={pCrime} onChange={setPCrime} />
              </CardHeader>
              <CardContent>
                {bySubtype.length ? (
                  <div className="max-h-[400px] space-y-1 overflow-y-auto scrollbar-thin pr-1">
                    {bySubtype.map((s) => <BarRow key={s.name} label={s.name} value={s.count} max={crimeMax} />)}
                  </div>
                ) : (
                  <p className="text-body-s text-ink-muted">집계된 범죄유형이 없습니다.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
