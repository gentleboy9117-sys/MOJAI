"use client";
import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { dedupeArticles } from "@/lib/client/dedupeArticles";

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

type Period = "today" | "7d" | "30d" | "all";

/** 특정 검찰청의 이슈를 파급도/최신순 단일 목록으로 보여주는 보기 */
export function OfficeCrimeBoard({ officeId, officeName, onBack }: { officeId: string; officeName: string; onBack: () => void }) {
  const [period, setPeriod] = useState<Period>("30d");
  const [sort, setSort] = useState<"score" | "recent">("score");
  const { data, loading } = useApi<ArticleRow[]>(`/api/articles?officeId=${officeId}&period=${period}&limit=300`);

  const items = useMemo(() => {
    const deduped = dedupeArticles(data ?? []);
    return [...deduped].sort((a, b) =>
      sort === "score"
        ? (b.rep.issueScore ?? 0) - (a.rep.issueScore ?? 0) || new Date(b.rep.publishedAt).getTime() - new Date(a.rep.publishedAt).getTime()
        : new Date(b.rep.publishedAt).getTime() - new Date(a.rep.publishedAt).getTime(),
    );
  }, [data, sort]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 text-detail text-ink-muted hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> 검찰청별 보기
        </button>
        <span className="text-body-s font-bold text-ink-title">{officeName}</span>
        {!loading && <Badge tone="outline">{items.length}건</Badge>}
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-md border border-line p-0.5">
            {(["today", "7d", "30d", "all"] as const).map((v) => (
              <button key={v} onClick={() => setPeriod(v)} className={cn("rounded px-2 py-0.5 text-caption transition-colors", period === v ? "bg-primary font-medium text-white" : "text-ink-muted hover:text-ink-title")}>
                {v === "today" ? "오늘" : v === "7d" ? "지난 7일" : v === "30d" ? "지난 30일" : "전체"}
              </button>
            ))}
          </div>
          <div className="flex rounded-md border border-line p-0.5">
            {(["score", "recent"] as const).map((v) => (
              <button key={v} onClick={() => setSort(v)} className={cn("rounded px-2 py-0.5 text-caption transition-colors", sort === v ? "bg-primary font-medium text-white" : "text-ink-muted hover:text-ink-title")}>
                {v === "score" ? "파급도순" : "최신순"}
              </button>
            ))}
          </div>
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : !items.length ? (
        <EmptyState title="해당 기간 이슈가 없습니다" desc="기간을 넓혀보세요." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-line">
              {items.map((d) => (
                <li key={d.rep.id} className="px-4 py-3 hover:bg-gray-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md bg-blue-5 text-primary">
                      <span className="text-body-s font-bold leading-none">{Math.round(d.rep.issueScore ?? 0)}</span>
                      <span className="text-[9px] leading-none text-ink-disabled">파급도</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <a href={d.rep.originalUrl} target="_blank" rel="noreferrer" className="group flex items-start gap-1.5 text-body-s font-medium text-ink-title hover:text-primary">
                        <span className="hover:underline">{d.rep.title.split(" - ")[0]}</span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                      </a>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-detail text-ink-muted">
                        {(d.rep.crimeType || d.rep.crimeSubtype) && <Badge tone="navy">{d.rep.crimeType || d.rep.crimeSubtype}</Badge>}
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
      )}
    </div>
  );
}
