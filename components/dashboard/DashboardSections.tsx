"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Building2, Gavel, Megaphone, ChevronRight, FileText, MessageSquareText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { pickDistinctTop } from "@/lib/client/dedupeSimilar";

interface ArticleRow {
  id: string;
  title: string;
  originalUrl: string;
  primaryOfficeName?: string | null;
  crimeType?: string | null;
  issueClusterId?: string | null;
  issueScore?: number | null;
  publishedAt: string;
}

function TopList({ rows, loading, n = 5 }: { rows: ArticleRow[] | null; loading: boolean; n?: number }) {
  const top = useMemo(() => pickDistinctTop(rows ?? [], n), [rows, n]);
  if (loading) return <div className="py-6 text-center"><Spinner /></div>;
  if (!top.length) return <p className="py-4 text-center text-detail text-ink-disabled">집계된 항목이 없습니다</p>;
  return (
    <ol className="space-y-1">
      {top.map((a, i) => (
        <li key={a.id} className="flex items-start gap-2">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold leading-none text-white">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <a href={a.originalUrl} target="_blank" rel="noreferrer" className="group flex items-start gap-1 text-body-s font-medium text-ink-title hover:text-primary">
              <span className="line-clamp-1 hover:underline">{a.title.split(" - ")[0]}</span>
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-30 group-hover:opacity-100" />
            </a>
            <p className="truncate text-detail text-ink-muted">{a.primaryOfficeName ?? "관할 미상"}{a.crimeType ? ` · ${a.crimeType}` : ""} · 파급도 {Math.round(a.issueScore ?? 0)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function DashboardSections() {
  const issues = useApi<ArticleRow[]>("/api/articles?period=all&limit=300&sort=score");
  const trials = useApi<ArticleRow[]>("/api/articles?crimeType=%EA%B3%B5%ED%8C%90&period=all&limit=300&sort=score");
  const assembly = useApi<ArticleRow[]>("/api/articles?keyword=%EC%A7%91%ED%9A%8C&period=all&limit=300&sort=score");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 이슈 모니터링 */}
      <Card className="flex flex-col">
        <CardHeader>
          <Link href="/issue-monitoring" className="flex items-center gap-1.5 text-ink-title hover:text-primary"><Building2 className="h-4 w-4 text-primary" /> <CardTitle>이슈 모니터링</CardTitle></Link>
          <Link href="/issue-monitoring" className="flex shrink-0 items-center text-detail text-blue-60 hover:underline">바로가기 <ChevronRight className="h-3 w-3" /></Link>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="mb-1 text-detail text-ink-muted">주요 이슈 TOP 5</p>
          <TopList rows={issues.data} loading={issues.loading} />
        </CardContent>
      </Card>

      {/* 공판 모니터링 */}
      <Card className="flex flex-col">
        <CardHeader>
          <Link href="/trials" className="flex items-center gap-1.5 text-ink-title hover:text-primary"><Gavel className="h-4 w-4 text-primary" /> <CardTitle>공판 모니터링</CardTitle></Link>
          <Link href="/trials" className="flex shrink-0 items-center text-detail text-blue-60 hover:underline">바로가기 <ChevronRight className="h-3 w-3" /></Link>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="mb-1 text-detail text-ink-muted">주요 공판 사건 TOP 5</p>
          <TopList rows={trials.data} loading={trials.loading} />
        </CardContent>
      </Card>

      {/* 공안 모니터링 */}
      <Card className="flex flex-col">
        <CardHeader>
          <Link href="/public-safety" className="flex items-center gap-1.5 text-ink-title hover:text-primary"><Megaphone className="h-4 w-4 text-primary" /> <CardTitle>공안 모니터링</CardTitle></Link>
          <Link href="/public-safety" className="flex shrink-0 items-center text-detail text-blue-60 hover:underline">바로가기 <ChevronRight className="h-3 w-3" /></Link>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="mb-1 text-detail text-ink-muted">집회·시위 보도 TOP 5</p>
          <TopList rows={assembly.data} loading={assembly.loading} />
        </CardContent>
      </Card>

      {/* 공보 */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-primary" /> 공보</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-2">
          <p className="mb-1 text-detail text-ink-muted">사건 처리 후 신속 공보 작성</p>
          <Link href="/press-release-generator" className="flex items-center justify-between rounded-md border border-line px-3 py-2.5 text-body-s text-ink-title transition-colors hover:border-primary hover:text-primary">
            <span className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-ink-muted" /> 보도자료 초안</span>
            <ChevronRight className="h-4 w-4 text-ink-disabled" />
          </Link>
          <Link href="/text-pool" className="flex items-center justify-between rounded-md border border-line px-3 py-2.5 text-body-s text-ink-title transition-colors hover:border-primary hover:text-primary">
            <span className="flex items-center gap-1.5"><MessageSquareText className="h-4 w-4 text-ink-muted" /> 문자풀 초안</span>
            <ChevronRight className="h-4 w-4 text-ink-disabled" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
