"use client";
import Link from "next/link";
import { Newspaper, Share2, ListTree } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner, ScoreBar } from "@/components/ui/misc";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApi } from "@/lib/client/useApi";
import { formatDate } from "@/lib/utils";
import { issueLevelTone, spreadTone, sourceTone, SOURCE_TYPE_LABEL } from "@/lib/client/labels";
import { IssueTimeline } from "./IssueTimeline";
import { IssueGraph } from "./IssueGraph";

interface IssueDetail {
  id: string; title: string; summary?: string; officeName?: string; crimeType?: string; region?: string;
  metric: { primary: string; basis: string; score: number; level: string; levelLabel: string };
  scoreReasons: string[]; spreadStatus: string; spreadLabel: string;
  firstPublishedAt: string; lastPublishedAt: string; articleCount: number; sourceCount: number; recent24hCount: number;
  crossOffice: boolean; hasOfficialPress: boolean; hasMediaCoverage: boolean;
  articles: { id: string; title: string; sourceName: string; sourceType: string; publishedAt: string; needsHumanReview: boolean; canDisplayFullText: boolean }[];
  timeline: { eventDate: string; eventTitle: string; eventSummary?: string; sourceType?: string }[];
  entities: { type: string; label: string; items: string[] }[];
  legal: { keyword: string; category: string; confidence: number }[];
  graph: { nodes: { id: string; type: string; label: string }[]; edges: { source: string; target: string; type: string }[] };
}

export function IssueDetailPanel({ issueId, onSelectArticle }: { issueId: string; onSelectArticle: (id: string) => void }) {
  const { data: c, loading } = useApi<IssueDetail>(`/api/issues/${issueId}`);
  if (loading) return <div className="p-6"><Spinner /></div>;
  if (!c) return <div className="p-6 text-body-s text-ink-muted">이슈를 불러올 수 없습니다.</div>;

  const scoreToneMap: Record<string, "navy" | "warning" | "danger" | "blue"> = { critical: "danger", high: "warning", medium: "blue", low: "navy" };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-4 py-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={issueLevelTone(c.metric.level)}>보도 파급도 {c.metric.levelLabel}</Badge>
          <Badge tone={spreadTone(c.spreadStatus)}>확산: {c.spreadLabel}</Badge>
          {c.crossOffice && <Badge tone="navy">복수 관할</Badge>}
          {c.hasOfficialPress && c.hasMediaCoverage && <Badge tone="outline">공식+언론</Badge>}
        </div>
        <h2 className="text-heading-s leading-snug text-ink-title">{c.title}</h2>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge tone="navy">{c.officeName ?? "관할 추정"}</Badge>
          <Badge tone="blue">{c.crimeType ?? "유형 미상"}</Badge>
          {c.region && <Badge tone="outline">{c.region}</Badge>}
        </div>
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-detail text-ink-muted">
            <span>{c.metric.primary} ({c.metric.basis})</span>
            <span className="font-semibold text-ink-body">{c.metric.score}/100</span>
          </div>
          <ScoreBar score={c.metric.score} tone={scoreToneMap[c.metric.level] ?? "navy"} />
        </div>
        <p className="mt-2 text-detail text-ink-muted">
          최초 {formatDate(c.firstPublishedAt)} · 최신 {formatDate(c.lastPublishedAt)} · 기사 {c.articleCount} · 출처 {c.sourceCount} · 최근 24h +{c.recent24hCount}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="sticky top-0 z-10 w-full bg-white px-4">
            <TabsTrigger value="overview"><Newspaper className="mr-1 inline h-3.5 w-3.5" />개요</TabsTrigger>
            <TabsTrigger value="timeline"><ListTree className="mr-1 inline h-3.5 w-3.5" />타임라인</TabsTrigger>
            <TabsTrigger value="graph"><Share2 className="mr-1 inline h-3.5 w-3.5" />관계도</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 p-4">
            {c.summary && <p className="rounded-md bg-gray-5 p-2.5 text-detail leading-relaxed text-ink-body">{c.summary}</p>}
            <div>
              <p className="mb-1 text-label font-semibold text-ink-title">보도 파급도 선정 이유</p>
              <ul className="space-y-1">{c.scoreReasons.map((r, i) => <li key={i} className="flex gap-1.5 text-detail text-ink-body"><span className="text-ink-disabled">·</span>{r}</li>)}</ul>
            </div>
            {c.entities.length > 0 && (
              <div>
                <p className="mb-1 text-label font-semibold text-ink-title">주요 키워드 <span className="font-normal text-detail text-ink-disabled">(클릭 시 모아보기)</span></p>
                <div className="space-y-1">{c.entities.slice(0, 5).map((g) => (
                  <div key={g.type} className="flex flex-wrap items-center gap-1"><span className="text-detail text-ink-muted">{g.label}:</span>{g.items.slice(0, 6).map((it, i) => (
                    <Link key={i} href={`/issues?keyword=${encodeURIComponent(it)}`}><Badge tone="outline" className="cursor-pointer hover:border-primary hover:bg-navy-5">{it}</Badge></Link>
                  ))}</div>
                ))}</div>
              </div>
            )}
            {c.legal.length > 0 && (
              <div>
                <p className="mb-1 text-label font-semibold text-ink-title">관련 가능 법령 키워드</p>
                <div className="flex flex-wrap gap-1.5">{c.legal.map((l, i) => <Badge key={i} tone="navy">{l.keyword}</Badge>)}</div>
                <p className="mt-1 text-detail text-ink-disabled">※ 참고용 분류이며 법적 판단이 아닙니다.</p>
              </div>
            )}
            <div>
              <p className="mb-1 text-label font-semibold text-ink-title">관련 기사 {c.articleCount}건</p>
              <ul className="divide-y divide-line rounded-md border border-line">
                {c.articles.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => onSelectArticle(a.id)} className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-gray-5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-s text-ink-title">{a.title}</p>
                        <p className="text-detail text-ink-muted">{a.sourceName} · {formatDate(a.publishedAt)}</p>
                      </div>
                      <Badge tone={sourceTone(a.sourceType)}>{SOURCE_TYPE_LABEL[a.sourceType] ?? a.sourceType}</Badge>
                      {a.needsHumanReview && <Badge tone="warning">검토</Badge>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="p-4">
            <p className="mb-2 text-detail text-ink-muted">보도/공식 발표 기반 사건 흐름입니다. 내부 수사 정보가 아닙니다.</p>
            <IssueTimeline events={c.timeline} />
          </TabsContent>

          <TabsContent value="graph" className="p-4">
            <p className="mb-2 text-detail text-ink-muted">이슈–검찰청–범죄유형–지역–기관–기사 관계도</p>
            <IssueGraph graph={c.graph} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
