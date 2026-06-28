"use client";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";

interface Alert {
  crimeType: string; recentCount: number; baselineAvg: number; increaseRatio: number; severity: string; sampleOffices: string[];
}

export function TrendAlerts() {
  const { data, loading } = useApi<Alert[]>("/api/dashboard/trend-alerts");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-warning" /> 공개 보도량 증가 감지</CardTitle>
        <span className="text-detail text-ink-muted">최근 24시간 vs 7일 평균 · 공개 보도량 기준</span>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? <Spinner /> : !data?.length ? (
          <EmptyState title="유의미한 증가 감지 없음" desc="최근 24시간 공개 보도량이 평소 범위입니다." />
        ) : (
          data.map((a) => (
            <div key={a.crimeType} className="flex items-center justify-between gap-2 rounded-md border border-line bg-gray-5 px-3 py-2">
              <div className="min-w-0">
                <p className="text-body-s font-medium text-ink-title">
                  ‘{a.crimeType}’ 관련 보도량 <span className="text-warning">{a.increaseRatio.toFixed(1)}배</span> 증가
                </p>
                <p className="truncate text-detail text-ink-muted">
                  최근 24h {a.recentCount}건 / 7일 평균 {a.baselineAvg.toFixed(1)}건 · 주요 관할: {a.sampleOffices.join(", ") || "추정"}
                </p>
              </div>
              <Badge tone={a.severity === "elevated" ? "danger" : "warning"}>증가 감지</Badge>
            </div>
          ))
        )}
        <p className="pt-1 text-detail text-ink-disabled">※ ‘범죄 발생 급증’이 아니라 공개 보도량 기준 증가입니다.</p>
      </CardContent>
    </Card>
  );
}
