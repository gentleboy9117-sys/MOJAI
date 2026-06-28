"use client";
import { Database, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";

interface SourceStatus {
  sourceName: string;
  region: string | null;
  listUrl: string;
  supported: boolean;
  lastCollectedAt: string | null;
  lastSuccess: boolean;
  collectedCount: number;
  latestPostDate: string | null;
  latestEventDate: string | null;
  message: string | null;
}
interface SourcesResponse {
  totalSources: number;
  okSources: number;
  lastCollectedAt: string | null;
  sources: SourceStatus[];
}

function fmtDate(v: string | null): string {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function fmtDateTime(v: string | null): string {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** [공안] 지방청 게시판 출처별 수집 현황 — '정보가 언제까지 반영됐는지' 표시 */
export function AssemblySourceStatusPanel() {
  const { data, loading, refetch } = useApi<SourcesResponse>("/api/public-safety/sources");
  const d = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Database className="h-4 w-4 text-primary" /> 수집 현황 · 정보 반영 시각
        </CardTitle>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1 text-detail text-ink-muted hover:text-ink-body"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 새로고침
        </button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 text-center"><Spinner /></div>
        ) : !d ? (
          <p className="py-4 text-center text-body-s text-ink-disabled">수집 현황이 없습니다. 자동 수집 후 표시됩니다.</p>
        ) : (
          <>
            <p className="mb-3 text-body-s text-ink-muted">
              전국 <b className="text-ink-title">{d.totalSources}</b>개 지방경찰청 중{" "}
              <b className="text-primary">{d.okSources}</b>곳 수집 성공 · 마지막 수집{" "}
              <b className="text-ink-title">{fmtDateTime(d.lastCollectedAt)}</b>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-detail">
                <thead>
                  <tr className="border-b border-line text-left text-ink-muted">
                    <th className="px-2 py-1.5 font-medium">지방청</th>
                    <th className="px-2 py-1.5 font-medium">상태</th>
                    <th className="px-2 py-1.5 font-medium">수집 건수</th>
                    <th className="px-2 py-1.5 font-medium">반영된 최신 집회일</th>
                    <th className="px-2 py-1.5 font-medium">마지막 수집</th>
                    <th className="px-2 py-1.5 font-medium">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {d.sources.map((s) => (
                    <tr key={s.sourceName} className="border-b border-line/60">
                      <td className="px-2 py-1.5">
                        <a href={s.listUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink-body hover:text-primary">
                          {s.sourceName} <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                      </td>
                      <td className="px-2 py-1.5">
                        {s.lastSuccess ? (
                          <span className="rounded bg-success/10 px-1.5 py-0.5 text-success">수집됨</span>
                        ) : (
                          <span className="rounded bg-danger/10 px-1.5 py-0.5 text-danger">미수집</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 tabular-nums">{s.collectedCount}</td>
                      <td className="px-2 py-1.5 tabular-nums text-ink-title">{fmtDate(s.latestEventDate)}</td>
                      <td className="px-2 py-1.5 tabular-nums text-ink-muted">{fmtDateTime(s.lastCollectedAt)}</td>
                      <td className="px-2 py-1.5 text-ink-disabled">{s.lastSuccess ? "" : s.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-detail text-ink-disabled">
              · '반영된 최신 집회일'은 각 지방청 게시판에서 수집된 공지 중 가장 최근 집회 예정일입니다. 미수집 지방청은 게시판 구조(JS/프레임)로 별도 파서가 필요합니다.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
