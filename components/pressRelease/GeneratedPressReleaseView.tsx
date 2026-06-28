"use client";
import { useState } from "react";
import { marked } from "marked";
import {
  Download,
  Pencil,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Wand2,
  RefreshCw,
  ListChecks,
  MessagesSquare,
  Heading,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { apiPost } from "@/lib/client/api";
import type { Tone } from "@/lib/client/labels";
import {
  type PressReleaseInput,
  type SelectedReference,
  releaseTypeLabel,
  caseStageLabel,
} from "@/lib/pressRelease/types";

export interface GeneratedResult {
  id: string;
  title: string;
  subtitle?: string;
  draftMarkdown: string;
  titleCandidates: string[];
  qa: { q: string; a: string }[];
  checklist: { item: string; checked: boolean }[];
  riskCheck: { riskLevel: string; findings: any[]; summary?: string } | null;
  referenceNote: SelectedReference[];
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

function SummaryRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1 text-detail">
      <span className="w-20 shrink-0 text-ink-muted">{label}</span>
      <span className="min-w-0 flex-1 text-ink-body">{value}</span>
    </div>
  );
}

export function GeneratedPressReleaseView({
  result,
  input,
  onReset,
}: {
  result: GeneratedResult;
  input: PressReleaseInput;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(result.draftMarkdown);
  const [editing, setEditing] = useState(false);
  const [risk, setRisk] = useState(result.riskCheck);
  const [checklist, setChecklist] = useState(result.checklist);
  const [busy, setBusy] = useState<null | "rewrite" | "recheck">(null);
  const [error, setError] = useState<string | null>(null);

  function download() {
    const blob = new Blob([draft], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.title || "보도자료초안"}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function softenDraft() {
    setBusy("rewrite");
    setError(null);
    try {
      const r = await apiPost<{ text: string; changes: any[] }>("/api/press-releases/rewrite", { text: draft });
      setDraft(r.text);
      const re = await apiPost<GeneratedResult["riskCheck"]>("/api/press-releases/safety-check", { text: r.text });
      setRisk(re ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "민감 표현 완화에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function recheck() {
    setBusy("recheck");
    setError(null);
    try {
      const re = await apiPost<GeneratedResult["riskCheck"]>("/api/press-releases/safety-check", { text: draft });
      setRisk(re ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "리스크 재점검에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  const findings = risk?.findings ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-s text-ink-muted">입력하신 사실만으로 생성된 보도자료 초안입니다.</p>
        <Button variant="outline" size="sm" onClick={onReset}>
          새 초안 작성
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* 좌: 입력 요약 + 참고 레퍼런스 + 리스크 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>입력 요약</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <SummaryRow label="발표 주체" value={input.officeName} />
              <SummaryRow label="발표 유형" value={releaseTypeLabel(input.releaseType)} />
              <SummaryRow label="사건 단계" value={caseStageLabel(input.caseStage)} />
              <SummaryRow label="범죄 유형" value={input.crimeType} />
              <SummaryRow label="적용 혐의" value={input.charges} />
              <SummaryRow label="처분 결과" value={input.dispositionResult} />
              <SummaryRow label="피해 규모" value={input.damageScale} />
              <SummaryRow label="공개 범위" value={input.publicScope} />
              {input.legalKeywords.length > 0 && (
                <div className="pt-1.5">
                  <p className="text-detail text-ink-muted">참고 법령 키워드 (법적 판단 아님)</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {input.legalKeywords.map((k) => (
                      <Badge key={k} tone="outline">
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>참고 레퍼런스</CardTitle>
              <span className="text-detail text-ink-muted">형식·문체만</span>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-detail text-ink-muted">
                아래 레퍼런스는 제목·구조·문체 참고용이며 사건 내용은 사용하지 않았습니다.
              </p>
              {result.referenceNote.length === 0 ? (
                <p className="text-detail text-ink-disabled">선정된 레퍼런스가 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {result.referenceNote.map((r) => (
                    <li key={r.id} className="rounded-md border border-line bg-gray-5 p-2">
                      {r.sourceUrl ? (
                        <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-detail font-medium text-blue-70 hover:underline">{r.title} ↗</a>
                      ) : (
                        <p className="text-detail font-medium text-ink-title">{r.title}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {r.officeName && <Badge tone="outline">{r.officeName}</Badge>}
                        {r.titlePatternType && <Badge tone="navy">{r.titlePatternType}</Badge>}
                        <Badge tone="info">유사도 {Math.round(r.similarity * 100)}%</Badge>
                      </div>
                      {r.matchReason && <p className="mt-1 text-detail text-ink-muted">{r.matchReason}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                {risk && risk.riskLevel !== "none" ? (
                  <ShieldAlert className="h-4 w-4 text-warning" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-success" />
                )}
                문장 리스크 결과
              </CardTitle>
              {risk && <Badge tone={riskTone(risk.riskLevel)}>{RISK_LABEL[risk.riskLevel] ?? risk.riskLevel}</Badge>}
            </CardHeader>
            <CardContent className="space-y-2">
              {!risk ? (
                <p className="text-detail text-ink-muted">리스크 점검 결과가 없습니다. 우측에서 재점검할 수 있습니다.</p>
              ) : findings.length === 0 ? (
                <p className="rounded-md border border-success/30 bg-success-bg px-2 py-1.5 text-detail text-success">
                  점검된 위험 표현이 없습니다.
                </p>
              ) : (
                <ul className="space-y-2">
                  {findings.map((f: any, i: number) => (
                    <li key={i} className="rounded-md border border-line bg-gray-5 p-2">
                      <Badge tone="warning">{riskTypeLabel(f.riskType)}</Badge>
                      <p className="mt-1 text-detail text-ink-title">{f.originalText}</p>
                      {f.suggestedText && <p className="mt-0.5 text-detail font-medium text-blue-70">→ {f.suggestedText}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 중: 초안 본문 */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="min-w-0 truncate">{result.title}</CardTitle>
            <div className="flex shrink-0 gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
                {editing ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {editing ? "미리보기" : "편집"}
              </Button>
              <Button variant="secondary" size="sm" onClick={download}>
                <Download className="h-4 w-4" /> .md
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.subtitle && <p className="text-body-s text-ink-muted">{result.subtitle}</p>}
            <div className="rounded-md border border-warning/40 bg-warning-bg px-3 py-2 text-detail font-medium text-[#9a6a00]">
              초안 — 담당자 검토 필요. 본 도구는 기사 내용을 보도자료로 바꾸는 도구가 아니며, 입력하신 공개 가능 사실로 초안을 생성합니다.
            </div>
            {editing ? (
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[460px] font-mono text-detail leading-relaxed"
              />
            ) : (
              <article
                className="prose prose-sm max-w-none prose-headings:text-ink-title prose-p:text-ink-body prose-li:text-ink-body prose-strong:text-ink-title"
                dangerouslySetInnerHTML={{ __html: marked.parse(draft) as string }}
              />
            )}
          </CardContent>
        </Card>

        {/* 우: AI 보조 패널 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI 보조</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="secondary" onClick={softenDraft} disabled={busy !== null}>
                {busy === "rewrite" ? <Spinner /> : <Wand2 className="h-4 w-4" />} 민감 표현 완화
              </Button>
              <Button className="w-full" variant="outline" onClick={recheck} disabled={busy !== null}>
                {busy === "recheck" ? <Spinner /> : <RefreshCw className="h-4 w-4" />} 문장 리스크 재점검
              </Button>
              {error && (
                <p className="rounded-md border border-danger/30 bg-danger-bg px-2 py-1.5 text-detail text-danger">
                  {error}
                </p>
              )}
            </CardContent>
          </Card>

          {result.titleCandidates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <Heading className="h-4 w-4 text-primary" /> 제목 후보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-1.5">
                  {result.titleCandidates.map((t, i) => (
                    <li key={i} className="flex gap-2 text-detail text-ink-body">
                      <span className="font-semibold text-primary">{i + 1}.</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {result.qa.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <MessagesSquare className="h-4 w-4 text-primary" /> 기자 예상 Q&amp;A
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {result.qa.map((qa, i) => (
                    <li key={i}>
                      <p className="text-detail font-medium text-ink-title">Q. {qa.q}</p>
                      <p className="mt-0.5 text-detail text-ink-body">A. {qa.a}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {checklist.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4 text-primary" /> 담당자 체크리스트
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {checklist.map((c, i) => (
                    <li key={i}>
                      <label className="flex cursor-pointer items-start gap-2 text-detail text-ink-body">
                        <input
                          type="checkbox"
                          checked={c.checked}
                          onChange={(e) =>
                            setChecklist((prev) =>
                              prev.map((x, xi) => (xi === i ? { ...x, checked: e.target.checked } : x)),
                            )
                          }
                          className="mt-0.5 h-4 w-4 rounded border-line-strong text-primary focus:ring-ring"
                        />
                        <span className={c.checked ? "text-ink-muted line-through" : ""}>{c.item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="py-3">
          <p className="text-detail text-ink-muted">
            본 기능은 이슈 모니터링과 분리되어 있습니다. 모니터링에서 수집한 기사 내용은 보도자료 본문에 사용되지 않으며, 본 초안은 담당자가
            입력한 공개 가능 사실에만 기반합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
