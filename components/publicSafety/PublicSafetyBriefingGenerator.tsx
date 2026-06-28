"use client";
import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { apiPost, getDevUser } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { ReportViewer, type ReportData } from "@/components/reports/ReportViewer";
import { PUBLIC_SAFETY_BRIEFING_TYPES, type PublicSafetyBriefingType } from "@/lib/publicSafety/publicSafetyBriefingGenerator";

/** [공안] 공안 브리핑 생성기 (유형 선택 + 미리보기 + 다운로드) */
export function PublicSafetyBriefingGenerator() {
  const [type, setType] = useState<PublicSafetyBriefingType>("DAILY");
  const [briefing, setBriefing] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canAct = getDevUser().role !== "VIEWER";

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<ReportData>("/api/public-safety/briefings/generate", {
        briefingType: type,
      });
      setBriefing(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "브리핑 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-primary" /> 브리핑 유형
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PUBLIC_SAFETY_BRIEFING_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                disabled={loading}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  type === t.key
                    ? "border-primary bg-blue-5 ring-1 ring-primary"
                    : "border-line bg-white hover:bg-gray-5",
                )}
              >
                <p className="text-body-s font-semibold text-ink-title">{t.label}</p>
                <p className="mt-0.5 text-detail text-ink-muted">{t.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>생성</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>공개자료·공개 보도 기준으로 참고용 브리핑 초안을 생성합니다.</Label>
            {canAct ? (
              <Button className="w-full" onClick={generate} disabled={loading}>
                {loading ? <Spinner className="border-white/40 border-t-white" /> : null}
                {loading ? "생성 중…" : "공안 브리핑 생성"}
              </Button>
            ) : (
              <p className="rounded-md border border-line bg-gray-5 px-3 py-2 text-detail text-ink-muted">
                브리핑 생성은 분석관 이상 권한이 필요합니다(상단 사용자 전환).
              </p>
            )}
            {error && (
              <p className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-detail text-danger">
                {error}
              </p>
            )}
            <p className="text-detail text-ink-disabled">
              집회·시위는 헌법상 기본권 행사일 수 있으며, 본 브리핑은 참고용입니다. 최종 판단은 담당자.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0">
        {loading && !briefing ? (
          <Card className="min-h-[420px]">
            <CardContent className="flex h-full items-center justify-center">
              <Spinner className="h-6 w-6" />
            </CardContent>
          </Card>
        ) : (
          <ReportViewer report={briefing} />
        )}
      </div>
    </div>
  );
}
