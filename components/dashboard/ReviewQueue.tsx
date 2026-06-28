"use client";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";

interface Article {
  id: string; title: string; primaryOfficeName?: string | null; crimeType?: string | null; reviewReasons: string[]; sourceName: string;
}

export function ReviewQueue() {
  const { data, loading } = useApi<Article[]>("/api/articles?needsReview=true&limit=8");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-warning" /> 검토 필요 기사</CardTitle>
        <span className="text-detail text-ink-muted">분류 신뢰도 낮음·관할 추정·민감 표현 — 분석관 확인 필요</span>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? <div className="p-4"><Spinner /></div> : !data?.length ? (
          <EmptyState title="검토 필요 기사가 없습니다" />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((a) => (
              <li key={a.id}>
                <Link href={`/issues?article=${a.id}`} className="block px-4 py-2.5 hover:bg-gray-5">
                  <p className="truncate text-body-s font-medium text-ink-title">{a.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-detail text-ink-muted">{a.primaryOfficeName ?? "관할 추정"} · {a.crimeType ?? "유형 미상"} · {a.sourceName}</span>
                    {a.reviewReasons.slice(0, 2).map((r, i) => <Badge key={i} tone="warning">{r}</Badge>)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
