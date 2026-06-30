"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { IssueSubNav } from "@/components/issues/IssueSubNav";
import { cn } from "@/lib/utils";
import { type CalPeriod } from "@/lib/periodRange";
import { KoreaChoropleth } from "@/components/issues/KoreaChoropleth";
import { ALL_CRIME_TYPES } from "@/lib/classifiers/taxonomy";

interface IssueRow { id: string; title: string; officeName?: string | null; crimeType?: string | null; issueScore?: number; articleCount?: number }
interface HeatRow { officeName: string; issueCount: number; articleCount: number }

const BAR_COLOR = "rgb(0,34,84)";
const POLICY_TOPICS = [
  { key: "검찰개혁·수사권", re: /검찰\s*개혁|검찰개혁|수사권|검수완박|검수원복|수사지휘|검찰\s*폐지/ },
  { key: "공소청·수사기소 분리", re: /공소청|기소청|수사청|중수청|중대범죄수사청|수사[·\s]*기소\s*분리|기소\s*분리/ },
  { key: "보완수사권", re: /보완수사/ },
  { key: "특검", re: /특검|특별검사/ },
  { key: "공수처", re: /공수처|고위공직자범죄수사처/ },
  { key: "인사·조직", re: /검찰총장|검사장|고검장|지검장|검찰\s*인사|검사\s*인사|직제|증원|인선|내정/ },
];

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

function BarRow({ label, value, max, href }: { label: string; value: number; max: number; href?: string }) {
  const pct = value > 0 && max > 0 ? Math.max(3, Math.round((Math.log(value + 1) / Math.log(max + 1)) * 100)) : 0;
  const inner = (
    <>
      <span className="w-28 shrink-0 truncate text-left text-body-s text-ink-title sm:w-36">{label} <span className="text-ink-muted">({value})</span></span>
      <div className="h-3.5 flex-1 overflow-hidden rounded bg-gray-5"><div className="h-full rounded" style={{ width: `${pct}%`, background: BAR_COLOR }} /></div>
      {href && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-disabled" />}
    </>
  );
  return href ? <Link href={href} className="flex w-full items-center gap-2 rounded py-0.5 hover:bg-gray-5">{inner}</Link> : <div className="flex items-center gap-2">{inner}</div>;
}

export default function IssueMonitoringPage() {
  const [pOffice, setPOffice] = useState<CalPeriod>("month");
  const { data: heat } = useApi<HeatRow[]>(`/api/dashboard/office-heatmap?period=${pOffice}`);
  // 모든 집계 단일 소스: /api/issues(이슈 단위, 최근 30일) — 검찰청별/범죄유형별/제도정책 보기와 동일
  const { data: issuesData, loading } = useApi<IssueRow[]>("/api/issues?period=30d");

  const issues = useMemo(() => issuesData ?? [], [issuesData]);
  const topIssues = useMemo(() => [...issues].sort((a, b) => (b.issueScore ?? 0) - (a.issueScore ?? 0)).slice(0, 10), [issues]);
  const offices = useMemo(
    () => [...(heat ?? [])].map((h) => ({ name: h.officeName, count: h.issueCount })).filter((o) => o.count > 0).sort((a, b) => b.count - a.count),
    [heat],
  );
  const crimeRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of issues) { const t = it.crimeType || "기타"; if (t === "공판" || t === "형사사법제도/정책") continue; counts.set(t, (counts.get(t) ?? 0) + 1); }
    const base = ALL_CRIME_TYPES.filter((t) => t !== "공판" && t !== "형사사법제도/정책");
    const names = Array.from(new Set([...base, ...counts.keys()]));
    return names.map((n) => ({ name: n, count: counts.get(n) ?? 0 })).sort((a, b) => b.count - a.count);
  }, [issues]);
  const crimeMax = crimeRows[0]?.count ?? 0;
  const policy = useMemo(() => {
    const arts = issues.filter((it) => (it.crimeType || "") === "형사사법제도/정책");
    const counts = new Map<string, number>();
    for (const a of arts) { const topic = POLICY_TOPICS.find((t) => t.re.test(a.title))?.key ?? "기타 제도/정책"; counts.set(topic, (counts.get(topic) ?? 0) + 1); }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [issues]);
  const policyMax = policy[0]?.count ?? 0;

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">이슈 모니터링</h1>
        <p className="text-body-s text-ink-muted">주요 이슈 현황을 정리한 화면입니다.</p>
      </div>
      <IssueSubNav />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : !issues.length ? (
        <EmptyState icon={<LayoutDashboard className="h-8 w-8" />} title="수집된 이슈가 없습니다" desc="기사가 수집되면 집계됩니다." />
      ) : (
        <div className="space-y-4">
          {/* 주요 이슈 Top 10 — 좌우 5+5 */}
          <Card>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>주요 이슈 Top 10</CardTitle>
                <span className="mt-0.5 block text-detail text-ink-muted">파급도 = 보도량·출처 수·확산 속도 등으로 산정한 공개보도 영향력(0~100)</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {topIssues.map((it, i) => (
                  <Link key={it.id} href={`/issues?issue=${it.id}`} className="flex items-start gap-2 rounded px-1 py-1.5 hover:bg-gray-5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-caption font-bold text-white">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-body-s font-medium text-ink-title">{it.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1 text-detail text-ink-muted">
                        <Badge tone="navy">{it.officeName ?? "관할 미상"}</Badge>
                        <Badge tone="blue">{it.crimeType || "기타"}</Badge>
                        <span>파급도 {Math.round(it.issueScore ?? 0)}</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* 검찰청별 이슈 분포(전국 지도) — 검찰청별 보기와 동일 집계 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>검찰청별 이슈 분포 (전국)</CardTitle>
                <Periods value={pOffice} onChange={setPOffice} />
              </CardHeader>
              <CardContent>
                <KoreaChoropleth offices={offices} />
              </CardContent>
            </Card>

            <div className="space-y-4">
              {/* 범죄유형 분류 — 범죄유형별 보기와 동일(이슈 수, 30일, 공판/정책 제외) */}
              <Card>
                <CardHeader>
                  <CardTitle>범죄유형 분류</CardTitle>
                  <span className="text-detail text-ink-muted">이슈 수</span>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[268px] space-y-1 overflow-y-auto scrollbar-thin pr-1">
                    {crimeRows.map((c) => (
                      <BarRow key={c.name} label={c.name} value={c.count} max={crimeMax} href={`/crime-news?type=${encodeURIComponent(c.name)}&scope=issue`} />
                    ))}
                  </div>
                  <p className="mt-1 text-detail text-ink-disabled">· 막대를 누르면 관련 기사 목록으로 이동</p>
                </CardContent>
              </Card>

              {/* 제도/정책 이슈 — 동일 소스 */}
              <Card>
                <CardHeader>
                  <CardTitle>제도/정책 이슈</CardTitle>
                  <Link href="/policy-issues" className="flex shrink-0 items-center text-detail text-blue-60 hover:underline">전체 <ChevronRight className="h-3 w-3" /></Link>
                </CardHeader>
                <CardContent>
                  {policy.length ? (
                    <div className="max-h-[150px] space-y-1 overflow-y-auto scrollbar-thin pr-1">
                      {policy.map((p) => <BarRow key={p.name} label={p.name} value={p.count} max={policyMax} href="/policy-issues" />)}
                    </div>
                  ) : (
                    <p className="text-body-s text-ink-muted">최근 30일 제도/정책 이슈가 없습니다.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
