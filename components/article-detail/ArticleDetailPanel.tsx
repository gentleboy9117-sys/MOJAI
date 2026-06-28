"use client";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Lock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { apiPost, getDevUser } from "@/lib/client/api";
import { formatDate } from "@/lib/utils";
import { issueLevelTone } from "@/lib/client/labels";
import { SourcePermissionBadge } from "@/components/issues/SourcePermissionBadge";
import { ClassificationReason } from "@/components/issues/ClassificationReason";
import { HumanReviewPanel } from "@/components/issues/HumanReviewPanel";
import { useState } from "react";

interface ArticleDetail {
  id: string; title: string; sourceName: string; sourceType: string; publishedAt: string; originalUrl: string;
  summary?: string; fullText?: string | null; restricted: boolean; canDisplayFullText: boolean; licenseType: string; copyrightNotice?: string;
  crimeType?: string; crimeSubtype?: string; classifyConfidence?: number; officeConfidence?: number;
  issueLevel?: string; issueLevelLabel?: string; needsHumanReview: boolean; reviewReasons: string[]; keywords: string[];
  primaryOffice?: { officeName: string; matchLabel: string; inferred: boolean; officeId: string } | null;
  classificationReasons: string[];
  entities: { type: string; label: string; items: string[] }[];
  legalMatches: { keyword: string; category: string; confidence: number; evidenceText?: string }[];
  legalDisclaimer: string;
  issueCluster?: { id: string; title: string } | null;
}

export function ArticleDetailPanel({ articleId, onBack, onOpenIssue }: { articleId: string; onBack?: () => void; onOpenIssue?: (id: string) => void }) {
  const { data: a, loading, refetch } = useApi<ArticleDetail>(`/api/articles/${articleId}`);
  const [added, setAdded] = useState(false);
  const canAct = getDevUser().role !== "VIEWER";

  if (loading) return <div className="p-6"><Spinner /></div>;
  if (!a) return <div className="p-6 text-body-s text-ink-muted">기사를 불러올 수 없습니다.</div>;

  // 실제 클릭 가능한 원문 URL인지(샘플/가짜 URL 제외)
  const realUrl = !!a.originalUrl && /^https?:\/\//i.test(a.originalUrl) && !/(example|\.invalid|\/sample\/|localhost)/i.test(a.originalUrl);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        {onBack && <button onClick={onBack} className="flex items-center gap-1 text-detail text-ink-muted hover:text-ink-title"><ArrowLeft className="h-3.5 w-3.5" /> 이슈로</button>}
        <span className="ml-auto text-detail text-ink-disabled">기사 상세</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
        <div>
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {a.needsHumanReview && <Badge tone="warning">검토 필요</Badge>}
            {a.issueLevelLabel && <Badge tone={issueLevelTone(a.issueLevel)}>보도 파급도 {a.issueLevelLabel}</Badge>}
          </div>
          <h2 className="text-heading-s leading-snug text-ink-title">{a.title}</h2>
          <p className="mt-1 text-detail text-ink-muted">{a.sourceName} · {formatDate(a.publishedAt)}</p>
        </div>

        <SourcePermissionBadge sourceType={a.sourceType} licenseType={a.licenseType} canDisplayFullText={a.canDisplayFullText} />

        <div className="flex flex-wrap gap-1.5">
          <Badge tone="navy">{a.primaryOffice?.officeName ?? "관할 추정"}</Badge>
          {a.primaryOffice?.inferred && <Badge tone="warning">관할 추정</Badge>}
          <Badge tone="blue">{a.crimeType ?? "유형 미상"}{a.crimeSubtype ? ` · ${a.crimeSubtype}` : ""}</Badge>
        </div>

        {a.summary && (
          <div>
            <p className="mb-1 text-label font-semibold text-ink-title">AI 요약</p>
            <p className="rounded-md bg-gray-5 p-2.5 text-detail leading-relaxed text-ink-body">{a.summary}</p>
          </div>
        )}

        <ClassificationReason reasons={a.classificationReasons} inferred={a.primaryOffice?.inferred} officeConfidence={a.officeConfidence} crimeConfidence={a.classifyConfidence} />

        {/* 주요 엔티티 */}
        {a.entities.length > 0 && (
          <div>
            <p className="mb-1 text-label font-semibold text-ink-title">주요 키워드 <span className="font-normal text-detail text-ink-disabled">(클릭 시 모아보기)</span></p>
            <div className="space-y-1.5">
              {a.entities.map((g) => (
                <div key={g.type} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-detail text-ink-muted">{g.label}:</span>
                  {g.items.slice(0, 8).map((it, i) => (
                    <Link key={i} href={`/issues?keyword=${encodeURIComponent(it)}`}>
                      <Badge tone="outline" className="cursor-pointer hover:border-primary hover:bg-navy-5">{it}</Badge>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 참고 법령 키워드 */}
        {a.legalMatches.length > 0 && (
          <div>
            <p className="mb-1 text-label font-semibold text-ink-title">관련 가능 법령 키워드</p>
            <div className="flex flex-wrap gap-1.5">
              {a.legalMatches.map((l, i) => <Badge key={i} tone="navy" title={l.evidenceText ?? ""}>{l.keyword}</Badge>)}
            </div>
            <p className="mt-1 text-detail text-ink-disabled">{a.legalDisclaimer}</p>
          </div>
        )}

        {/* 원문 본문 또는 표시 제한 fallback */}
        <div>
          <p className="mb-1 text-label font-semibold text-ink-title">원문 본문</p>
          {a.restricted ? (
            <div className="rounded-md border border-danger/30 bg-danger-bg p-3">
              <p className="flex items-center gap-1.5 text-body-s font-medium text-danger"><Lock className="h-4 w-4" /> 원문 표시 권한이 없습니다</p>
              <p className="mt-1 text-detail text-ink-body">{a.copyrightNotice ?? "라이선스가 필요한 자료입니다."} 제목·출처·요약·링크만 제공됩니다.</p>
              {realUrl ? (
                <a href={a.originalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-detail font-medium text-blue-60 hover:underline">원문 링크 <ExternalLink className="h-3 w-3" /></a>
              ) : (
                <span className="mt-2 inline-block text-detail text-ink-disabled">원문 링크 없음(샘플 데이터)</span>
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap rounded-md border border-line bg-white p-3 text-body-s leading-relaxed text-ink-body">{a.fullText ?? "(본문 없음)"}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {realUrl ? (
            <a href={a.originalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-detail text-blue-60 hover:underline">원문 보기 <ExternalLink className="h-3 w-3" /></a>
          ) : (
            <span className="text-detail text-ink-disabled">원문 링크 없음(샘플)</span>
          )}
          {a.issueCluster && onOpenIssue && (
            <button onClick={() => onOpenIssue(a.issueCluster!.id)} className="text-detail text-blue-60 hover:underline">소속 이슈 보기 →</button>
          )}
          {canAct && (
            <Button size="sm" variant="secondary" className="ml-auto" disabled={added} onClick={async () => { try { await apiPost(`/api/articles/${a.id}/review`, { includeInReport: true }); setAdded(true); } catch {} }}>
              <Plus className="h-3.5 w-3.5" /> {added ? "보고서에 추가됨" : "보고서에 추가"}
            </Button>
          )}
        </div>

        {/* Human-in-the-loop */}
        <HumanReviewPanel articleId={a.id} currentCrimeType={a.crimeType} currentOfficeId={a.primaryOffice?.officeId} onDone={refetch} />
      </div>
    </div>
  );
}
