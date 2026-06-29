"use client";
import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { formatDate } from "@/lib/utils";
import { pickDistinctTop } from "@/lib/client/dedupeSimilar";

interface Row {
  id: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  originalUrl: string;
  primaryOfficeName?: string | null;
  issueClusterId?: string | null;
  issueScore?: number | null;
}

/** 보도 유형별 TOP N(내용 중복 제거) 카드 */
export function TopNewsCard({ title, baseUrl, n = 5 }: { title: string; baseUrl: string; n?: number }) {
  const { data, loading } = useApi<Row[]>(baseUrl);
  const top = useMemo(() => pickDistinctTop(data ?? [], n), [data, n]);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{title} TOP {n}</CardTitle>
        <span className="text-detail text-ink-muted">파급도순 · 중복 사건 제외</span>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {loading ? (
          <div className="py-8 text-center"><Spinner /></div>
        ) : !top.length ? (
          <EmptyState title="집계된 보도가 없습니다" />
        ) : (
          <ol className="divide-y divide-line">
            {top.map((a, i) => (
              <li key={a.id} className="flex items-start gap-2.5 px-4 py-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-caption font-bold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <a href={a.originalUrl} target="_blank" rel="noreferrer" className="group flex items-start gap-1.5 text-body-s font-medium text-ink-title hover:text-primary">
                    <span className="hover:underline">{a.title.split(" - ")[0]}</span>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                  </a>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-detail text-ink-muted">
                    {a.primaryOfficeName && <Badge tone="navy">{a.primaryOfficeName}</Badge>}
                    <span>파급도 {Math.round(a.issueScore ?? 0)}/100 · {formatDate(a.publishedAt)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
