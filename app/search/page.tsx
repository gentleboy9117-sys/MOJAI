"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { ArticleDetailPanel } from "@/components/article-detail/ArticleDetailPanel";
import { formatDate } from "@/lib/utils";

interface ArticleRow {
  id: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  primaryOfficeName?: string | null;
  crimeType?: string | null;
  summary?: string | null;
}

function SearchResults() {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const [selected, setSelected] = useState<string | null>(null);
  const { data, loading } = useApi<ArticleRow[]>(
    q ? `/api/articles?keyword=${encodeURIComponent(q)}&period=all&limit=300` : null,
  );
  const rows = data ?? [];

  return (
    <div className="mx-auto max-w-content space-y-4 p-5">
      <div>
        <h1 className="flex items-center gap-2 text-heading-m text-ink-title">
          <Search className="h-5 w-5 text-primary" /> 검색
        </h1>
        <p className="text-body-s text-ink-muted">
          {q ? <>‘<span className="font-medium text-ink-title">{q}</span>’ 검색 결과 {!loading && `· ${rows.length}건`}</> : "상단 검색창에 키워드를 입력하세요 (기사 제목·내용·검찰청·범죄유형)"}
        </p>
      </div>

      {!q ? null : loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : !rows.length ? (
        <EmptyState icon={<Search className="h-8 w-8" />} title="검색 결과가 없습니다" desc="다른 키워드로 검색해 보세요." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 결과 목록 */}
          <div className="space-y-2">
            {rows.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a.id)}
                className={`w-full rounded-md border p-3 text-left transition hover:border-primary ${selected === a.id ? "border-primary bg-primary/5" : "border-line bg-white"}`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  {a.crimeType && <Badge tone="blue">{a.crimeType}</Badge>}
                  {a.primaryOfficeName && <Badge tone="navy">{a.primaryOfficeName}</Badge>}
                  <span className="text-detail text-ink-muted">{a.sourceName} · {formatDate(a.publishedAt)}</span>
                </div>
                <p className="line-clamp-2 text-body-s font-medium text-ink-title">{a.title.split(" - ")[0]}</p>
                {a.summary && <p className="mt-0.5 line-clamp-1 text-detail text-ink-muted">{a.summary}</p>}
              </button>
            ))}
          </div>
          {/* 상세 */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            {selected ? (
              <Card><CardContent className="p-0"><ArticleDetailPanel articleId={selected} /></CardContent></Card>
            ) : (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line p-6 text-center text-ink-disabled">
                <Search className="h-7 w-7" />
                <p className="text-body-s">왼쪽 목록에서 기사를 선택하면<br />상세·관할·원문 링크가 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
