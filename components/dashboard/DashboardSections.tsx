"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Building2, Gavel, Megaphone, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";

interface Heat { officeId: string; officeName: string; region: string; issueCount: number; articleCount: number; importantIssues: number }
interface ArticleRow { primaryOfficeName?: string | null }
interface PSummary { todayCount: number; tomorrowCount: number; byOfficeCount: number; withRelatedReportCount: number }

function Rank({ items }: { items: { name: string; count: number }[] }) {
  if (!items.length) return <p className="px-1 py-3 text-center text-detail text-ink-disabled">집계된 항목이 없습니다</p>;
  return (
    <ul className="space-y-1">
      {items.map((o, i) => (
        <li key={o.name} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-gray-5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="w-4 shrink-0 text-detail font-semibold text-ink-disabled">{i + 1}</span>
            <span className="truncate text-body-s text-ink-title">{o.name}</span>
          </span>
          <Badge tone="blue">{o.count}</Badge>
        </li>
      ))}
    </ul>
  );
}

export function DashboardSections() {
  const issues = useApi<Heat[]>("/api/dashboard/office-heatmap?period=30d");
  const trials = useApi<ArticleRow[]>("/api/articles?crimeType=%EA%B3%B5%ED%8C%90&period=all&limit=300");
  const ps = useApi<PSummary>("/api/public-safety/dashboard/summary");

  const issueTop = useMemo(
    () => [...(issues.data ?? [])].sort((a, b) => b.issueCount - a.issueCount).slice(0, 6).map((o) => ({ name: o.officeName, count: o.issueCount })),
    [issues.data],
  );
  const trialTop = useMemo(() => {
    const m = new Map<string, number>();
    (trials.data ?? []).forEach((a) => { const n = a.primaryOfficeName; if (n) m.set(n, (m.get(n) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));
  }, [trials.data]);
  const s = ps.data;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* 이슈 모니터링 · 검찰청별 */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-primary" /> 이슈 모니터링 · 검찰청별</CardTitle>
          <Link href="/offices" className="flex shrink-0 items-center text-detail text-blue-60 hover:underline">전체 <ChevronRight className="h-3 w-3" /></Link>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="mb-1 text-detail text-ink-muted">최근 30일 이슈 많은 검찰청</p>
          {issues.loading ? <div className="py-6 text-center"><Spinner /></div> : <Rank items={issueTop} />}
        </CardContent>
      </Card>

      {/* 공판 모니터링 · 검찰청별 */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5"><Gavel className="h-4 w-4 text-primary" /> 공판 모니터링 · 검찰청별</CardTitle>
          <Link href="/trials/offices" className="flex shrink-0 items-center text-detail text-blue-60 hover:underline">전체 <ChevronRight className="h-3 w-3" /></Link>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="mb-1 text-detail text-ink-muted">공판(선고) 보도 많은 검찰청</p>
          {trials.loading ? <div className="py-6 text-center"><Spinner /></div> : <Rank items={trialTop} />}
        </CardContent>
      </Card>

      {/* 공안 모니터링 */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5"><Megaphone className="h-4 w-4 text-primary" /> 공안 모니터링</CardTitle>
          <Link href="/public-safety" className="flex shrink-0 items-center text-detail text-blue-60 hover:underline">전체 <ChevronRight className="h-3 w-3" /></Link>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="mb-1 text-detail text-ink-muted">집회·시위 공개 일정 현황</p>
          {ps.loading ? (
            <div className="py-6 text-center"><Spinner /></div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-line p-2.5"><p className="text-detail text-ink-muted">오늘 공개 집회</p><p className="text-heading-s font-bold text-ink-title">{s?.todayCount ?? 0}</p></div>
              <div className="rounded-md border border-line p-2.5"><p className="text-detail text-ink-muted">내일 예정</p><p className="text-heading-s font-bold text-ink-title">{s?.tomorrowCount ?? 0}</p></div>
              <div className="rounded-md border border-line p-2.5"><p className="text-detail text-ink-muted">관할 검찰청</p><p className="text-heading-s font-bold text-ink-title">{s?.byOfficeCount ?? 0}</p></div>
              <div className="rounded-md border border-line p-2.5"><p className="text-detail text-ink-muted">관련 보도 일정</p><p className="text-heading-s font-bold text-ink-title">{s?.withRelatedReportCount ?? 0}</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
