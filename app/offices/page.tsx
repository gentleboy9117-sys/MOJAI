"use client";
import { useMemo, useState } from "react";
import { Building2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { IssueSubNav } from "@/components/issues/IssueSubNav";
import { OfficeCrimeBoard } from "@/components/issues/OfficeCrimeBoard";
import { OFFICE_ORDER, HIGH_PROSECUTION_TREE } from "@/lib/publicSafety/assemblyJurisdictionClassifier";
import { DELTA_LABEL, type CalPeriod } from "@/lib/periodRange";

// 고검 정렬 순서(서울→수원→대전→대구→부산→광주)
const HIGH_ORDER: Record<string, number> = Object.fromEntries(
  HIGH_PROSECUTION_TREE.map((g, i) => [g.high, i]),
);
const ord = (name: string) => OFFICE_ORDER[name] ?? 9999;

interface Office {
  id: string;
  name: string;
  type: string;
  region: string;
  parentId: string | null;
  homepageUrl?: string;
  jurisdictionText?: string;
  policeStations: string[];
  searchKeywords: string[];
}
interface HeatRow {
  officeId: string;
  officeName: string;
  region: string;
  articleCount: number;
  issueCount: number;
  mainCrimeType?: string;
  reviewNeeded: number;
  importantIssues: number;
  deltaPrev: number;
}

function Counts({ heat }: { heat?: HeatRow }) {
  if (!heat || (heat.articleCount === 0 && heat.issueCount === 0)) {
    return <span className="text-detail text-ink-disabled">최근 30일 활동 없음</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      <Badge tone="outline">기사 {heat.articleCount}</Badge>
      <Badge tone="blue">이슈 {heat.issueCount}</Badge>
      {heat.importantIssues > 0 && <Badge tone="warning">중요 {heat.importantIssues}</Badge>}
    </span>
  );
}

export default function OfficesPage() {
  const { data: offices, loading: lo } = useApi<Office[]>("/api/offices");
  const [period, setPeriod] = useState<CalPeriod>("month");
  const [selectedOffice, setSelectedOffice] = useState<{ id: string; name: string } | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const [showAllRank, setShowAllRank] = useState(false);
  const RANK_PREVIEW = 8;
  const { data: heatmap, loading: lh } = useApi<HeatRow[]>(`/api/dashboard/office-heatmap?period=${period}`);

  const heatById = useMemo(() => {
    const m = new Map<string, HeatRow>();
    (heatmap ?? []).forEach((h) => m.set(h.officeId, h));
    return m;
  }, [heatmap]);

  // 트리 구성: 법무부 → 대검찰청 → 고검(서울→수원→대전→대구→부산→광주) → (지검 → 지청)
  const tree = useMemo(() => {
    const list = offices ?? [];
    // 최상위: 법무부/대검찰청(통합)
    const daegeom = list
      .filter((o) => o.type === "법무부/대검찰청" || o.type === "법무부" || o.type === "대검찰청")
      .sort((a, b) => ord(a.name) - ord(b.name));
    const highs = list
      .filter((o) => o.type === "고등검찰청")
      .sort((a, b) => (HIGH_ORDER[a.name] ?? 99) - (HIGH_ORDER[b.name] ?? 99));
    const districts = list.filter((o) => o.type === "지방검찰청");
    const branches = list.filter((o) => o.type === "지청");
    const branchesByParent = (id: string) =>
      branches.filter((b) => b.parentId === id).sort((a, b) => ord(a.name) - ord(b.name));
    const districtsByParent = (id: string) =>
      districts.filter((d) => d.parentId === id).sort((a, b) => ord(a.name) - ord(b.name));
    // 부모(고검) 없이 떠있는 지검도 노출되도록 처리
    const orphanDistricts = districts
      .filter((d) => !d.parentId || !highs.some((h) => h.id === d.parentId))
      .sort((a, b) => ord(a.name) - ord(b.name));
    return { daegeom, highs, districtsByParent, branchesByParent, orphanDistricts };
  }, [offices]);

  const ranking = useMemo(
    () => [...(heatmap ?? [])].sort((a, b) => b.issueCount - a.issueCount || b.articleCount - a.articleCount),
    [heatmap],
  );

  const loading = lo || lh;

  function OfficeLink({ o, indent }: { o: Office; indent: number }) {
    return (
      <button
        onClick={() => setSelectedOffice({ id: o.id, name: o.name })}
        className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-gray-5"
        style={{ paddingLeft: 8 + indent * 16 }}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <ChevronRight className="h-3 w-3 shrink-0 text-ink-disabled" />
          <span className="truncate text-body-s text-ink-title">{o.name}</span>
        </span>
        <Counts heat={heatById.get(o.id)} />
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">검찰청별 보기</h1>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-body-s text-ink-muted">
          <span>이슈 현황 및 순위</span>
          <span className="text-detail">
            · <span className="font-medium text-blue-60">이슈(파랑)</span> = 비슷한 기사를 묶은 사건 수 ·{" "}
            <span className="font-medium text-[#9a6a00]">중요(노랑)</span> = 보도 파급도가 높은 중요 이슈 수 ·{" "}
            <span className="font-medium text-ink-body">파급도</span> = 보도량·출처 수·확산 속도 등으로 산정한 공개보도 영향력(0~100)
          </span>
        </p>
      </div>
      <IssueSubNav />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : selectedOffice ? (
        <OfficeCrimeBoard officeId={selectedOffice.id} officeName={selectedOffice.name} onBack={() => setSelectedOffice(null)} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 조직 트리 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" /> 조직도
              </CardTitle>
              <span className="text-detail text-ink-muted">클릭 시 해당 검찰청 이슈 관련 기사로 이동</span>
            </CardHeader>
            <CardContent className="space-y-1">
              {!offices?.length ? (
                <EmptyState title="검찰청 정보가 없습니다" desc="설정에서 검찰청 동기화를 실행하세요." />
              ) : (
                <>
                  {tree.daegeom.map((o) => (
                    <OfficeLink key={o.id} o={o} indent={0} />
                  ))}
                  {tree.highs.map((h) => {
                    const isOpen = open.has(h.id);
                    return (
                      <div key={h.id}>
                        <div className="flex items-center">
                          <button onClick={() => toggle(h.id)} className="shrink-0 rounded p-1 text-ink-disabled hover:text-primary" aria-label="펼치기">
                            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")} />
                          </button>
                          <button onClick={() => setSelectedOffice({ id: h.id, name: h.name })} className="flex flex-1 items-center justify-between gap-3 rounded-md px-1 py-1.5 text-left hover:bg-gray-5">
                            <span className="truncate text-body-s font-medium text-ink-title">{h.name}</span>
                            <Counts heat={heatById.get(h.id)} />
                          </button>
                        </div>
                        {isOpen && tree.districtsByParent(h.id).map((d) => (
                          <div key={d.id}>
                            <OfficeLink o={d} indent={1} />
                            {tree.branchesByParent(d.id).map((b) => (
                              <OfficeLink key={b.id} o={b} indent={2} />
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {tree.orphanDistricts.map((d) => (
                    <div key={d.id}>
                      <OfficeLink o={d} indent={0} />
                      {tree.branchesByParent(d.id).map((b) => (
                        <OfficeLink key={b.id} o={b} indent={1} />
                      ))}
                    </div>
                  ))}
                  <p className="px-2 pt-1 text-detail text-ink-disabled">· 고검을 누르면 산하 지검·지청이 펼쳐집니다</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* 순위 표 */}
          <Card>
            <CardHeader>
              <CardTitle>검찰청 순위</CardTitle>
              <div className="flex flex-wrap items-center gap-1.5">
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
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!ranking.length ? (
                <EmptyState title="집계된 활동이 없습니다" />
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-body-s">
                    <thead>
                      <tr className="border-b border-line bg-gray-5 text-left text-detail text-ink-muted">
                        <th className="px-3 py-2 font-medium">검찰청</th>
                        <th className="px-3 py-2 font-medium">지역</th>
                        <th className="px-3 py-2 text-right font-medium">기사</th>
                        <th className="px-3 py-2 text-right font-medium">이슈</th>
                        <th className="px-3 py-2 font-medium">주요 유형</th>
                        <th className="px-3 py-2 text-right font-medium">{DELTA_LABEL[period]}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {(showAllRank ? ranking : ranking.slice(0, RANK_PREVIEW)).map((r) => (
                        <tr key={r.officeId} className="cursor-pointer hover:bg-gray-5" onClick={() => setSelectedOffice({ id: r.officeId, name: r.officeName })}>
                          <td className="px-3 py-2 font-medium text-ink-title hover:text-primary">
                            {r.officeName}
                          </td>
                          <td className="px-3 py-2 text-ink-muted">{r.region}</td>
                          <td className="px-3 py-2 text-right text-ink-body">{r.articleCount}</td>
                          <td className="px-3 py-2 text-right text-ink-body">{r.issueCount}</td>
                          <td className="px-3 py-2 text-ink-body">{r.mainCrimeType ?? "-"}</td>
                          <td
                            className={`px-3 py-2 text-right font-medium ${
                              r.deltaPrev > 0 ? "text-danger" : r.deltaPrev < 0 ? "text-blue-60" : "text-ink-disabled"
                            }`}
                          >
                            {r.deltaPrev > 0 ? `+${r.deltaPrev}` : r.deltaPrev}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ranking.length > RANK_PREVIEW && (
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
