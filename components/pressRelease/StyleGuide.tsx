"use client";
import { BookOpen, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState, Separator } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";

interface Pattern {
  patternName: string;
  description?: string;
  examples?: string[];
  structure?: string[];
  toneRules?: string[];
  forbiddenExpressions?: string[];
  preferredExpressions?: string[];
  titlePatternType?: string;
}
interface StyleGuideData {
  patterns: Pattern[];
  aggregate: {
    commonSections?: string[];
    commonToneRules?: string[];
    titlePatternDistribution?: Record<string, number>;
  };
  referenceCount: number;
}

function ListBlock({ title, items, tone }: { title: string; items?: string[]; tone?: "good" | "bad" }) {
  if (!items || items.length === 0) return null;
  const Icon = tone === "bad" ? X : tone === "good" ? Check : null;
  const color = tone === "bad" ? "text-danger" : tone === "good" ? "text-success" : "text-ink-body";
  return (
    <div>
      <p className="mb-1 text-detail font-medium text-ink-title">{title}</p>
      <ul className="space-y-0.5">
        {items.map((it, i) => (
          <li key={i} className={`flex items-start gap-1.5 text-detail ${color}`}>
            {Icon ? <Icon className="mt-0.5 h-3 w-3 shrink-0" /> : <span className="text-ink-disabled">·</span>}
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StyleGuide() {
  const { data, loading } = useApi<StyleGuideData>("/api/press-releases/style-guide");

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Spinner className="h-6 w-6" />
      </div>
    );
  if (!data || data.patterns.length === 0)
    return (
      <EmptyState
        icon={<BookOpen className="h-8 w-8" />}
        title="분석된 스타일 패턴이 없습니다"
        desc="레퍼런스를 수집한 뒤 ‘스타일 재분석’을 실행하세요."
      />
    );

  const dist = data.aggregate.titlePatternDistribution ?? {};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>전체 요약</CardTitle>
          <span className="text-detail text-ink-muted">레퍼런스 {data.referenceCount}건 기반</span>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <ListBlock title="공통 구조 섹션" items={data.aggregate.commonSections} />
          <ListBlock title="공통 문체 규칙" items={data.aggregate.commonToneRules} />
          <div>
            <p className="mb-1 text-detail font-medium text-ink-title">제목 패턴 분포</p>
            {Object.keys(dist).length === 0 ? (
              <p className="text-detail text-ink-disabled">-</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {Object.entries(dist).map(([k, v]) => (
                  <Badge key={k} tone="navy">
                    {k} {v}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.patterns.map((p, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="min-w-0 truncate">{p.patternName}</CardTitle>
              {p.titlePatternType && <Badge tone="navy">{p.titlePatternType}</Badge>}
            </CardHeader>
            <CardContent className="space-y-3">
              {p.description && <p className="text-detail leading-relaxed text-ink-body">{p.description}</p>}
              <ListBlock title="구조" items={p.structure} />
              <ListBlock title="문체 규칙" items={p.toneRules} />
              {(p.preferredExpressions?.length || p.forbiddenExpressions?.length) && <Separator />}
              <ListBlock title="권장 표현" items={p.preferredExpressions} tone="good" />
              <ListBlock title="지양 표현" items={p.forbiddenExpressions} tone="bad" />
              {p.examples && p.examples.length > 0 && (
                <div>
                  <p className="mb-1 text-detail font-medium text-ink-title">제목 예시</p>
                  <ul className="space-y-0.5">
                    {p.examples.map((ex, ei) => (
                      <li key={ei} className="text-detail text-ink-muted">
                        “{ex}”
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
