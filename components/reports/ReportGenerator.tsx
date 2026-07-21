"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileBarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { apiGet, apiPost } from "@/lib/client/api";
import { useApi } from "@/lib/client/useApi";
import { ALL_CRIME_TYPES } from "@/lib/classifiers/taxonomy";
import { OFFICE_ORDER } from "@/lib/publicSafety/assemblyJurisdictionClassifier";
import { ReportViewer, type ReportData } from "./ReportViewer";

type Period = "today" | "7d" | "30d" | "all";
const PERIOD_LABEL: Record<Period, string> = { today: "오늘", "7d": "최근 7일", "30d": "최근 30일", all: "전체 기간" };

interface OfficeLite { id: string; name: string; type: string }

/** 브리핑 생성 — 기관장용 1페이지 요약(EXEC_SUMMARY) 고정 */
export function ReportGenerator({ fixedCrimeType }: { fixedCrimeType?: string } = {}) {
  const params = useSearchParams();
  const reportId = params.get("report");

  const [period, setPeriod] = useState<Period>("7d");
  const [office, setOffice] = useState("");
  const [crimeType, setCrimeType] = useState(fixedCrimeType ?? "");

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 전국 검찰청 목록(객관식 선택) — 조직 체계 순서
  const { data: offices } = useApi<OfficeLite[]>("/api/offices");
  const officeOptions = useMemo(() => {
    const ord = (n: string) => OFFICE_ORDER[n] ?? 9999;
    return [...(offices ?? [])].sort((a, b) => ord(a.name) - ord(b.name));
  }, [offices]);

  // ?report=<id> 로 진입 시 기존 보고서 로드
  useEffect(() => {
    if (!reportId) return;
    let on = true;
    setLoading(true);
    setError(null);
    apiGet<ReportData>(`/api/reports/${reportId}`)
      .then((d) => { if (on) setReport(d); })
      .catch((e) => on && setError(e.message))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [reportId]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<ReportData>("/api/reports/generate", {
        reportType: "EXEC_SUMMARY",
        period,
        filters: {
          officeName: office || undefined,
          crimeType: crimeType || undefined,
        },
      });
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "브리핑 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <FileBarChart className="h-4 w-4 text-primary" /> 브리핑 생성
          </CardTitle>
          <span className="text-detail text-ink-muted">기관장용 1페이지 요약</span>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="rpt-period">기간</Label>
              <Select id="rpt-period" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
                {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                  <option key={p} value={p}>{PERIOD_LABEL[p]}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="rpt-office">검찰청 (선택)</Label>
              <Select id="rpt-office" value={office} onChange={(e) => setOffice(e.target.value)}>
                <option value="">전국(전체)</option>
                {officeOptions.map((o) => (
                  <option key={o.id} value={o.name}>{o.name}</option>
                ))}
              </Select>
            </div>
            {!fixedCrimeType && (
              <div>
                <Label htmlFor="rpt-crime">범죄유형 (선택)</Label>
                <Select id="rpt-crime" value={crimeType} onChange={(e) => setCrimeType(e.target.value)}>
                  <option value="">전체</option>
                  {ALL_CRIME_TYPES.filter((c) => c !== "공판").map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>
          <Button className="mt-3 w-full" onClick={generate} disabled={loading}>
            {loading ? <Spinner className="border-white/40 border-t-white" /> : null}
            {loading ? "생성 중…" : "브리핑 생성"}
          </Button>
          {error && (
            <p className="mt-2 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-detail text-danger">{error}</p>
          )}
        </CardContent>
      </Card>

      <div className="min-w-0">
        {loading && !report ? (
          <Card className="min-h-[420px]">
            <CardContent className="flex h-full items-center justify-center">
              <Spinner className="h-6 w-6" />
            </CardContent>
          </Card>
        ) : (
          <ReportViewer report={report} />
        )}
      </div>
    </div>
  );
}
