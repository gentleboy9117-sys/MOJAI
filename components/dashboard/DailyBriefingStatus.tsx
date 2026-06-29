"use client";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { formatDateTime } from "@/lib/utils";

interface Briefing {
  runAt: string; status: string; articleCount: number; issueCount: number; reviewNeededCount: number; reportId?: string | null;
}

export function DailyBriefingStatus() {
  const { data, loading } = useApi<Briefing | null>("/api/dashboard/briefing-status");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> 최근 자동 브리핑</CardTitle>
        <span className="text-detail text-ink-muted">매일 오전 8시 자동 실행(MVP: 수동/스크립트)</span>
      </CardHeader>
      <CardContent>
        {loading ? <Spinner /> : !data ? (
          <p className="text-body-s text-ink-muted">실행 이력이 없습니다. <code className="text-detail">npm run briefing</code> 으로 생성하세요.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Field label="마지막 실행" value={formatDateTime(data.runAt)} />
            <Field label="수집 기사" value={`${data.articleCount}건`} />
            <Field label="생성 이슈" value={`${data.issueCount}건`} />
          </div>
        )}
        {data?.reportId && (
          <Link href={`/reports?report=${data.reportId}`} className="mt-3 inline-block text-body-s font-medium text-blue-60 hover:underline">생성된 브리핑 보고서 보기 →</Link>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-detail text-ink-muted">{label}</p>
      <p className={`text-body font-bold text-ink-title ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
