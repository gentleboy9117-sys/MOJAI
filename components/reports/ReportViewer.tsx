"use client";
import { marked } from "marked";
import { Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Separator } from "@/components/ui/misc";

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
            title="브리핑을 생성해 주세요"
            desc="위에서 기간·검찰청 등 조건을 선택한 뒤 '브리핑 생성'을 누르면 초안이 표시됩니다."
          />
        </CardContent>
      </Card>
    );
  }


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

    </div>
  );
}
