"use client";
import { useMemo, useState } from "react";
import { Building2, Gavel, ChevronRight, ExternalLink, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { TrialSubNav } from "@/components/trials/TrialSubNav";
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
  crimeSubtype?: string | null;
}

export default function TrialOfficesPage() {
  const { data: offices, loading: lo } = useApi<Office[]>("/api/offices");
  const [period, setPeriod] = useState<CalPeriod>("month");
  const range = useMemo(() => calendarRange(period), [period]);
  const { data, loading: la } = useApi<ArticleRow[]>(`/api/articles?crimeType=공판&startDate=${range.start.toISOString()}&endDate=${range.end.toISOString()}&limit=3000`);
  // 동기간 대비용 전기간 데이터(건수만)
  const { data: prevData } = useApi<ArticleRow[]>(`/api/articles?crimeType=공판&startDate=${range.prevStart.toISOString()}&endDate=${range.prevEnd.toISOString()}&limit=3000`);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const [showAllRank, setShowAllRank] = useState(false);
  const [rankQuery, setRankQuery] = useState("");
  const RANK_PREVIEW = 8;
  const loading = lo || la;

  const prevCountByOffice = useMemo(() => {
    const byOffice = new Map<string, ArticleRow[]>();
    for (const r of prevData ?? []) {
      const name = r.primaryOfficeName;
      if (!name) continue;
      if (!byOffice.has(name)) byOffice.set(name, []);
      byOffice.get(name)!.push(r);
    }
    const m = new Map<string, number>();
    byOffice.forEach((arts, name) => m.set(name, dedupeArticles(arts).length));
    return m;
  }, [prevData]);

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
    () => [...statsByOffice.entries()].map(([name, s]) => ({ name, count: s.count, top: s.top, delta: s.count - (prevCountByOffice.get(name) ?? 0) })).sort((a, b) => b.count - a.count || ord(a.name) - ord(b.name)),
    [statsByOffice, prevCountByOffice],
  );

  // 선택 청의 자손 청 이름(고검 → 산하 지검·지청) — 조직 순서
  const selectedNames = useMemo(() => {
    if (!selected) return [] as string[];
    const list = offices ?? [];
    const me = list.find((o) => o.name === selected);
    if (!me) return [selected];
    const out = [me.name];
    if (me.type === "고등검찰청" || me.type === "법무부/대검찰청") {
      for (const d of list.filter((o) => o.type === "지방검찰청" && o.parentId === me.id).sort((a, b) => ord(a.name) - ord(b.name))) {
        out.push(d.name);
        for (const b of list.filter((o) => o.type === "지청" && o.parentId === d.id).sort((a, b) => ord(a.name) - ord(b.name))) out.push(b.name);
      }
    } else if (me.type === "지방검찰청") {
      for (const b of list.filter((o) => o.type === "지청" && o.parentId === me.id).sort((a, b) => ord(a.name) - ord(b.name))) out.push(b.name);
    }
    return out;
  }, [selected, offices]);

  // 자손 포함 + 청별 그룹 — 고검 클릭 시 지검·지청별 분류 표시
  const selectedGroups = useMemo(() => {
    if (!selected) return [];
    const nameSet = new Set(selectedNames);
    const rows = (data ?? []).filter((r) => r.primaryOfficeName && nameSet.has(r.primaryOfficeName));
    const byName = new Map<string, ArticleRow[]>();
    for (const r of rows) { const n = r.primaryOfficeName!; if (!byName.has(n)) byName.set(n, []); byName.get(n)!.push(r); }
    return selectedNames.filter((n) => byName.has(n)).map((n) => ({
      name: n,
      list: dedupeArticles(byName.get(n)!).sort((a, b) => new Date(b.rep.publishedAt).getTime() - new Date(a.rep.publishedAt).getTime()),
    }));
  }, [data, selected, selectedNames]);
  const selectedDeduped = useMemo(() => selectedGroups.flatMap((g) => g.list), [selectedGroups]);

  // 조직도 롤업: 부모(고검·지검)는 산하 공판 보도 합계를 표시
  const aggCount = (o: Office): number => {
    const own = statsByOffice.get(o.name)?.count ?? 0;
    if (o.type === "고등검찰청") { let s = own; for (const d of tree.districtsByParent(o.id)) { s += statsByOffice.get(d.name)?.count ?? 0; for (const b of tree.branchesByParent(d.id)) s += statsByOffice.get(b.name)?.count ?? 0; } return s; }
    if (o.type === "지방검찰청") { let s = own; for (const b of tree.branchesByParent(o.id)) s += statsByOffice.get(b.name)?.count ?? 0; return s; }
    return own;
  };
  const total = useMemo(() => ranking.reduce((s, r) => s + r.count, 0), [ranking]);

  const PeriodToggle = () => (
    <div className="flex rounded-md border border-line p-0.5">
      {(["today", "week", "month"] as const).map((v) => (
        <button key={v} onClick={() => setPeriod(v)} className={cn("rounded px-2 py-0.5 text-caption transition-colors", period === v ? "bg-primary font-medium text-white" : "text-ink-muted hover:text-ink-title")}>
          {v === "today" ? "금일" : v === "week" ? "금주" : "금월"}
        </button>
      ))}
    </div>
  );

  function OfficeRow({ o, indent }: { o: Office; indent: number }) {
    const st = statsByOffice.get(o.name);
    const c = aggCount(o);
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
        <p className="text-body-s text-ink-muted">언론기사 중 공판 관련 보도를 검찰청 관할별로 정리합니다. 검찰청을 누르면 해당 청 보도가 표시됩니다.</p>
      </div>
      <TrialSubNav />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : selected ? (
        <Card>
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-detail text-ink-muted hover:text-primary">
              <ArrowLeft className="h-4 w-4" /> 검찰청별 보기
            </button>
            <span className="flex items-center gap-1.5 text-body-s font-bold text-ink-title">
              <Gavel className="h-4 w-4 text-primary" /> {selected} 공판 보도
            </span>
            <span className="ml-auto"><Badge tone="outline">{selectedDeduped.length}건</Badge></span>
          </div>
          <CardContent className="p-0">
            {!selectedDeduped.length ? (
              <EmptyState icon={<Gavel className="h-8 w-8" />} title="공판 보도가 없습니다" />
            ) : (
              <ul className="divide-y divide-line">
                {selectedGroups.map((g) => [
                  selectedGroups.length > 1 ? (
                    <li key={`h-${g.name}`} className="flex items-center gap-2 bg-gray-5 px-4 py-1.5">
                      <span className="text-detail font-bold text-ink-title">{g.name}</span>
                      <Badge tone="blue">{g.list.length}건</Badge>
                    </li>
                  ) : null,
                  ...g.list.map((d) => (
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
                  )),
                ])}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
            {/* 조직도 */}
            <Card>
              <CardHeader className="flex-wrap gap-2">
                <CardTitle className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-primary" /> 조직도 <Badge tone="outline">총 {total}건</Badge></CardTitle>
                <PeriodToggle />
                <span className="basis-full text-detail text-ink-muted">클릭시 해당 검찰청 공판 관련 기사로 이동</span>
              </CardHeader>
              <CardContent className="space-y-1">
                {!offices?.length ? (
                  <EmptyState title="검찰청 정보가 없습니다" desc="설정에서 검찰청 동기화를 실행하세요." />
                ) : (
                  <>
                    {tree.daegeom.map((o) => <OfficeRow key={o.id} o={o} indent={0} />)}
                    {tree.highs.map((h) => {
                      const isOpen = open.has(h.id);
                      const hc = aggCount(h);
                      return (
                        <div key={h.id}>
                          {/* 고검 행 전체 클릭 = 산하 펼치기(화면 이동 없음). 고검 상세는 우측 순위표에서 진입 */}
                          <button onClick={() => toggle(h.id)} className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-gray-5">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-ink-disabled transition-transform", isOpen && "rotate-90")} />
                              <span className="truncate text-body-s font-medium text-ink-title">{h.name}</span>
                            </span>
                            {hc > 0 ? <Badge tone="blue">공판 {hc}</Badge> : <span className="text-detail text-ink-disabled">-</span>}
                          </button>
                          {isOpen && tree.districtsByParent(h.id).map((d) => (
                            <div key={d.id}>
                              <OfficeRow o={d} indent={1} />
                              {tree.branchesByParent(d.id).map((b) => <OfficeRow key={b.id} o={b} indent={2} />)}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {tree.orphanDistricts.map((d) => (
                      <div key={d.id}>
                        <OfficeRow o={d} indent={0} />
                        {tree.branchesByParent(d.id).map((b) => <OfficeRow key={b.id} o={b} indent={1} />)}
                      </div>
                    ))}
                    <p className="px-2 pt-1 text-detail text-ink-disabled">· 고검을 누르면 산하 지검·지청이 펼쳐집니다</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 검찰청 순위 */}
            <Card>
              <CardHeader className="flex-wrap gap-2">
                <CardTitle className="flex items-center gap-1.5">검찰청 순위 <Badge tone="outline">총 {total}건</Badge></CardTitle>
                <input
                  value={rankQuery}
                  onChange={(e) => setRankQuery(e.target.value)}
                  placeholder="검찰청 검색 (예: 성남)"
                  className="min-w-0 flex-1 rounded-md border border-line px-2 py-1 text-detail outline-none focus:border-primary"
                />
                <PeriodToggle />
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
                          <th className="px-3 py-2 text-right font-medium">{DELTA_LABEL[period]}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {(() => {
                          const ranked = ranking.map((r, i) => ({ ...r, rank: i + 1 }));
                          const q = rankQuery.trim();
                          const rows = q ? ranked.filter((r) => r.name.includes(q)) : (showAllRank ? ranked : ranked.slice(0, RANK_PREVIEW));
                          if (q && !rows.length) return <tr><td colSpan={5} className="px-3 py-4 text-center text-detail text-ink-disabled">‘{q}’ 검색 결과가 없습니다(해당 기간 공판 보도 없음).</td></tr>;
                          return rows.map((r) => (
                            <tr key={r.name} className={cn("cursor-pointer hover:bg-gray-5", selected === r.name && "bg-blue-5")} onClick={() => setSelected(r.name)}>
                              <td className="px-3 py-2 tabular-nums text-ink-disabled">{r.rank}</td>
                              <td className="px-3 py-2 font-medium text-ink-title hover:text-primary">{r.name}</td>
                              <td className="px-3 py-2 text-ink-muted">{r.top.length ? r.top.map((t) => `${t.sub} ${t.n}`).join(" · ") : "-"}</td>
                              <td className="px-3 py-2 text-right text-ink-body">{r.count}</td>
                              <td className={cn("px-3 py-2 text-right font-medium tabular-nums", r.delta > 0 ? "text-danger" : r.delta < 0 ? "text-blue-60" : "text-ink-disabled")}>
                                {r.delta > 0 ? `+${r.delta}` : r.delta}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                    {!rankQuery.trim() && ranking.length > RANK_PREVIEW && (
                      <button onClick={() => setShowAllRank((v) => !v)} className="flex w-full items-center justify-center gap-1 border-t border-line py-2 text-detail font-medium text-blue-60 hover:bg-gray-5">
                        {showAllRank ? "접기" : `더보기 (+${ranking.length - RANK_PREVIEW})`}
                        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showAllRank ? "-rotate-90" : "rotate-90")} />
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
      )}
    </div>
  );
}
