"use client";
import Link from "next/link";
import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { issueLevelTone } from "@/lib/client/labels";

interface TopIssue {
  rank: number; id: string; title: string; officeName?: string; crimeType?: string;
  articleCount: number; sourceCount: number; issueScore: number; issueLevelLabel: string; issueLevel: string; reason: string; spreadLabel: string;
}

export function TopIssues() {
  const { data, loading } = useApi<TopIssue[]>("/api/dashboard/top-issues?period=7d&limit=5");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5"><Flame className="h-4 w-4 text-danger" /> 오늘의 주요 이슈 TOP 5</CardTitle>
        <span className="text-detail text-ink-muted">보도 파급도 기준(공개 보도 기준)</span>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? <div className="p-4"><Spinner /></div> : !data?.length ? (
          <EmptyState title="해당 기간 주요 이슈가 없습니다" />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((t) => (
              <li key={t.id}>
                <Link href={`/issues?issue=${t.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-detail font-bold text-white">{t.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-s font-medium text-ink-title">{t.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-detail text-ink-muted">
                      <span>{t.officeName ?? "관할 추정"}</span>·<span>{t.crimeType ?? "유형 미상"}</span>·<span>관련 기사 {t.articleCount}건</span>·<span>출처 {t.sourceCount}</span>
                    </p>
                    <p className="mt-1 truncate text-detail text-ink-muted">선정 이유: {t.reason}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={issueLevelTone(t.issueLevel)}>{t.issueLevelLabel}</Badge>
                    <span className="text-detail font-semibold text-ink-body">{t.issueScore}<span className="font-normal text-ink-disabled">/100</span></span>
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
