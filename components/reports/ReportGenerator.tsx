"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileBarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Select, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { apiGet, apiPost } from "@/lib/client/api";
import { REPORT_TYPES, type ReportType } from "@/lib/report/reportTemplates";
import { ALL_CRIME_TYPES } from "@/lib/classifiers/taxonomy";
import { ReportTypeSelector } from "./ReportTypeSelector";
import { ReportViewer, type ReportData } from "./ReportViewer";

type Period = "today" | "7d" | "30d" | "all";
const PERIOD_LABEL: Record<Period, string> = { today: "오늘", "7d": "최근 7일", "30d": "최근 30일", all: "전체 기간" };

export function ReportGenerator() {
  const params = useSearchParams();
  const reportId = params.get("report");

  const [reportType, setReportType] = useState<ReportType>("EXEC_SUMMARY");
  const [period, setPeriod] = useState<Period>("7d");
  const [office, setOffice] = useState("");
  const [region, setRegion] = useState("");
  const [crimeType, setCrimeType] = useState("");

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ?report=<id> 로 진입 시 기존 보고서 로드
  useEffect(() => {
    if (!reportId) return;
    let on = true;
    setLoading(true);
    setError(null);
    apiGet<ReportData>(`/api/reports/${reportId}`)
      .then((d) => {
        if (!on) return;
        setReport(d);
        if (d.reportType) setReportType(d.reportType as ReportType);
      })
      .catch((e) => on && setError(e.message))
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [reportId]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<ReportData>("/api/reports/generate", {
        reportType,
        period,
        filters: {
          officeName: office || undefined,
          region: region || undefined,
          crimeType: crimeType || undefined,
        },
      });
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "보고서 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const currentMeta = REPORT_TYPES.find((t) => t.key === reportType);

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <FileBarChart className="h-4 w-4 text-primary" /> 보고서 유형
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportTypeSelector value={reportType} onChange={setReportType} disabled={loading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>대상 범위</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="rpt-period">기간</Label>
              <Select id="rpt-period" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
                {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                  <option key={p} value={p}>
                    {PERIOD_LABEL[p]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="rpt-office">검찰청 (선택)</Label>
              <Input
                id="rpt-office"
                value={office}
                onChange={(e) => setOffice(e.target.value)}
                placeholder="예: 서울중앙지방검찰청"
              />
            </div>
            <div>
              <Label htmlFor="rpt-region">지역 (선택)</Label>
              <Input id="rpt-region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="예: 서울" />
            </div>
            <div>
              <Label htmlFor="rpt-crime">범죄유형 (선택)</Label>
              <Select id="rpt-crime" value={crimeType} onChange={(e) => setCrimeType(e.target.value)}>
                <option value="">전체</option>
                {ALL_CRIME_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <Button className="w-full" onClick={generate} disabled={loading}>
              {loading ? <Spinner className="border-white/40 border-t-white" /> : null}
              {loading ? "생성 중…" : "보고서 생성"}
            </Button>
            {currentMeta && (
              <p className="text-detail text-ink-muted">
                대상: {currentMeta.audience} · {currentMeta.short}
              </p>
            )}
            {error && (
              <p className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-detail text-danger">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>

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
