"use client";
import { useMemo, useState } from "react";
import { Gavel } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { ArticleDetailPanel } from "@/components/article-detail/ArticleDetailPanel";
import { TrialSubNav } from "@/components/trials/TrialSubNav";
import { dedupeArticles } from "@/lib/client/dedupeArticles";
import { formatDate } from "@/lib/utils";

interface ArticleRow {
  id: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  originalUrl: string;
  summary?: string | null;
  primaryOfficeId?: string | null;
  primaryOfficeName?: string | null;
  primaryRegion?: string | null;
  crimeType?: string | null;
  crimeSubtype?: string | null;
  issueScore: number;
  issueLevel: string;
}

export default function TrialsPage() {
  const { data, loading } = useApi<ArticleRow[]>(
    "/api/articles?crimeType=공판&period=all&limit=300",
  );
  const [selected, setSelected] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      ),
    [data],
  );

  const deduped = useMemo(() => dedupeArticles(rows), [rows]);
  const officeCount = useMemo(
    () => new Set(rows.map((r) => r.primaryOfficeName).filter(Boolean)).size,
    [rows],
  );
  const subtypeCount = useMemo(
    () => new Set(rows.map((r) => r.crimeSubtype || "기타")).size,
    [rows],
  );

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="flex items-center gap-2 text-heading-m text-ink-title">
          <Gavel className="h-5 w-5 text-primary" /> 공판 모니터링
        </h1>
        <p className="text-body-s text-ink-muted">
          법원 판결·선고 관련 보도 현황 (공개 보도 기준)
        </p>
      </div>
      <TrialSubNav />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : !rows.length ? (
        <EmptyState
          icon={<Gavel className="h-8 w-8" />}
          title="공판 관련 보도가 없습니다"
          desc="공판 관련 기사가 수집되면 이곳에 표시됩니다."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="blue">공판 사건 {deduped.length}건</Badge>
            <Badge tone="navy">검찰청 {officeCount}곳</Badge>
            <Badge tone="outline">기저 범죄유형 {subtypeCount}종</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* 최근 기사 목록 */}
            <div className="space-y-2">
              {deduped.map((d) => {
                const a = d.rep;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a.id)}
                    className={`w-full rounded-md border p-3 text-left transition hover:border-primary ${selected === a.id ? "border-primary bg-primary/5" : "border-line bg-white"}`}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone="blue">{a.crimeSubtype || "기타"}</Badge>
                      {a.primaryOfficeName && (
                        <Badge tone="navy">{a.primaryOfficeName}</Badge>
                      )}
                      <span className="text-detail text-ink-muted">
                        {a.sourceName} · {formatDate(a.publishedAt)}
                      </span>
                      {d.count > 1 && <span className="text-detail text-blue-60">· 동일 보도 {d.count}건</span>}
                    </div>
                    <p className="line-clamp-2 text-body-s font-medium text-ink-title">
                      {a.title.split(" - ")[0]}
                    </p>
                    {a.summary && (
                      <p className="mt-0.5 line-clamp-1 text-detail text-ink-muted">
                        {a.summary}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            {/* 상세 */}
            <div className="lg:sticky lg:top-4 lg:self-start">
              {selected ? (
                <Card>
                  <CardContent className="p-0">
                    <ArticleDetailPanel articleId={selected} />
                  </CardContent>
                </Card>
              ) : (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line p-6 text-center text-ink-disabled">
                  <Gavel className="h-7 w-7" />
                  <p className="text-body-s">
                    왼쪽 목록에서 기사를 선택하면
                    <br />
                    상세·관할·원문 링크가 표시됩니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
