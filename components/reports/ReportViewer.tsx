"use client";
import { marked } from "marked";
import { Download, ShieldAlert, ShieldCheck, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Separator } from "@/components/ui/misc";
import type { Tone } from "@/lib/client/labels";

export interface SafetyFinding {
  originalText: string;
  riskType: string;
  suggestedText?: string;
  reason?: string;
  severity?: string;
}
export interface SafetyResult {
  riskLevel: string;
  findings: SafetyFinding[];
  summary?: string;
}
export interface ReportData {
  id: string;
  title: string;
  reportType: string;
  markdown: string;
  safety: SafetyResult | null;
  sourceCount?: number;
  issueCount?: number;
  periodStart?: string;
  periodEnd?: string;
  createdAt?: string;
}

const RISK_LABEL: Record<string, string> = {
  none: "위험 표현 없음",
  low: "낮음",
  medium: "주의",
  high: "높음",
};
function riskTone(level: string): Tone {
  if (level === "high") return "danger";
  if (level === "medium") return "warning";
  if (level === "low") return "info";
  return "success";
}

const RISK_TYPE_LABEL: Record<string, string> = {
  PRESUMPTION_OF_GUILT: "유죄 단정",
  GUILT: "유죄 단정",
  PRIVACY: "개인정보 노출",
  PERSONAL_INFO: "개인정보 노출",
  DEFAMATION: "명예훼손 소지",
  EXAGGERATION: "과장 표현",
  CRIMINAL_FACT: "피의사실 단정",
};
function riskTypeLabel(t: string): string {
  return RISK_TYPE_LABEL[t] ?? t;
}

function downloadMarkdown(report: ReportData) {
  const blob = new Blob([report.markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.title || "브리핑보고서"}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ReportViewer({ report }: { report: ReportData | null }) {
  if (!report) {
    return (
      <Card className="min-h-[420px]">
        <CardContent className="flex h-full items-center justify-center">
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="보고서를 생성해 주세요"
            desc="좌측에서 보고서 유형과 기간을 선택한 뒤 '보고서 생성'을 누르면 초안이 표시됩니다."
          />
        </CardContent>
      </Card>
    );
  }

  const safety = report.safety;
  const findings = safety?.findings ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="min-w-0 truncate">{report.title}</CardTitle>
          <Button variant="secondary" size="sm" onClick={() => downloadMarkdown(report)}>
            <Download className="h-4 w-4" /> Markdown 다운로드
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="navy">참고용 자동 생성 브리핑</Badge>
            {report.sourceCount != null && <Badge tone="outline">출처 {report.sourceCount}건</Badge>}
            {report.issueCount != null && <Badge tone="outline">이슈 {report.issueCount}건</Badge>}
          </div>
          <p className="rounded-md border border-warning/40 bg-warning-bg px-3 py-2 text-detail leading-relaxed text-[#9a6a00]">
            본 보고서는 공개 보도 기준으로 자동 생성된 참고용 초안입니다. 중요도 표기는 보도 파급도·조직 대응 참고도이며 범죄 위험도가 아닙니다.
            대외 활용 전 담당자 검토가 필요합니다.
          </p>
          <Separator />
          <article
            className="prose prose-sm max-w-none prose-headings:text-ink-title prose-p:text-ink-body prose-li:text-ink-body prose-strong:text-ink-title prose-table:text-body-s"
            dangerouslySetInnerHTML={{ __html: marked.parse(report.markdown) as string }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            {safety && safety.riskLevel !== "none" ? (
              <ShieldAlert className="h-4 w-4 text-warning" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-success" />
            )}
            문장 리스크 점검 결과
          </CardTitle>
          {safety && <Badge tone={riskTone(safety.riskLevel)}>{RISK_LABEL[safety.riskLevel] ?? safety.riskLevel}</Badge>}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-detail text-ink-muted">
            피의사실·유죄 단정, 개인정보, 명예훼손 소지, 과장 표현을 자동 점검합니다(법적 판단 아님).
          </p>
          {safety?.summary && <p className="text-body-s text-ink-body">{safety.summary}</p>}
          {findings.length === 0 ? (
            <p className="rounded-md border border-success/30 bg-success-bg px-3 py-2 text-detail text-success">
              점검된 위험 표현이 없습니다. 그래도 대외 공개 전 담당자 확인을 권장합니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {findings.map((f, i) => (
                <li key={i} className="rounded-md border border-line bg-gray-5 p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Badge tone="warning">{riskTypeLabel(f.riskType)}</Badge>
                    {f.severity && <Badge tone="outline">{f.severity}</Badge>}
                  </div>
                  <p className="text-detail text-ink-muted">원문</p>
                  <p className="text-body-s text-ink-title">{f.originalText}</p>
                  {f.suggestedText && (
                    <>
                      <p className="mt-1.5 text-detail text-ink-muted">제안</p>
                      <p className="text-body-s font-medium text-blue-70">{f.suggestedText}</p>
                    </>
                  )}
                  {f.reason && <p className="mt-1 text-detail text-ink-muted">사유: {f.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
