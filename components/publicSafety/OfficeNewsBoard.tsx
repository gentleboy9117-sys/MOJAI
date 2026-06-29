"use client";
import { useMemo, useState } from "react";
import { Building2, ChevronRight, ExternalLink, Newspaper, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { OFFICE_ORDER, HIGH_PROSECUTION_TREE } from "@/lib/publicSafety/assemblyJurisdictionClassifier";
import { dedupeArticles } from "@/lib/client/dedupeArticles";
import { calendarRange, DELTA_LABEL, type CalPeriod } from "@/lib/periodRange";

const HIGH_ORDER: Record<string, number> = Object.fromEntries(HIGH_PROSECUTION_TREE.map((g, i) => [g.high, i]));
const ord = (name: string) => OFFICE_ORDER[name] ?? 9999;

interface Office { id: string; name: string; type: string; region: string; parentId: string | null }
interface ArticleRow {
  id: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  originalUrl: string;
  primaryOfficeName?: string | null;
  crimeType?: string | null;
  crimeSubtype?: string | null;
}

/** 검찰청 관할별 보도 보기 — 이슈/공판 '검찰청별 보기'와 동일 형식([조직도 | 순위 | 선택 청 기사]) */
export function OfficeNewsBoard({ baseUrl, countLabel = "보도", clickHint = "클릭 시 해당 검찰청 보도" }: { baseUrl: string; countLabel?: string; clickHint?: string }) {
  const { data: offices, loading: lo } = useApi<Office[]>("/api/offices");
  const [period, setPeriod] = useState<CalPeriod>("month");
  const range = useMemo(() => calendarRange(period), [period]);
  const sep = baseUrl.includes("?") ? "&" : "?";
  const { data, loading: la } = useApi<ArticleRow[]>(`${baseUrl}${sep}startDate=${range.start.toISOString()}&endDate=${range.end.toISOString()}`);
  // 동기간 대비용 전기간 데이터(건수만 사용)
  const { data: prevData } = useApi<ArticleRow[]>(`${baseUrl}${sep}startDate=${range.prevStart.toISOString()}&endDate=${range.prevEnd.toISOString()}`);
  const [selected, setSelected] = useState<string | null>(null);
  const loading = lo || la;

  const dedupCountMap = (rows: ArticleRow[] | null | undefined) => {
    const byOffice = new Map<string, ArticleRow[]>();
    for (const r of rows ?? []) {
      const name = r.primaryOfficeName;
      if (!name) continue;
      if (!byOffice.has(name)) byOffice.set(name, []);
      byOffice.get(name)!.push(r);
    }
    const m = new Map<string, number>();
    byOffice.forEach((arts, name) => m.set(name, dedupeArticles(arts).length));
    return m;
  };
  const countByOffice = useMemo(() => dedupCountMap(data), [data]);
  const prevCountByOffice = useMemo(() => dedupCountMap(prevData), [prevData]);

  const tree = useMemo(() => {
    const list = offices ?? [];
    const daegeom = list.filter((o) => o.type === "법무부/대검찰청" || o.type === "법무부" || o.type === "대검찰청").sort((a, b) => ord(a.name) - ord(b.name));
    const highs = list.filter((o) => o.type === "고등검찰청").sort((a, b) => (HIGH_ORDER[a.name] ?? 99) - (HIGH_ORDER[b.name] ?? 99));
    const districts = list.filter((o) => o.type === "지방검찰청");
    const branches = list.filter((o) => o.type === "지청");
    const branchesByParent = (id: string) => branches.filter((b) => b.parentId === id).sort((a, b) => ord(a.name) - ord(b.name));
    const districtsByParent = (id: string) => districts.filter((d) => d.parentId === id).sort((a, b) => ord(a.name) - ord(b.name));
    const orphanDistricts = districts.filter((d) => !d.parentId || !highs.some((h) => h.id === d.parentId)).sort((a, b) => ord(a.name) - ord(b.name));
    return { daegeom, highs, districtsByParent, branchesByParent, orphanDistricts };
  }, [offices]);

  const ranking = useMemo(
    () => [...countByOffice.entries()].map(([name, count]) => ({ name, count, delta: count - (prevCountByOffice.get(name) ?? 0) })).sort((a, b) => b.count - a.count || ord(a.name) - ord(b.name)),
    [countByOffice, prevCountByOffice],
  );

  const selectedDeduped = useMemo(() => {
    if (!selected) return [];
    return dedupeArticles((data ?? []).filter((r) => r.primaryOfficeName === selected))
      .sort((a, b) => new Date(b.rep.publishedAt).getTime() - new Date(a.rep.publishedAt).getTime());
  }, [data, selected]);

  function OfficeRow({ o, indent }: { o: Office; indent: number }) {
    const c = countByOffice.get(o.name) ?? 0;
    return (
      <button
        onClick={() => c > 0 && setSelected(o.name)}
        disabled={c === 0}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left",
          c > 0 ? "hover:bg-gray-5" : "cursor-default opacity-60",
          selected === o.name && "bg-blue-5",
        )}
        style={{ paddingLeft: 8 + indent * 16 }}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <ChevronRight className="h-3 w-3 shrink-0 text-ink-disabled" />
          <span className="truncate text-body-s text-ink-title">{o.name}</span>
        </span>
        {c > 0 ? <Badge tone="blue">{countLabel} {c}</Badge> : <span className="text-detail text-ink-disabled">-</span>}
      </button>
    );
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>;

  if (selected) {
    return (
      <Card>
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-detail text-ink-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> 목록으로
          </button>
          <span className="flex items-center gap-1.5 text-body-s font-bold text-ink-title">
            <Newspaper className="h-4 w-4 text-primary" /> {selected} {countLabel}
          </span>
          <span className="ml-auto"><Badge tone="outline">{selectedDeduped.length}건</Badge></span>
        </div>
        <CardContent className="p-0">
          {!selectedDeduped.length ? (
            <EmptyState icon={<Newspaper className="h-8 w-8" />} title="보도가 없습니다" />
          ) : (
            <ul className="divide-y divide-line">
              {selectedDeduped.map((d) => (
                <li key={d.rep.id} className="px-4 py-2.5">
                  <a href={d.rep.originalUrl} target="_blank" rel="noreferrer" className="group flex items-start gap-1.5 text-body-s font-medium text-ink-title hover:text-primary">
                    <span className="hover:underline">{d.rep.title.split(" - ")[0]}</span>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                  </a>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-detail text-ink-muted">
                    {(d.rep.crimeSubtype || d.rep.crimeType) && <Badge tone="navy">{d.rep.crimeSubtype || d.rep.crimeType}</Badge>}
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
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
        {/* 조직도 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-primary" /> 조직도</CardTitle>
            <span className="text-detail text-ink-muted">{clickHint}</span>
          </CardHeader>
          <CardContent className="space-y-1">
            {!offices?.length ? (
              <EmptyState title="검찰청 정보가 없습니다" />
            ) : (
              <>
                {tree.daegeom.map((o) => <OfficeRow key={o.id} o={o} indent={0} />)}
                {tree.highs.map((h) => (
                  <div key={h.id}>
                    <OfficeRow o={h} indent={0} />
                    {tree.districtsByParent(h.id).map((d) => (
                      <div key={d.id}>
                        <OfficeRow o={d} indent={1} />
                        {tree.branchesByParent(d.id).map((b) => <OfficeRow key={b.id} o={b} indent={2} />)}
                      </div>
                    ))}
                  </div>
                ))}
                {tree.orphanDistricts.map((d) => (
                  <div key={d.id}>
                    <OfficeRow o={d} indent={0} />
                    {tree.branchesByParent(d.id).map((b) => <OfficeRow key={b.id} o={b} indent={1} />)}
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* 검찰청 순위 */}
        <Card>
          <CardHeader>
            <CardTitle>검찰청 순위</CardTitle>
            <div className="flex rounded-md border border-line p-0.5">
              {(["today", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setPeriod(v)}
                  className={cn("rounded px-2 py-0.5 text-caption transition-colors", period === v ? "bg-primary font-medium text-white" : "text-ink-muted hover:text-ink-title")}
                >
                  {v === "today" ? "금일" : v === "week" ? "금주" : "금월"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!ranking.length ? (
              <EmptyState title="집계된 보도가 없습니다" />
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-body-s">
                  <thead>
                    <tr className="border-b border-line bg-gray-5 text-left text-detail text-ink-muted">
                      <th className="px-3 py-2 font-medium">순위</th>
                      <th className="px-3 py-2 font-medium">검찰청</th>
                      <th className="px-3 py-2 text-right font-medium">{countLabel}</th>
                      <th className="px-3 py-2 text-right font-medium">{DELTA_LABEL[period]}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {ranking.map((r, i) => (
                      <tr key={r.name} className={cn("cursor-pointer hover:bg-gray-5", selected === r.name && "bg-blue-5")} onClick={() => setSelected(r.name)}>
                        <td className="px-3 py-2 text-ink-disabled">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-ink-title hover:text-primary">{r.name}</td>
                        <td className="px-3 py-2 text-right text-ink-body">{r.count}</td>
                        <td className={cn("px-3 py-2 text-right font-medium tabular-nums", r.delta > 0 ? "text-danger" : r.delta < 0 ? "text-blue-60" : "text-ink-disabled")}>
                          {r.delta > 0 ? `+${r.delta}` : r.delta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
