"use client";
import { ExternalLink, MapPin, CalendarClock, Paperclip, FileText, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { sourceTone, SOURCE_TYPE_LABEL } from "@/lib/client/labels";
import { formatDate, formatDateTime } from "@/lib/utils";
import { AssemblyJurisdictionBadge } from "./AssemblyJurisdictionBadge";
import { AssemblyReviewPanel } from "./AssemblyReviewPanel";
import { RELATION_TYPE_LABEL, relationTypeTone, formatPercent } from "./publicSafetyLabels";

interface RelatedArticle {
  linkId: string;
  articleId: string;
  title: string;
  summary?: string | null;
  sourceName: string;
  sourceType: string;
  publishedAt?: string | null;
  originalUrl?: string | null;
  relationType: string;
  relationConfidence: number;
  relationReason?: string | null;
  matchedKeywords: string[];
  hasLegalIssueMention: boolean;
  legalIssueKeywords: string[];
}

interface AssemblyDetail {
  id: string;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  title: string;
  locationName: string;
  address?: string | null;
  district?: string | null;
  policeStationName?: string | null;
  organizerName?: string | null;
  expectedParticipants?: string | null;
  marchRoute?: string | null;
  topicSummary?: string | null;
  sourceName: string;
  sourceUrl?: string | null;
  sourcePostTitle?: string | null;
  sourcePublishedAt?: string | null;
  attachmentUrls: string[];
  prosecutionOfficeId?: string | null;
  prosecutionOfficeName?: string | null;
  jurisdictionConfidence?: number | null;
  jurisdictionReason?: string | null;
  jurisdictionMethod?: string | null;
  needsHumanReview: boolean;
  reviewReason?: string | null;
  reviewedAt?: string | null;
  relatedArticles: RelatedArticle[];
  hasLegalIssueMention: boolean;
  notice: string;
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-label font-semibold text-ink-title">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

/** [공안] 공개 집회 일정 상세 패널 (우측) */
export function AssemblyEventDetailPanel({
  assemblyId,
  onReviewed,
}: {
  assemblyId: string;
  onReviewed?: () => void;
}) {
  const { data: a, loading, refetch } = useApi<AssemblyDetail>(
    `/api/public-safety/assemblies/${assemblyId}`,
  );

  if (loading)
    return (
      <div className="p-6">
        <Spinner />
      </div>
    );
  if (!a) return <div className="p-6 text-body-s text-ink-muted">공개 일정을 불러올 수 없습니다.</div>;

  const time = a.startTime ? `${a.startTime}${a.endTime ? `~${a.endTime}` : ""}` : "시간 미표기";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="text-detail text-ink-disabled">공개 집회·시위 일정 상세</span>
        <span className="ml-auto flex flex-wrap gap-1.5">
          {a.needsHumanReview && <Badge tone="danger">검토 필요</Badge>}
          {a.hasLegalIssueMention && <Badge tone="warning">법적 이슈 가능성 언급</Badge>}
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
        <div>
          <Badge tone="navy">공개 일정 정보</Badge>
          <h2 className="mt-1.5 text-heading-s leading-snug text-ink-title">{a.title}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-detail text-ink-muted">
            <CalendarClock className="h-3.5 w-3.5" />
            {formatDate(a.eventDate)} · {time}
          </p>
        </div>

        {/* 공개 일정 정보 */}
        <Section title="공개 일정 정보">
          <dl className="space-y-1 rounded-md bg-gray-5 p-3 text-body-s">
            <Row label="장소" value={a.locationName} />
            <Row label="주소" value={a.address ?? "미표기"} />
            <Row label="행정구" value={a.district ?? "미표기"} />
            <Row label="주최(공개자료)" value={a.organizerName ?? "미표기"} />
            <Row label="예상 인원(공개자료)" value={a.expectedParticipants ?? "미표기"} />
            <Row label="행진 경로(공개자료)" value={a.marchRoute ?? "미표기"} />
          </dl>
          {a.topicSummary && (
            <p className="mt-2 rounded-md border border-line bg-white p-2.5 text-detail leading-relaxed text-ink-body">
              {a.topicSummary}
            </p>
          )}
        </Section>

        {/* 장소·관할 */}
        <Section title="장소 · 검찰청 관할" icon={<MapPin className="h-3.5 w-3.5 text-primary" />}>
          <div className="space-y-2 rounded-md border border-line bg-white p-3">
            <AssemblyJurisdictionBadge
              officeName={a.prosecutionOfficeName}
              confidence={a.jurisdictionConfidence}
              method={a.jurisdictionMethod}
              needsHumanReview={a.needsHumanReview}
            />
            {a.jurisdictionReason && (
              <p className="text-detail leading-relaxed text-ink-muted">
                추정 근거: {a.jurisdictionReason}
              </p>
            )}
            {a.policeStationName && (
              <p className="text-detail text-ink-muted">관할 경찰서(공개자료): {a.policeStationName}</p>
            )}
          </div>
        </Section>

        {/* 출처 게시글 */}
        <Section title="출처 게시글" icon={<FileText className="h-3.5 w-3.5 text-primary" />}>
          <div className="rounded-md border border-line bg-white p-3 text-body-s">
            <p className="text-ink-body">
              {a.sourceName}
              {a.sourcePostTitle ? ` · ${a.sourcePostTitle}` : ""}
            </p>
            {a.sourcePublishedAt && (
              <p className="mt-0.5 text-detail text-ink-muted">게시: {formatDateTime(a.sourcePublishedAt)}</p>
            )}
            {a.sourceUrl && (
              <a
                href={a.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-detail text-primary hover:underline"
              >
                공개 게시글 열기 <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </Section>

        {/* 첨부 */}
        {a.attachmentUrls.length > 0 && (
          <Section title="첨부" icon={<Paperclip className="h-3.5 w-3.5 text-primary" />}>
            <ul className="space-y-1">
              {a.attachmentUrls.map((u, i) => (
                <li key={i}>
                  <a
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-detail text-primary hover:underline"
                  >
                    첨부 {i + 1} <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* 관련 보도 */}
        <Section title={`집회 관련 보도 (${a.relatedArticles.length})`}>
          <p className="mb-2 text-detail text-ink-muted">
            관련 보도는 범죄 사실이 아니라 공개 보도입니다. 관련도는 자동 추정치입니다.
          </p>
          {a.relatedArticles.length === 0 ? (
            <p className="rounded-md border border-line bg-gray-5 px-3 py-2 text-detail text-ink-muted">
              연결된 공개 보도가 없습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {a.relatedArticles.map((r) => (
                <li key={r.linkId} className="rounded-md border border-line bg-white p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone={relationTypeTone(r.relationType)}>
                      {RELATION_TYPE_LABEL[r.relationType] ?? r.relationType}
                    </Badge>
                    <Badge tone={sourceTone(r.sourceType)}>
                      {SOURCE_TYPE_LABEL[r.sourceType] ?? r.sourceType}
                    </Badge>
                    <Badge tone="outline">관련도 {formatPercent(r.relationConfidence)}</Badge>
                    {r.hasLegalIssueMention && <Badge tone="warning">법적 이슈 가능성 언급</Badge>}
                  </div>
                  <p className="text-body-s font-medium text-ink-title">{r.title}</p>
                  <p className="mt-0.5 text-detail text-ink-muted">
                    {r.sourceName}
                    {r.publishedAt ? ` · ${formatDate(r.publishedAt)}` : ""}
                  </p>
                  {r.summary && (
                    <p className="mt-1.5 text-detail leading-relaxed text-ink-body">{r.summary}</p>
                  )}
                  {r.relationReason && (
                    <p className="mt-1 text-detail text-ink-muted">근거: {r.relationReason}</p>
                  )}
                  {r.hasLegalIssueMention && r.legalIssueKeywords.length > 0 && (
                    <p className="mt-1 flex items-start gap-1 text-detail text-[#9a6a00]">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      공개 보도 기준 법적 이슈 가능성 언급 키워드: {r.legalIssueKeywords.join(", ")} (확정 아님 · 담당자 검토 필요)
                    </p>
                  )}
                  {r.originalUrl && (
                    <a
                      href={r.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-detail text-primary hover:underline"
                    >
                      보도 원문 <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 검토/수정 */}
        <Section title="담당자 검토">
          {a.reviewedAt && !a.needsHumanReview && (
            <p className="mb-2 rounded-md border border-success/30 bg-success-bg px-3 py-2 text-detail text-success">
              검토 완료 · {formatDateTime(a.reviewedAt)}
            </p>
          )}
          {a.needsHumanReview && a.reviewReason && (
            <p className="mb-2 rounded-md border border-warning/40 bg-warning-bg px-3 py-2 text-detail text-[#9a6a00]">
              {a.reviewReason}
            </p>
          )}
          <AssemblyReviewPanel
            assemblyId={a.id}
            currentOfficeId={a.prosecutionOfficeId}
            onReviewed={() => {
              refetch();
              onReviewed?.();
            }}
          />
        </Section>

        <p className="rounded-md border border-blue-20 bg-blue-5 px-3 py-2 text-detail leading-relaxed text-blue-70">
          {a.notice}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-ink-body">{value}</dd>
    </div>
  );
}
