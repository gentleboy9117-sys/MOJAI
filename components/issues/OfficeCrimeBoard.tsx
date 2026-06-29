"use client";
import { useMemo, useState } from "react";
import { ArrowLeft, Scale, ChevronRight, ExternalLink, Newspaper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { dedupeArticles } from "@/lib/client/dedupeArticles";

interface ArticleRow {
  id: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  originalUrl: string;
  crimeType?: string | null;
  crimeSubtype?: string | null;
  issueScore?: number | null;
}

type Period = "today" | "7d" | "30d" | "all";

/** 특정 검찰청의 이슈를 '범죄유형별 그룹 카드 → 기사 목록'으로 보여주는 보기 */
export function OfficeCrimeBoard({ officeId, officeName, onBack }: { officeId: string; officeName: string; onBack: () => void }) {
  const [period, setPeriod] = useState<Period>("30d");
  const { data, loading } = useApi<ArticleRow[]>(`/api/articles?officeId=${officeId}&period=${period}&limit=300`);
  const [crime, setCrime] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byType = new Map<string, ArticleRow[]>();
    for (const r of data ?? []) {
      const t = r.crimeType || "기타";
      if (!byType.has(t)) byType.set(t, []);
      byType.get(t)!.push(r);
    }
    return [...byType.entries()]
      .map(([type, list]) => {
        const deduped = dedupeArticles(list);
        const headline = [...deduped].sort((a, b) => (b.rep.issueScore ?? 0) - (a.rep.issueScore ?? 0))[0];
        return { type, count: deduped.length, headline: headline?.rep };
      })
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const crimeArticles = useMemo(() => {
    if (!crime) return [];
    return dedupeArticles((data ?? []).filter((r) => (r.crimeType || "기타") === crime))
      .sort((a, b) => (b.rep.issueScore ?? 0) - (a.rep.issueScore ?? 0) || new Date(b.rep.publishedAt).getTime() - new Date(a.rep.publishedAt).getTime());
  }, [data, crime]);

  const PeriodTabs = (
    <div className="flex rounded-md border border-line p-0.5">
      {(["today", "7d", "30d", "all"] as const).map((v) => (
        <button
          key={v}
          onClick={() => setPeriod(v)}
          className={cn("rounded px-2 py-0.5 text-caption transition-colors", period === v ? "bg-primary font-medium text-white" : "text-ink-muted hover:text-ink-title")}
        >
          {v === "today" ? "오늘" : v === "7d" ? "지난 7일" : v === "30d" ? "지난 30일" : "전체"}
        </button>
      ))}
    </div>
  );

  // 3단계: 기사 목록(범죄유형 선택됨)
  if (crime) {
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
          <button onClick={() => setCrime(null)} className="flex items-center gap-1 text-detail text-ink-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> {officeName} 범죄유형
          </button>
          <span className="flex items-center gap-1.5 text-body-s font-bold text-ink-title">
            <Scale className="h-4 w-4 text-primary" /> {crime}
          </span>
          <span className="ml-auto"><Badge tone="outline">{crimeArticles.length}건</Badge></span>
        </div>
        <CardContent className="p-0">
          {!crimeArticles.length ? (
            <EmptyState icon={<Newspaper className="h-8 w-8" />} title="기사가 없습니다" />
          ) : (
            <ul className="divide-y divide-line">
              {crimeArticles.map((d) => (
                <li key={d.rep.id} className="px-4 py-2.5">
                  <a href={d.rep.originalUrl} target="_blank" rel="noreferrer" className="group flex items-start gap-1.5 text-body-s font-medium text-ink-title hover:text-primary">
                    <span className="hover:underline">{d.rep.title.split(" - ")[0]}</span>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                  </a>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-detail text-ink-muted">
                    {d.rep.crimeSubtype && <Badge tone="navy">{d.rep.crimeSubtype}</Badge>}
                    <span>{d.rep.sourceName}{d.rep.publishedAt ? ` · ${formatDate(d.rep.publishedAt)}` : ""}</span>
                    {d.count > 1 && <span className="text-blue-60">· 동일 보도 {d.count}건</span>}
                  </p>
                  {d.count > 1 && (
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                      {d.sources.map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noreferrer" className="text-detail text-blue-60 hover:underline">· {s.sourceName}</a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  // 2단계: 범죄유형별 그룹 카드
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 text-detail text-ink-muted hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> 검찰청별 보기
        </button>
        <span className="text-body-s font-bold text-ink-title">{officeName}</span>
        <span className="ml-auto">{PeriodTabs}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : !groups.length ? (
        <EmptyState icon={<Scale className="h-8 w-8" />} title="해당 기간 이슈가 없습니다" desc="기간을 넓혀보세요." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <button key={g.type} onClick={() => setCrime(g.type)} className="flex flex-col rounded-lg border border-line bg-white p-4 text-left transition hover:border-primary hover:shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-body-s font-bold text-ink-title">
                  <Scale className="h-4 w-4 text-primary" /> {g.type}
                </span>
                <Badge tone="blue">기사 {g.count}</Badge>
              </div>
              {g.headline && (
                <div className="mt-2">
                  <p className="text-detail text-ink-muted">대표 헤드라인</p>
                  <p className="line-clamp-2 text-detail font-medium text-ink-title">{g.headline.title.split(" - ")[0]}</p>
                </div>
              )}
              <span className="mt-2 flex items-center gap-0.5 text-detail text-blue-60">기사 보기 <ChevronRight className="h-3 w-3" /></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
