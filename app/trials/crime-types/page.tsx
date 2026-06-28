"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Scale, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { TrialSubNav } from "@/components/trials/TrialSubNav";

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

interface Group {
  type: string;
  articles: ArticleRow[];
  topOffices: { name: string; count: number }[];
  headline?: ArticleRow;
}

function topCount(arr: string[], n: number): { name: string; count: number }[] {
  const m = new Map<string, number>();
  arr.forEach((a) => a && m.set(a, (m.get(a) ?? 0) + 1));
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

export default function TrialCrimeTypesPage() {
  const { data, loading } = useApi<ArticleRow[]>(
    "/api/articles?crimeType=공판&period=all&limit=300",
  );

  const groups = useMemo<Group[]>(() => {
    const rows = data ?? [];
    const byType = new Map<string, ArticleRow[]>();
    for (const r of rows) {
      const t = r.crimeSubtype || "기타";
      if (!byType.has(t)) byType.set(t, []);
      byType.get(t)!.push(r);
    }
    return [...byType.entries()]
      .map(([type, list]) => {
        const headline = [...list].sort((a, b) => {
          if (b.issueScore !== a.issueScore) return b.issueScore - a.issueScore;
          return (
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
          );
        })[0];
        return {
          type,
          articles: list,
          topOffices: topCount(
            list.map((i) => i.primaryOfficeName ?? "").filter(Boolean),
            3,
          ),
          headline,
        };
      })
      .sort((a, b) => b.articles.length - a.articles.length);
  }, [data]);

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">범죄유형별 보기</h1>
        <p className="text-body-s text-ink-muted">
          공판 기사를 기저 범죄유형별로 집계 — 대표 헤드라인 (공개 보도 기준)
        </p>
      </div>
      <TrialSubNav />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : !groups.length ? (
        <EmptyState
          icon={<Scale className="h-8 w-8" />}
          title="공판 관련 보도가 없습니다"
          desc="공판 관련 기사가 수집되면 범죄유형별로 집계됩니다."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.type} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-primary" /> {g.type}
                </CardTitle>
                <Link
                  href={`/crime-news?type=${encodeURIComponent("공판")}&subtype=${encodeURIComponent(g.type)}&scope=trial`}
                  className="flex shrink-0 items-center text-detail text-blue-60 hover:underline"
                >
                  목록 <ChevronRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-2.5">
                <div className="flex flex-wrap gap-1">
                  <Badge tone="blue">기사 {g.articles.length}</Badge>
                </div>

                {g.headline && (
                  <div>
                    <p className="text-detail text-ink-muted">대표 헤드라인</p>
                    <p className="line-clamp-2 text-body-s font-medium text-ink-title">
                      {g.headline.title.split(" - ")[0]}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-detail text-ink-muted">
                      <span>{g.headline.primaryOfficeName ?? "관할 추정"}</span>·
                      <span>파급도 {g.headline.issueScore}/100</span>
                    </div>
                  </div>
                )}

                {g.topOffices.length > 0 && (
                  <div className="mt-auto">
                    <p className="text-detail text-ink-muted">주요 검찰청</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {g.topOffices.map((o) => (
                        <Badge key={o.name} tone="navy">
                          {o.name} {o.count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
