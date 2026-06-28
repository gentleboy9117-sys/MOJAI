"use client";
import { Fragment, useEffect, useState } from "react";
import { ExternalLink, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { apiGet } from "@/lib/client/api";
import { formatDate } from "@/lib/utils";

interface RefRow {
  id: string;
  title: string;
  officeName: string;
  publishedAt: string;
  sourceUrl: string;
  titlePatternType?: string;
  snippet?: string;
  attachmentTypes?: string[];
  isUsableForStyleReference: boolean;
}

interface RefDetail {
  id: string;
  title: string;
  officeName: string;
  publishedAt: string;
  sourceUrl: string;
  plainText: string;
  analysis: {
    titlePatternType?: string;
    structureSections?: string[];
    toneRules?: string[];
  };
}

function DetailPanel({ id }: { id: string }) {
  const [detail, setDetail] = useState<RefDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    apiGet<RefDetail>(`/api/press-releases/references/${id}`)
      .then((d) => on && setDetail(d))
      .catch((e) => on && setError(e.message))
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [id]);

  if (loading) return <div className="p-3"><Spinner /></div>;
  if (error) return <p className="p-3 text-detail text-danger">{error}</p>;
  if (!detail) return null;

  return (
    <div className="space-y-3 border-t border-line bg-gray-5 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {detail.analysis.titlePatternType && <Badge tone="navy">제목 패턴: {detail.analysis.titlePatternType}</Badge>}
        <a
          href={detail.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-detail text-blue-60 hover:underline"
        >
          원문 보기 <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      {detail.analysis.structureSections && detail.analysis.structureSections.length > 0 && (
        <div>
          <p className="mb-1 text-detail font-medium text-ink-title">구조 섹션</p>
          <div className="flex flex-wrap gap-1">
            {detail.analysis.structureSections.map((s, i) => (
              <Badge key={i} tone="outline">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {detail.analysis.toneRules && detail.analysis.toneRules.length > 0 && (
        <div>
          <p className="mb-1 text-detail font-medium text-ink-title">문체 규칙</p>
          <ul className="list-disc space-y-0.5 pl-4 text-detail text-ink-body">
            {detail.analysis.toneRules.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="mb-1 text-detail font-medium text-ink-title">본문 (형식·문체 참고용)</p>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-white p-3 text-detail leading-relaxed text-ink-body scrollbar-thin">
          {detail.plainText}
        </pre>
      </div>
    </div>
  );
}

export function ReferenceList() {
  const { data, loading } = useApi<RefRow[]>("/api/press-releases/references");
  const [open, setOpen] = useState<string | null>(null);

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Spinner className="h-6 w-6" />
      </div>
    );
  if (!data?.length)
    return (
      <EmptyState
        icon={<FileText className="h-8 w-8" />}
        title="수집된 레퍼런스가 없습니다"
        desc="상단의 ‘레퍼런스 수집’ 버튼으로 공개 검찰발표자료를 수집하세요."
      />
    );

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-body-s">
            <thead>
              <tr className="border-b border-line bg-gray-5 text-left text-detail text-ink-muted">
                <th className="px-3 py-2 font-medium">제목</th>
                <th className="px-3 py-2 font-medium">청명</th>
                <th className="px-3 py-2 font-medium">작성일</th>
                <th className="px-3 py-2 font-medium">제목 패턴</th>
                <th className="px-3 py-2 font-medium">첨부</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((r) => {
                const isOpen = open === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr
                      className="cursor-pointer hover:bg-gray-5"
                      onClick={() => setOpen(isOpen ? null : r.id)}
                    >
                      <td className="px-3 py-2 font-medium text-ink-title">
                        <div className="flex items-center gap-1.5">
                          {r.title}
                          {!r.isUsableForStyleReference && <Badge tone="outline">참고 제한</Badge>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-ink-muted">{r.officeName}</td>
                      <td className="px-3 py-2 text-ink-muted">{formatDate(r.publishedAt)}</td>
                      <td className="px-3 py-2">
                        {r.titlePatternType ? <Badge tone="navy">{r.titlePatternType}</Badge> : <span className="text-ink-disabled">-</span>}
                      </td>
                      <td className="px-3 py-2 text-ink-muted">
                        {r.attachmentTypes && r.attachmentTypes.length > 0 ? r.attachmentTypes.join(", ") : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-ink-muted">
                        {isOpen ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <DetailPanel id={r.id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
