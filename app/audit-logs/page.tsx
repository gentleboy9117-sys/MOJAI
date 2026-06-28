"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { apiGet } from "@/lib/client/api";
import { formatDateTime } from "@/lib/utils";
import type { Tone } from "@/lib/client/labels";

interface AuditLog {
  id: string;
  action: string;
  targetType?: string;
  targetId?: string;
  user: string;
  ipAddress?: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_LABEL: Record<string, string> = {
  VIEW_ARTICLE: "기사 조회",
  SEARCH: "검색",
  COLLECT: "기사 수집",
  CLASSIFY: "분류",
  CLASSIFY_BATCH: "일괄 재분류",
  CLUSTER: "클러스터링",
  REVIEW_ARTICLE: "기사 검토",
  GENERATE_REPORT: "보고서 생성",
  SYNC_OFFICES: "검찰청 동기화",
  VIEW_ISSUE: "이슈 조회",
  GENERATE_TREND: "동향 분석 생성",
  CRAWL_PRESS_REF: "레퍼런스 수집",
  ANALYZE_PRESS_STYLE: "스타일 분석",
  GENERATE_PRESS_RELEASE: "보도자료 생성",
  SAFETY_CHECK: "문장 리스크 점검",
  DOWNLOAD: "다운로드",
  DAILY_BRIEFING: "일일 브리핑",
};
function actionLabel(a: string): string {
  return ACTION_LABEL[a] ?? a;
}
function actionTone(a: string): Tone {
  if (a.startsWith("GENERATE")) return "navy";
  if (a === "REVIEW_ARTICLE") return "warning";
  if (a === "COLLECT" || a === "CRAWL_PRESS_REF" || a === "SYNC_OFFICES") return "blue";
  if (a === "CLASSIFY_BATCH" || a === "CLUSTER" || a === "ANALYZE_PRESS_STYLE") return "info";
  if (a === "DOWNLOAD") return "success";
  return "neutral";
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    setLoading(true);
    apiGet<AuditLog[]>("/api/audit-logs?limit=100")
      .then((d) => on && setLogs(d))
      .catch((e: Error) => {
        if (!on) return;
        // 권한 없음 → 안내. 그 외 → 오류 메시지
        if (/권한/.test(e.message)) setForbidden(true);
        else setError(e.message);
      })
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">감사 로그</h1>
        <p className="text-body-s text-ink-muted">조회·수집·생성·다운로드 등 모든 활동 기록 (관리자 전용)</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : forbidden ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Lock className="h-8 w-8" />}
              title="관리자 권한이 필요합니다"
              desc="감사 로그는 관리자만 열람할 수 있습니다. 설정에서 권한을 전환하세요."
            />
            <div className="flex justify-center">
              <Button asChild variant="secondary" size="sm">
                <Link href="/settings">설정으로 이동</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <p className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-detail text-danger">{error}</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> 최근 활동 {logs?.length ?? 0}건
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!logs?.length ? (
              <EmptyState title="기록된 활동이 없습니다" />
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-body-s">
                  <thead>
                    <tr className="border-b border-line bg-gray-5 text-left text-detail text-ink-muted">
                      <th className="px-3 py-2 font-medium">시각</th>
                      <th className="px-3 py-2 font-medium">사용자</th>
                      <th className="px-3 py-2 font-medium">액션</th>
                      <th className="px-3 py-2 font-medium">대상</th>
                      <th className="px-3 py-2 font-medium">IP</th>
                      <th className="px-3 py-2 font-medium">메타</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {logs.map((l) => (
                      <tr key={l.id} className="align-top hover:bg-gray-5">
                        <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{formatDateTime(l.createdAt)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-ink-body">{l.user}</td>
                        <td className="px-3 py-2">
                          <Badge tone={actionTone(l.action)}>{actionLabel(l.action)}</Badge>
                        </td>
                        <td className="px-3 py-2 text-ink-muted">
                          {l.targetType ? (
                            <span>
                              {l.targetType}
                              {l.targetId ? <span className="text-ink-disabled"> · {l.targetId.slice(0, 8)}</span> : null}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{l.ipAddress ?? "-"}</td>
                        <td className="px-3 py-2 text-detail text-ink-muted">
                          {l.metadata && Object.keys(l.metadata).length > 0 ? (
                            <code className="break-all">{JSON.stringify(l.metadata)}</code>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
