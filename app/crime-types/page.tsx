"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Scale, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { IssueSubNav } from "@/components/issues/IssueSubNav";
import { ALL_CRIME_TYPES } from "@/lib/classifiers/taxonomy";

interface Issue {
  id: string;
  title: string;
  officeName?: string;
  crimeType?: string;
  region?: string;
  issueScore: number;
  issueLevel: string;
  issueLevelLabel: string;
  spreadLabel: string;
  articleCount: number;
  sourceCount: number;
  scoreReasons?: string[];
  highlighted?: boolean;
}

interface Group {
  type: string;
  issues: Issue[];
  articleCount: number;
  topOffices: { name: string; count: number }[];
  headline?: Issue;
  keywords: string[];
}

function topCount(arr: string[], n: number): { name: string; count: number }[] {
  const m = new Map<string, number>();
  arr.forEach((a) => a && m.set(a, (m.get(a) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));
}

// 반복 키워드: scoreReasons 우선, 없으면 제목에서 2글자 이상 명사형 토큰 빈도
function extractKeywords(issues: Issue[]): string[] {
  const reasonHits = issues.flatMap((i) => i.scoreReasons ?? []);
  if (reasonHits.length > 0) {
    return topCount(reasonHits, 6).map((x) => x.name);
  }
  const tokens = issues
    .flatMap((i) => i.title.split(/[\s,·.“”"'()\[\]]+/))
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t));
  return topCount(tokens, 6).map((x) => x.name);
}

export default function CrimeTypesPage() {
  const { data, loading } = useApi<Issue[]>("/api/issues?period=30d");
  // '목록' 화면과 동일 기준(전체 기간·동일 기사 묶음) 기사 수 — 카드 건수와 목록 총계 일치
  const { data: counts } = useApi<Record<string, number>>("/api/crime-type-counts?scope=issue");

  const groups = useMemo<Group[]>(() => {
    const issues = data ?? [];
    const byType = new Map<string, Issue[]>();
    for (const it of issues) {
      const t = it.crimeType || "기타";
      if (!byType.has(t)) byType.set(t, []);
      byType.get(t)!.push(it);
    }
    // ALL_CRIME_TYPES 순서 우선, 그 외 타입은 뒤에
    const order = [...ALL_CRIME_TYPES, ...[...byType.keys()].filter((t) => !ALL_CRIME_TYPES.includes(t))];
    return order
      .filter((t) => byType.has(t))
      .filter((t) => t !== "공판" && t !== "형사사법제도/정책")
      .map((t) => {
        const list = byType.get(t)!;
        const sorted = [...list].sort((a, b) => b.issueScore - a.issueScore);
        return {
          type: t,
          issues: sorted,
          articleCount: list.reduce((s, i) => s + (i.articleCount || 0), 0),
          topOffices: topCount(
            list.map((i) => i.officeName ?? "").filter(Boolean),
            3,
          ),
          headline: sorted[0],
          keywords: extractKeywords(list),
        };
      });
  }, [data]);

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">범죄유형별 보기</h1>
        <p className="text-body-s text-ink-muted">
          언론기사를 범죄유형별로 정리한 화면입니다.
        </p>
      </div>
      <IssueSubNav />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : !groups.length ? (
        <EmptyState
          icon={<Scale className="h-8 w-8" />}
          title="최근 30일 이슈가 없습니다"
          desc="이슈가 수집되면 범죄유형별로 집계됩니다."
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
                  href={`/crime-news?type=${encodeURIComponent(g.type)}&scope=issue`}
                  className="flex shrink-0 items-center text-detail text-blue-60 hover:underline"
                >
                  목록 <ChevronRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-2.5">
                <div className="flex flex-wrap gap-1">
                  <Badge tone="blue">이슈 {g.issues.length}</Badge>
                  <Badge tone="outline">기사 {counts?.[g.type] ?? g.articleCount}</Badge>
                </div>

                {g.headline && (
                  <div>
                    <p className="text-detail text-ink-muted">대표 헤드라인</p>
                    {/* 대표 헤드라인 클릭 = '목록'과 동일 화면 */}
                    <Link
                      href={`/crime-news?type=${encodeURIComponent(g.type)}&scope=issue`}
                      className="line-clamp-2 text-body-s font-medium text-ink-title hover:text-primary hover:underline"
                    >
                      {g.headline.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-1.5 text-detail text-ink-muted">
                      <span>{g.headline.officeName ?? "관할 추정"}</span>·<span>파급도 {g.headline.issueScore}/100</span>
                    </div>
                  </div>
                )}

                {g.topOffices.length > 0 && (
                  <div>
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
