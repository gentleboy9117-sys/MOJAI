"use client";
import { useMemo, useState } from "react";
import { Building2, Gavel, ChevronRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { TrialSubNav } from "@/components/trials/TrialSubNav";
import { OFFICE_ORDER, HIGH_PROSECUTION_TREE } from "@/lib/publicSafety/assemblyJurisdictionClassifier";
import { dedupeArticles } from "@/lib/client/dedupeArticles";

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
  crimeSubtype?: string | null;
}

export default function TrialOfficesPage() {
  const { data: offices, loading: lo } = useApi<Office[]>("/api/offices");
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all">("30d");
  const { data, loading: la } = useApi<ArticleRow[]>(`/api/articles?crimeType=공판&period=${period}&limit=500`);
  const [selected, setSelected] = useState<string | null>(null);
  const loading = lo || la;

  // 검찰청별 공판 보도(중복 제거) 건수 + 주요 범죄유형 Top2
  const statsByOffice = useMemo(() => {
    const byOffice = new Map<string, ArticleRow[]>();
    for (const r of data ?? []) {
      const name = r.primaryOfficeName;
      if (!name) continue;
      if (!byOffice.has(name)) byOffice.set(name, []);
      byOffice.get(name)!.push(r);
    }
    const m = new Map<string, { count: number; top: { sub: string; n: number }[] }>();
    byOffice.forEach((arts, name) => {
      const deduped = dedupeArticles(arts);
      const subCount = new Map<string, number>();
      for (const d of deduped) {
        const s = d.rep.crimeSubtype;
        if (s && s !== "기타") subCount.set(s, (subCount.get(s) ?? 0) + 1);
      }
      const top = [...subCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([sub, n]) => ({ sub, n }));
      m.set(name, { count: deduped.length, top });
    });
    return m;
  }, [data]);

  // 트리 구성(이슈 검찰청별 보기와 동일 구조)
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
    () => [...statsByOffice.entries()].map(([name, s]) => ({ name, count: s.count, top: s.top })).sort((a, b) => b.count - a.count || ord(a.name) - ord(b.name)),
    [statsByOffice],
  );

  const selectedDeduped = useMemo(() => {
    if (!selected) return [];
    return dedupeArticles((data ?? []).filter((r) => r.primaryOfficeName === selected))
      .sort((a, b) => new Date(b.rep.publishedAt).getTime() - new Date(a.rep.publishedAt).getTime());
  }, [data, selected]);

  function OfficeRow({ o, indent }: { o: Office; indent: number }) {
    const st = statsByOffice.get(o.name);
    const c = st?.count ?? 0;
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
        {c > 0 ? (
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            <Badge tone="blue">공판 {c}</Badge>
            {st?.top.map((t) => <Badge key={t.sub} tone="outline">{t.sub} {t.n}</Badge>)}
          </span>
        ) : (
          <span className="text-detail text-ink-disabled">-</span>
        )}
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">검찰청별 보기</h1>
        <p className="text-body-s text-ink-muted">공판(선고) 보도 현황 및 순위 — 검찰청을 누르면 해당 청의 공판 보도가 표시됩니다 (공개 보도 기준)</p>
      </div>
      <TrialSubNav />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* 조직도 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-primary" /> 조직도</CardTitle>
                <span className="text-detail text-ink-muted">클릭시 해당 검찰청 공판 관련 기사로 이동</span>
              </CardHeader>
              <CardContent className="space-y-1">
                {!offices?.length ? (
                  <EmptyState title="검찰청 정보가 없습니다" desc="설정에서 검찰청 동기화를 실행하세요." />
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
                  {(["today", "7d", "30d", "all"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setPeriod(v)}
                      className={cn("rounded px-2 py-0.5 text-caption transition-colors", period === v ? "bg-primary font-medium text-white" : "text-ink-muted hover:text-ink-title")}
                    >
                      {v === "today" ? "오늘" : v === "7d" ? "지난 7일" : v === "30d" ? "지난 30일" : "전체"}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {!ranking.length ? (
                  <EmptyState title="집계된 공판 보도가 없습니다" />
                ) : (
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-body-s">
                      <thead>
                        <tr className="border-b border-line bg-gray-5 text-left text-detail text-ink-muted">
                          <th className="px-3 py-2 font-medium">순위</th>
                          <th className="px-3 py-2 font-medium">검찰청</th>
                          <th className="px-3 py-2 font-medium">주요 유형</th>
                          <th className="px-3 py-2 text-right font-medium">공판 보도</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {ranking.map((r, i) => (
                          <tr key={r.name} className={cn("cursor-pointer hover:bg-gray-5", selected === r.name && "bg-blue-5")} onClick={() => setSelected(r.name)}>
                            <td className="px-3 py-2 text-ink-disabled">{i + 1}</td>
                            <td className="px-3 py-2 font-medium text-ink-title hover:text-primary">{r.name}</td>
                            <td className="px-3 py-2 text-ink-muted">{r.top.length ? r.top.map((t) => `${t.sub} ${t.n}`).join(" · ") : "-"}</td>
                            <td className="px-3 py-2 text-right text-ink-body">{r.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 선택한 검찰청의 공판 보도 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5"><Gavel className="h-4 w-4 text-primary" /> {selected ? `${selected} 공판 보도` : "공판 보도"}</CardTitle>
              {selected && <Badge tone="outline">{selectedDeduped.length}건</Badge>}
            </CardHeader>
            <CardContent className={selected && selectedDeduped.length ? "p-0" : ""}>
              {!selected ? (
                <EmptyState icon={<Building2 className="h-8 w-8" />} title="검찰청을 선택하세요" desc="왼쪽 조직도 또는 순위에서 검찰청을 누르면 해당 청의 공판 보도가 표시됩니다." />
              ) : !selectedDeduped.length ? (
                <EmptyState icon={<Gavel className="h-8 w-8" />} title="공판 보도가 없습니다" />
              ) : (
                <ul className="divide-y divide-line">
                  {selectedDeduped.map((d) => (
                    <li key={d.rep.id} className="px-4 py-2.5">
                      <a href={d.rep.originalUrl} target="_blank" rel="noreferrer" className="group flex items-start gap-1.5 text-body-s font-medium text-ink-title hover:text-primary">
                        <span className="hover:underline">{d.rep.title.split(" - ")[0]}</span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                      </a>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-detail text-ink-muted">
                        {d.rep.crimeSubtype && <Badge tone="navy">{d.rep.crimeSubtype}</Badge>}
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
        </>
      )}
    </div>
  );
}
