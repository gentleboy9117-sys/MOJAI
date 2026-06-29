"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { IssueSubNav } from "@/components/issues/IssueSubNav";
import { OFFICE_ORDER, HIGH_PROSECUTION_TREE } from "@/lib/publicSafety/assemblyJurisdictionClassifier";

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
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("30d");
  const [sortBy, setSortBy] = useState<"issue" | "important">("issue");
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
    () => {
      const key = sortBy === "important" ? "importantIssues" : "issueCount";
      return [...(heatmap ?? [])].sort((a, b) => (b[key] as number) - (a[key] as number) || b.articleCount - a.articleCount);
    },
    [heatmap, sortBy],
  );

  const loading = lo || lh;

  function OfficeLink({ o, indent }: { o: Office; indent: number }) {
    return (
      <Link
        href={`/issues?officeId=${o.id}`}
        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-gray-5"
        style={{ paddingLeft: 8 + indent * 16 }}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <ChevronRight className="h-3 w-3 shrink-0 text-ink-disabled" />
          <span className="truncate text-body-s text-ink-title">{o.name}</span>
          <span className="shrink-0 text-detail text-ink-disabled">{o.region}</span>
        </span>
        <Counts heat={heatById.get(o.id)} />
      </Link>
    );
  }

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">검찰청별 보기</h1>
        <p className="text-body-s text-ink-muted">
          조직 체계별 이슈 현황과 검찰청 순위 — 최근 30일 공개 보도 기준(보도 파급도)
        </p>
        <p className="mt-1 text-detail text-ink-muted">
          · <span className="font-medium text-blue-60">이슈(파랑)</span> = 비슷한 기사를 묶은 사건 수 ·{" "}
          <span className="font-medium text-[#9a6a00]">중요(노랑)</span> = 그중 보도 파급도가 높은 중요 이슈 수
        </p>
      </div>
      <IssueSubNav />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 조직 트리 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" /> 조직 체계
              </CardTitle>
              <span className="text-detail text-ink-muted">클릭 시 해당 청 이슈로 이동</span>
            </CardHeader>
            <CardContent className="space-y-1">
              {!offices?.length ? (
                <EmptyState title="검찰청 정보가 없습니다" desc="설정에서 검찰청 동기화를 실행하세요." />
              ) : (
                <>
                  {tree.daegeom.map((o) => (
                    <OfficeLink key={o.id} o={o} indent={0} />
                  ))}
                  {tree.highs.map((h) => (
                    <div key={h.id}>
                      <OfficeLink o={h} indent={0} />
                      {tree.districtsByParent(h.id).map((d) => (
                        <div key={d.id}>
                          <OfficeLink o={d} indent={1} />
                          {tree.branchesByParent(d.id).map((b) => (
                            <OfficeLink key={b.id} o={b} indent={2} />
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                  {tree.orphanDistricts.map((d) => (
                    <div key={d.id}>
                      <OfficeLink o={d} indent={0} />
                      {tree.branchesByParent(d.id).map((b) => (
                        <OfficeLink key={b.id} o={b} indent={1} />
                      ))}
                    </div>
                  ))}
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
                  {(["today", "7d", "30d"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setPeriod(v)}
                      className={cn("rounded px-2 py-0.5 text-caption transition-colors", period === v ? "bg-primary font-medium text-white" : "text-ink-muted hover:text-ink-title")}
                    >
                      {v === "today" ? "오늘" : v === "7d" ? "지난 7일" : "지난 30일"}
                    </button>
                  ))}
                </div>
                <div className="flex rounded-md border border-line p-0.5">
                  {(["issue", "important"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setSortBy(v)}
                      className={cn("rounded px-2 py-0.5 text-caption transition-colors", sortBy === v ? "bg-primary font-medium text-white" : "text-ink-muted hover:text-ink-title")}
                    >
                      {v === "issue" ? "이슈순" : "중요순"}
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
                        <th className="px-3 py-2 text-right font-medium">전일 대비</th>
                        <th className="px-3 py-2 text-right font-medium">중요</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {ranking.map((r) => (
                        <tr key={r.officeId} className="hover:bg-gray-5">
                          <td className="px-3 py-2 font-medium text-ink-title">
                            <Link href={`/issues?officeId=${r.officeId}`} className="hover:text-primary hover:underline">
                              {r.officeName}
                            </Link>
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
                          <td className="px-3 py-2 text-right text-ink-body">{r.importantIssues}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
