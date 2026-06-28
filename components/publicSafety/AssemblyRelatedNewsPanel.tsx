"use client";
import { useState } from "react";
import Link from "next/link";
import { Newspaper, RefreshCw, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { apiPost, getDevUser } from "@/lib/client/api";
import { formatDate } from "@/lib/utils";
import { RELATION_TYPE_LABEL, relationTypeTone, formatPercent } from "./publicSafetyLabels";

interface RelatedNewsRow {
  assemblyEventId: string;
  assemblyDate: string;
  locationName: string;
  officeName: string;
  articleId: string;
  articleTitle: string;
  sourceName: string;
  publishedAt?: string | null;
  relationConfidence: number;
  relationReason: string;
  relationType: string;
  hasLegalIssueMention: boolean;
  needsHumanReview: boolean;
}

type Period = "today" | "7d" | "30d" | "all";
const PERIODS: { v: Period; label: string }[] = [
  { v: "today", label: "오늘" },
  { v: "7d", label: "최근/예정 7일" },
  { v: "30d", label: "30일" },
  { v: "all", label: "전체" },
];

/** [공안] 집회 관련 보도 패널 (사양 §10) */
export function AssemblyRelatedNewsPanel() {
  const [period, setPeriod] = useState<Period>("7d");
  const [legalOnly, setLegalOnly] = useState(false);
  const [matching, setMatching] = useState(false);
  const canAct = getDevUser().role !== "VIEWER";

  const { data, loading, refetch } = useApi<RelatedNewsRow[]>(
    `/api/public-safety/dashboard/related-news?period=${period}`,
  );

  async function rematch() {
    setMatching(true);
    try {
      await apiPost("/api/public-safety/articles/match", {});
      refetch();
    } finally {
      setMatching(false);
    }
  }

  const rows = (data ?? []).filter((r) => (legalOnly ? r.hasLegalIssueMention : true));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Newspaper className="h-4 w-4 text-primary" /> 집회 관련 보도
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="h-8 w-auto text-caption"
          >
            {PERIODS.map((p) => (
              <option key={p.v} value={p.v}>
                {p.label}
              </option>
            ))}
          </Select>
          {canAct && (
            <Button size="sm" variant="secondary" onClick={rematch} disabled={matching}>
              {matching ? <Spinner /> : <RefreshCw className="h-4 w-4" />} 매칭 갱신
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-detail text-ink-muted">
            관련 보도는 범죄 사실이 아니라 공개 보도입니다. '보도에 따르면' 기준으로 정리합니다.
          </p>
          <label className="flex cursor-pointer items-center gap-1.5 text-detail text-ink-body">
            <input
              type="checkbox"
              checked={legalOnly}
              onChange={(e) => setLegalOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-line-strong text-primary focus:ring-ring"
            />
            법적 이슈 가능성 언급만
          </label>
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <Spinner />
          </div>
        ) : !rows.length ? (
          <EmptyState title="집회 관련 보도가 없습니다" desc="기간을 넓히거나 매칭을 갱신해 보세요." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={`${r.assemblyEventId}-${r.articleId}`} className="py-3">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Badge tone="navy">{r.officeName}</Badge>
                  <Badge tone={relationTypeTone(r.relationType)}>
                    {RELATION_TYPE_LABEL[r.relationType] ?? r.relationType}
                  </Badge>
                  <Badge tone="outline">관련도 {formatPercent(r.relationConfidence)}</Badge>
                  {r.hasLegalIssueMention && <Badge tone="warning">법적 이슈 가능성 언급</Badge>}
                  {r.needsHumanReview && <Badge tone="danger">검토 필요</Badge>}
                </div>
                <p className="text-body-s font-medium text-ink-title">{r.articleTitle}</p>
                <p className="mt-0.5 text-detail text-ink-muted">
                  <Link
                    href={`/public-safety/assemblies?assembly=${r.assemblyEventId}`}
                    className="text-primary hover:underline"
                  >
                    {r.locationName} · {formatDate(r.assemblyDate)} 집회
                  </Link>{" "}
                  · {r.sourceName}
                  {r.publishedAt ? ` · ${formatDate(r.publishedAt)}` : ""}
                </p>
                {r.relationReason && (
                  <p className="mt-1 flex items-start gap-1 text-detail text-ink-muted">
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                    {r.relationReason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
