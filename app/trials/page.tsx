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
  const topOffices = useMemo(() => topCount(inRange(pOffice).map((r) => r.primaryOfficeName ?? "").filter(Boolean), 5), [rows, pOffice]);
  const bySubtype = useMemo(() => topCount(inRange(pCrime).map((r) => r.crimeSubtype || "기타"), 99), [rows, pCrime]);

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="flex items-center gap-2 text-heading-m text-ink-title">
          <Gavel className="h-5 w-5 text-primary" /> 공판 모니터링
        </h1>
        <p className="text-body-s text-ink-muted">공판(선고) 보도 현황 요약 (공개 보도 기준)</p>
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
          {/* 주요 사건 Top 10 */}
          <Card>
            <CardHeader>
              <CardTitle>주요 사건 Top 10 (파급도 순)</CardTitle>
              <Periods value={pTop} onChange={setPTop} />
            </CardHeader>
            <CardContent className="space-y-2">
              {!notable.length ? (
                <p className="py-4 text-center text-body-s text-ink-muted">해당 기간 공판 보도가 없습니다.</p>
              ) : (
                notable.map((a, i) => (
                  <div key={a.id} className="rounded-md border border-line bg-white p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone="solid">{i + 1}</Badge>
                      <Badge tone="navy">{a.primaryOfficeName ?? "관할 미상"}</Badge>
                      <Badge tone="blue">{a.crimeSubtype || "기타"}</Badge>
                      <span className="text-detail text-ink-muted">파급도 {a.issueScore}/100 · {formatDate(a.publishedAt)}</span>
                    </div>
                    <p className="line-clamp-2 text-body-s font-medium text-ink-title">{a.title.split(" - ")[0]}</p>
                    {isRealUrl(a.originalUrl) ? (
                      <a href={a.originalUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-detail font-medium text-blue-60 hover:underline">
                        원문 보기 <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="mt-1 inline-block text-detail text-ink-disabled">원문 링크 없음(샘플)</span>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 상위 검찰청 Top 5 */}
          <Card>
            <CardHeader>
              <CardTitle>상위 검찰청 Top 5</CardTitle>
              <Periods value={pOffice} onChange={setPOffice} />
            </CardHeader>
            <CardContent>
              {topOffices.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {topOffices.map((o) => (
                    <Badge key={o.name} tone="navy">{o.name} {o.count}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-body-s text-ink-muted">집계된 검찰청이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 범죄유형 분류 */}
          <Card>
            <CardHeader>
              <CardTitle>범죄유형 분류</CardTitle>
              <Periods value={pCrime} onChange={setPCrime} />
            </CardHeader>
            <CardContent>
              {bySubtype.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {bySubtype.map((s) => (
                    <Badge key={s.name} tone="blue">{s.name} {s.count}</Badge>
                  ))}
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
