"use client";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FilterSidebar, DEFAULT_FILTERS, type IssueFilters } from "@/components/filters/FilterSidebar";
import { IssueCard, type IssueListItem } from "@/components/issues/IssueCard";
import { IssueDetailPanel } from "@/components/issues/IssueDetailPanel";
import { ArticleDetailPanel } from "@/components/article-detail/ArticleDetailPanel";
import { useApi } from "@/lib/client/useApi";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { sourceTone, SOURCE_TYPE_LABEL } from "@/lib/client/labels";
import { IssueSubNav } from "@/components/issues/IssueSubNav";
import { MousePointerClick } from "lucide-react";

interface ArticleRowData {
  id: string; title: string; sourceName: string; sourceType: string; publishedAt: string;
  primaryOfficeName?: string | null; crimeType?: string | null; needsHumanReview: boolean; canDisplayFullText: boolean;
}

export function IssuesClient() {
  const sp = useSearchParams();
  const [filters, setFilters] = useState<IssueFilters>({
    ...DEFAULT_FILTERS,
    crimeType: sp.get("crimeType") || "",
    q: sp.get("keyword") || "",
    view: sp.get("keyword") || sp.get("article") ? "article" : "issue",
  });
  const officeId = sp.get("officeId") || "";
  const [selIssue, setSelIssue] = useState<string | null>(sp.get("issue"));
  const [selArticle, setSelArticle] = useState<string | null>(sp.get("article"));

  // 키워드 칩 클릭(?keyword=) → 기사 단위 + 검색어로 모아보기
  useEffect(() => {
    const kw = sp.get("keyword");
    if (kw) setFilters((f) => ({ ...f, q: kw, view: "article" }));
  }, [sp]);

  const listUrl = useMemo(() => {
    const p = new URLSearchParams();
    p.set("period", filters.period);
    if (filters.region) p.set("region", filters.region);
    if (filters.crimeType) p.set("crimeType", filters.crimeType);
    if (officeId) p.set("officeId", officeId);
    if (filters.view === "issue") {
      p.set("sort", filters.sort);
      if (filters.q) p.set("q", filters.q);
      if (Number(filters.minScore) > 0) p.set("minScore", filters.minScore);
      return `/api/issues?${p.toString()}`;
    }
    if (filters.q) p.set("keyword", filters.q);
    if (filters.minScore === "review") p.set("needsReview", "true");
    p.set("sort", filters.sort);
    p.set("limit", "100");
    return `/api/articles?${p.toString()}`;
  }, [filters, officeId]);

  const { data, loading } = useApi<any[]>(listUrl);

  const selectIssue = (id: string) => { setSelArticle(null); setSelIssue(id); };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 bg-white px-4 pt-2">
        <IssueSubNav />
      </div>
      <div className="flex min-h-0 flex-1">
      <FilterSidebar filters={filters} onChange={setFilters} />

      {/* 중앙: 리스트 */}
      <div className="flex w-[380px] shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line bg-white px-4 py-2.5">
          <h1 className="text-title text-ink-title">이슈 모니터링</h1>
          <p className="text-detail text-ink-muted">{filters.view === "issue" ? "이슈 단위" : "기사 단위"} · {data?.length ?? 0}건</p>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3 scrollbar-thin">
          {loading ? <div className="pt-6 text-center"><Spinner /></div> : !data?.length ? (
            <EmptyState title="결과가 없습니다" desc="필터를 조정해 보세요." />
          ) : filters.view === "issue" ? (
            (data as IssueListItem[]).map((it) => <IssueCard key={it.id} issue={it} selected={selIssue === it.id} onClick={() => selectIssue(it.id)} />)
          ) : (
            (data as ArticleRowData[]).map((a) => <ArticleRow key={a.id} a={a} selected={selArticle === a.id} onClick={() => setSelArticle(a.id)} />)
          )}
        </div>
      </div>

      {/* 우측: 상세 */}
      <div className="min-w-0 flex-1 bg-white">
        {selArticle ? (
          <ArticleDetailPanel articleId={selArticle} onBack={selIssue ? () => setSelArticle(null) : undefined} onOpenIssue={selectIssue} />
        ) : selIssue ? (
          <IssueDetailPanel issueId={selIssue} onSelectArticle={(id) => setSelArticle(id)} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-ink-disabled">
            <MousePointerClick className="h-8 w-8" />
            <p className="text-body-s">왼쪽에서 이슈 또는 헤드라인을 선택하면<br />여기 상세 내용이 표시됩니다.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function ArticleRow({ a, selected, onClick }: { a: ArticleRowData; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("w-full rounded-lg border bg-white p-3 text-left transition-colors", selected ? "border-primary ring-1 ring-primary" : "border-line hover:bg-gray-5")}>
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        {a.needsHumanReview && <Badge tone="warning">검토 필요</Badge>}
        <Badge tone={sourceTone(a.sourceType)}>{SOURCE_TYPE_LABEL[a.sourceType] ?? a.sourceType}</Badge>
        {!a.canDisplayFullText && <Badge tone="danger">원문 제한</Badge>}
      </div>
      <p className="line-clamp-2 text-body-s font-medium text-ink-title">{a.title}</p>
      <p className="mt-1 text-detail text-ink-muted">{a.primaryOfficeName ?? "관할 추정"} · {a.crimeType ?? "유형 미상"} · {a.sourceName} · {formatDate(a.publishedAt)}</p>
    </button>
  );
}
