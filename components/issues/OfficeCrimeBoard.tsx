"use client";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpDown, ExternalLink } from "lucide-react";
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

type SortKey = "score" | "count" | "date";

/** 특정 검찰청의 이슈를 한 화면 컴팩트 표로 보여주는 보기 */
export function OfficeCrimeBoard({ officeId, officeName, onBack }: { officeId: string; officeName: string; onBack: () => void }) {
  const [period, setPeriod] = useState<CalPeriod>("month");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "score", dir: "desc" });
  const range = useMemo(() => calendarRange(period), [period]);
  const { data, loading } = useApi<ArticleRow[]>(
    `/api/articles?officeId=${officeId}&startDate=${range.start.toISOString()}&endDate=${range.end.toISOString()}&limit=300`,
  );

  const rows = useMemo(() => {
    const list = dedupeArticles(data ?? []).map((d) => ({
      id: d.rep.id,
      title: d.rep.title.split(" - ")[0],
      url: d.rep.originalUrl,
      crime: d.rep.crimeType || d.rep.crimeSubtype || "기타",
      score: Math.round(d.rep.issueScore ?? 0),
      count: d.count,
      date: d.rep.publishedAt,
    }));
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      if (sort.key === "score") return (a.score - b.score) * dir || (new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sort.key === "count") return (a.count - b.count) * dir || b.score - a.score;
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir || b.score - a.score;
    });
  }, [data, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((p) => (p.key === key ? { key, dir: p.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  const Th = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <th className={cn("px-3 py-2 font-medium", className)}>
      <button onClick={() => toggleSort(k)} className={cn("inline-flex items-center gap-0.5 hover:text-ink-title", sort.key === k && "text-primary")}>
        {label} <ArrowUpDown className="h-3 w-3 opacity-60" />
      </button>
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 text-detail text-ink-muted hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> 검찰청별 보기
        </button>
        <span className="text-body-s font-bold text-ink-title">{officeName}</span>
        {!loading && <Badge tone="outline">{rows.length}건</Badge>}
        <span className="ml-auto flex rounded-md border border-line p-0.5">
          {(["today", "week", "month"] as const).map((v) => (
            <button key={v} onClick={() => setPeriod(v)} className={cn("rounded px-2 py-0.5 text-caption transition-colors", period === v ? "bg-primary font-medium text-white" : "text-ink-muted hover:text-ink-title")}>
              {v === "today" ? "오늘" : v === "week" ? "금주" : "금월"}
            </button>
          ))}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : !rows.length ? (
        <EmptyState title="해당 기간 이슈가 없습니다" desc="기간을 넓혀보세요." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-body-s">
                <thead>
                  <tr className="border-b border-line bg-gray-5 text-left text-detail text-ink-muted">
                    <Th k="score" label="파급도" className="text-right" />
                    <th className="px-3 py-2 font-medium">제목</th>
                    <th className="px-3 py-2 font-medium">범죄유형</th>
                    <Th k="count" label="기사" className="text-right" />
                    <Th k="date" label="최근일" className="text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-5">
                      <td className="px-3 py-2 text-right font-bold text-primary tabular-nums">{r.score}</td>
                      <td className="px-3 py-2">
                        <a href={r.url} target="_blank" rel="noreferrer" className="group inline-flex items-start gap-1 font-medium text-ink-title hover:text-primary">
                          <span className="hover:underline">{r.title}</span>
                          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                        </a>
                      </td>
                      <td className="px-3 py-2"><Badge tone="navy">{r.crime}</Badge></td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-body">{r.count}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-muted">{formatDate(r.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
