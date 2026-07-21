"use client";
import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { dedupeArticles } from "@/lib/client/dedupeArticles";
import { calendarRange, type CalPeriod } from "@/lib/periodRange";

interface ArticleRow {
  id: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  originalUrl: string;
  crimeType?: string | null;
  crimeSubtype?: string | null;
  issueScore?: number | null;
}

/** 특정 검찰청 이슈를 '범죄유형 탭 + 목록(중복 묶음·링크)'으로 보여주는 보기 */
export function OfficeCrimeBoard({ officeId, officeName, onBack }: { officeId: string; officeName: string; onBack: () => void }) {
  const [period, setPeriod] = useState<CalPeriod>("month");
  const [picked, setPicked] = useState<string | null>(null);
  const range = useMemo(() => calendarRange(period), [period]);
  const { data, loading } = useApi<ArticleRow[]>(
    `/api/articles?officeId=${officeId}&startDate=${range.start.toISOString()}&endDate=${range.end.toISOString()}&limit=3000`,
  );

  // 범죄유형별 중복제거 묶음
  const groups = useMemo(() => {
    const byType = new Map<string, ArticleRow[]>();
    for (const r of data ?? []) {
      const t = r.crimeType || "기타";
      if (!byType.has(t)) byType.set(t, []);
      byType.get(t)!.push(r);
    }
    type Dedup = { rep: ArticleRow; sources: { sourceName: string; url: string }[]; count: number };
    const m = new Map<string, Dedup[]>();
    byType.forEach((arts, t) =>
      m.set(t, dedupeArticles(arts).sort((a, b) => (b.rep.issueScore ?? 0) - (a.rep.issueScore ?? 0) || new Date(b.rep.publishedAt).getTime() - new Date(a.rep.publishedAt).getTime())),
    );
    return m;
  }, [data]);

  const tabs = useMemo(
    () => [...groups.entries()].map(([type, list]) => ({ type, count: list.length })).sort((a, b) => b.count - a.count),
    [groups],
  );
  const active = (picked && groups.has(picked) ? picked : tabs[0]?.type) ?? null;
  const list = active ? groups.get(active) ?? [] : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 text-detail text-ink-muted hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> 검찰청별 보기
        </button>
        <span className="text-body-s font-bold text-ink-title">{officeName}</span>
        <span className="ml-auto flex rounded-md border border-line p-0.5">
          {(["today", "week", "month"] as const).map((v) => (
            <button key={v} onClick={() => setPeriod(v)} className={cn("rounded px-2 py-0.5 text-caption transition-colors", period === v ? "bg-primary font-medium text-white" : "text-ink-muted hover:text-ink-title")}>
              {v === "today" ? "금일" : v === "week" ? "금주" : "금월"}
            </button>
          ))}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : !tabs.length ? (
        <EmptyState title="해당 기간 이슈가 없습니다" desc="기간을 넓혀보세요." />
      ) : (
        <>
          {/* 범죄유형 탭 */}
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.type}
                onClick={() => setPicked(t.type)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-3 py-1 text-detail transition-colors",
                  active === t.type ? "border-primary bg-primary font-medium text-white" : "border-line text-ink-body hover:border-primary hover:text-primary",
                )}
              >
                {t.type} <span className={cn("tabular-nums", active === t.type ? "text-white/90" : "text-ink-disabled")}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* 선택 유형 이슈 목록(중복 묶음·링크) */}
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-line">
                {list.map((d) => (
                  <li key={d.rep.id} className="px-4 py-2.5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-md bg-blue-5 text-primary">
                        <span className="text-body-s font-bold leading-none">{Math.round(d.rep.issueScore ?? 0)}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <a href={d.rep.originalUrl} target="_blank" rel="noreferrer" className="group flex items-start gap-1.5 text-body-s font-medium text-ink-title hover:text-primary">
                          <span className="hover:underline">{d.rep.title.split(" - ")[0]}</span>
                          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                        </a>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-detail text-ink-muted">
                          <span>{d.rep.sourceName}{d.rep.publishedAt ? ` · ${formatDate(d.rep.publishedAt)}` : ""}</span>
                          {d.count > 1 && <span className="text-blue-60">· 동일 보도 {d.count}건</span>}
                        </p>
                        {d.count > 1 && (
                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                            {d.sources.map((s, i) => (
                              <a key={i} href={s.url} target="_blank" rel="noreferrer" className="text-detail text-blue-60 hover:underline">· {s.sourceName}</a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
