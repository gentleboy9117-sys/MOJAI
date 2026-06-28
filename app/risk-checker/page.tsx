"use client";
import { useState } from "react";
import { ShieldAlert, ShieldCheck, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Spinner, EmptyState, Separator } from "@/components/ui/misc";
import { apiPost } from "@/lib/client/api";
import type { Tone } from "@/lib/client/labels";

interface Finding {
  originalText: string;
  riskType: string;
  suggestedText?: string;
  reason?: string;
  severity?: string;
}
interface RiskResult {
  riskLevel: string;
  findings: Finding[];
  summary?: string;
}
interface RewriteResult {
  text: string;
  changes: { from: string; to: string; riskType: string }[];
}

const RISK_LABEL: Record<string, string> = { none: "위험 표현 없음", low: "낮음", medium: "주의", high: "높음" };
function riskTone(level: string): Tone {
  if (level === "high") return "danger";
  if (level === "medium") return "warning";
  if (level === "low") return "info";
  return "success";
}
const RISK_TYPE_LABEL: Record<string, string> = {
  PRESUMPTION_OF_GUILT: "유죄 단정",
  GUILT: "유죄 단정",
  CRIMINAL_FACT: "피의사실 단정",
  PRIVACY: "개인정보 노출",
  PERSONAL_INFO: "개인정보 노출",
  DEFAMATION: "명예훼손 소지",
  EXAGGERATION: "과장 표현",
};
function riskTypeLabel(t: string): string {
  return RISK_TYPE_LABEL[t] ?? t;
}

export default function RiskCheckerPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<RiskResult | null>(null);
  const [changes, setChanges] = useState<RewriteResult["changes"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setChanges(null);
    try {
      const r = await apiPost<RiskResult>("/api/reports/safety-check", { text });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "점검에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function rewriteAll() {
    if (!text.trim()) return;
    setRewriting(true);
    setError(null);
    try {
      const r = await apiPost<RewriteResult>("/api/reports/rewrite", { text });
      setText(r.text);
      setChanges(r.changes);
      // 완화 후 자동 재점검
      const re = await apiPost<RiskResult>("/api/reports/safety-check", { text: r.text });
      setResult(re);
    } catch (e) {
      setError(e instanceof Error ? e.message : "완화 적용에 실패했습니다.");
    } finally {
      setRewriting(false);
    }
  }

  const findings = result?.findings ?? [];

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">문장 리스크 점검</h1>
        <p className="text-body-s text-ink-muted">
          보고서·보도자료 문장을 붙여넣으면 피의사실·유죄 단정, 개인정보, 명예훼손 소지, 과장 표현을 자동 점검합니다(법적 판단 아님).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>점검할 문장</CardTitle>
            <span className="text-detail text-ink-muted">보고서/보도자료 공통</span>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="예: A씨는 사기 범행을 저질렀다. (피의사실·유죄 단정 표현 점검)"
              className="min-h-[260px]"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={check} disabled={loading || rewriting || !text.trim()}>
                {loading ? <Spinner className="border-white/40 border-t-white" /> : null}
                {loading ? "점검 중…" : "점검"}
              </Button>
              <Button
                variant="secondary"
                onClick={rewriteAll}
                disabled={loading || rewriting || !text.trim()}
              >
                {rewriting ? <Spinner /> : <Wand2 className="h-4 w-4" />} 전체 완화 적용
              </Button>
            </div>
            <p className="text-detail text-ink-muted">
              ‘전체 완화 적용’은 위험 표현을 보다 신중한 표현(추정·혐의·A씨 등)으로 바꾼 초안을 만들어 줍니다. 결과는 담당자 검토가 필요합니다.
            </p>
            {error && (
              <p className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-detail text-danger">{error}</p>
            )}
            {changes && changes.length > 0 && (
              <div className="rounded-md border border-blue-20 bg-blue-5 p-3">
                <p className="mb-1.5 text-detail font-medium text-blue-70">완화된 표현 {changes.length}건</p>
                <ul className="space-y-1">
                  {changes.map((c, i) => (
                    <li key={i} className="text-detail text-ink-body">
                      <span className="text-ink-muted line-through">{c.from}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium text-blue-70">{c.to}</span>
                      <Badge tone="outline" className="ml-1.5">
                        {riskTypeLabel(c.riskType)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              {result && result.riskLevel !== "none" ? (
                <ShieldAlert className="h-4 w-4 text-warning" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-success" />
              )}
              점검 결과
            </CardTitle>
            {result && <Badge tone={riskTone(result.riskLevel)}>{RISK_LABEL[result.riskLevel] ?? result.riskLevel}</Badge>}
          </CardHeader>
          <CardContent className="space-y-3">
            {!result ? (
              <EmptyState title="아직 점검하지 않았습니다" desc="좌측에 문장을 입력하고 ‘점검’을 눌러 주세요." />
            ) : (
              <>
                {result.summary && <p className="text-body-s text-ink-body">{result.summary}</p>}
                <Separator />
                {findings.length === 0 ? (
                  <p className="rounded-md border border-success/30 bg-success-bg px-3 py-2 text-detail text-success">
                    점검된 위험 표현이 없습니다. 대외 공개 전 담당자 확인을 권장합니다.
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
