"use client";
import { useState } from "react";
import { Sparkles, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Textarea, Select } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/client/api";
import {
  RELEASE_TYPES,
  CASE_STAGES,
  type PressReleaseInput,
  type LengthOption,
} from "@/lib/pressRelease/types";
import { ALL_CRIME_TYPES } from "@/lib/classifiers/taxonomy";
import { GeneratedPressReleaseView, type GeneratedResult } from "./GeneratedPressReleaseView";

type Form = Omit<PressReleaseInput, "legalKeywords" | "attachments"> & {
  legalKeywords: string; // comma 입력
  attachments: string; // comma 입력
};

const EMPTY: Form = {
  officeName: "",
  releaseType: "INVESTIGATION_RESULT",
  caseStage: "INDICTED_DETAINED",
  crimeType: "",
  caseSummary: "",
  charges: "",
  investigationResult: "",
  dispositionResult: "",
  publicScope: "",
  anonymizationRules: "",
  suspectDescription: "",
  victimDescription: "",
  damageScale: "",
  futurePlan: "",
  legalKeywords: "",
  emphasisMessage: "",
  attachments: "",
  lengthOption: "normal",
  includeTitleCandidates: true,
  includeQA: true,
  includeRiskCheck: true,
  includeChecklist: true,
};

// 데모용 가상 데이터 — 실명/실제 사건 아님
const DEMO: Form = {
  officeName: "○○지방검찰청",
  releaseType: "INVESTIGATION_RESULT",
  caseStage: "INDICTED_DETAINED",
  crimeType: "사기",
  caseSummary:
    "투자 리딩방을 운영하는 ○○운영사를 통해 고수익을 보장한다며 다수의 피해자로부터 투자금을 받은 것으로 조사된 사건. (데모용 가상 데이터)",
  charges: "사기, 유사수신행위규제법 위반",
  investigationResult: "관련 계좌 추적 및 피해 신고 분석을 통해 피해 규모와 자금 흐름을 확인",
  dispositionResult: "구속기소",
  publicScope: "제한 공개 (비식별 처리 후 공개)",
  anonymizationRules: "피의자는 A씨로 표기, 법인은 ○○운영사로 표기, 피해자 신원 비공개",
  suspectDescription: "A씨(투자 리딩방 운영)",
  victimDescription: "불특정 다수 투자 피해자",
  damageScale: "피해 규모 약 ○○억 원 상당 (집계 중)",
  futurePlan: "추가 피해 및 공범 여부에 대해 수사를 이어갈 예정",
  legalKeywords: "사기, 유사수신, 범죄수익 환수",
  emphasisMessage: "유사 투자 사기 피해 예방을 위한 주의 당부",
  attachments: "수사 결과 요약 1부",
  lengthOption: "normal",
  includeTitleCandidates: true,
  includeQA: true,
  includeRiskCheck: true,
  includeChecklist: true,
};

const STEPS = ["사건 처리 결과 입력", "공개 범위·비식별화", "생성 옵션"];

function toInput(f: Form): PressReleaseInput {
  return {
    ...f,
    legalKeywords: f.legalKeywords
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    attachments: f.attachments
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

export function PressReleaseWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [submitted, setSubmitted] = useState<PressReleaseInput | null>(null);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const input = toInput(form);
      const r = await apiPost<GeneratedResult>("/api/press-releases/generate", input);
      setResult(r);
      setSubmitted(input);
    } catch (e) {
      setError(e instanceof Error ? e.message : "초안 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const canNext = step === 0 ? form.officeName.trim() && form.caseSummary.trim() : true;

  if (result && submitted) {
    return (
      <GeneratedPressReleaseView
        result={result}
        input={submitted}
        onReset={() => {
          setResult(null);
          setSubmitted(null);
          setStep(0);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-detail font-bold",
                  i === step
                    ? "bg-primary text-white"
                    : i < step
                      ? "bg-navy-20 text-navy-60"
                      : "bg-gray-10 text-ink-disabled",
                )}
              >
                {i + 1}
              </span>
              <span className={cn("truncate text-detail", i === step ? "font-medium text-ink-title" : "text-ink-muted")}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-line" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-primary" /> {STEPS[step]}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setForm(DEMO)} title="데모용 가상 데이터로 입력란을 채웁니다">
            <Sparkles className="h-4 w-4" /> 샘플 입력 불러오기
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pr-office">발표 주체 검찰청 *</Label>
                  <Input
                    id="pr-office"
                    value={form.officeName}
                    onChange={(e) => set("officeName", e.target.value)}
                    placeholder="예: ○○지방검찰청"
                  />
                </div>
                <div>
                  <Label htmlFor="pr-crime">범죄 유형</Label>
                  <Select id="pr-crime" value={form.crimeType} onChange={(e) => set("crimeType", e.target.value)}>
                    <option value="">선택</option>
                    {ALL_CRIME_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pr-release">발표 유형</Label>
                  <Select id="pr-release" value={form.releaseType} onChange={(e) => set("releaseType", e.target.value)}>
                    {RELEASE_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pr-stage">사건 단계</Label>
                  <Select id="pr-stage" value={form.caseStage} onChange={(e) => set("caseStage", e.target.value)}>
                    {CASE_STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="pr-summary">사건 개요 (공개 가능한 사실) *</Label>
                <Textarea
                  id="pr-summary"
                  value={form.caseSummary}
                  onChange={(e) => set("caseSummary", e.target.value)}
                  placeholder="처리 완료된 사건의 공개 가능한 사실관계를 입력하세요. 유무죄 단정 표현은 피하고 ‘A씨’ 등 비식별 표기를 사용하세요."
                  className="min-h-[120px]"
                />
              </div>
              <div>
                <Label htmlFor="pr-charges">적용 혐의/죄명</Label>
                <Input
                  id="pr-charges"
                  value={form.charges}
                  onChange={(e) => set("charges", e.target.value)}
                  placeholder="예: 사기, 유사수신행위규제법 위반"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pr-invest">수사 결과</Label>
                  <Textarea
                    id="pr-invest"
                    value={form.investigationResult}
                    onChange={(e) => set("investigationResult", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pr-disp">처분 결과</Label>
                  <Input
                    id="pr-disp"
                    value={form.dispositionResult}
                    onChange={(e) => set("dispositionResult", e.target.value)}
                    placeholder="예: 구속기소"
                  />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pr-scope">공개 범위</Label>
                  <Input
                    id="pr-scope"
                    value={form.publicScope}
                    onChange={(e) => set("publicScope", e.target.value)}
                    placeholder="예: 제한 공개 (비식별 처리 후 공개)"
                  />
                </div>
                <div>
                  <Label htmlFor="pr-damage">피해 규모</Label>
                  <Input
                    id="pr-damage"
                    value={form.damageScale}
                    onChange={(e) => set("damageScale", e.target.value)}
                    placeholder="예: 약 ○○억 원 상당"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pr-anon">비실명/비식별화 규칙</Label>
                <Textarea
                  id="pr-anon"
                  value={form.anonymizationRules}
                  onChange={(e) => set("anonymizationRules", e.target.value)}
                  placeholder="예: 피의자는 A씨로 표기, 법인은 ○○운영사로 표기, 피해자 신원 비공개"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pr-suspect">피의자 설명 (비식별)</Label>
                  <Input
                    id="pr-suspect"
                    value={form.suspectDescription}
                    onChange={(e) => set("suspectDescription", e.target.value)}
                    placeholder="예: A씨"
                  />
                </div>
                <div>
                  <Label htmlFor="pr-victim">피해자 설명 (비식별)</Label>
                  <Input
                    id="pr-victim"
                    value={form.victimDescription}
                    onChange={(e) => set("victimDescription", e.target.value)}
                    placeholder="예: 불특정 다수 피해자"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pr-future">향후 계획</Label>
                <Input
                  id="pr-future"
                  value={form.futurePlan}
                  onChange={(e) => set("futurePlan", e.target.value)}
                  placeholder="예: 추가 피해 및 공범 여부 수사 예정"
                />
              </div>
              <div>
                <Label htmlFor="pr-legal">참고 법령 키워드 (쉼표로 구분)</Label>
                <Input
                  id="pr-legal"
                  value={form.legalKeywords}
                  onChange={(e) => set("legalKeywords", e.target.value)}
                  placeholder="예: 사기, 유사수신, 범죄수익 환수"
                />
              </div>
              <div>
                <Label htmlFor="pr-emph">강조 메시지</Label>
                <Input
                  id="pr-emph"
                  value={form.emphasisMessage}
                  onChange={(e) => set("emphasisMessage", e.target.value)}
                  placeholder="예: 유사 투자 사기 피해 예방 당부"
                />
              </div>
              <div>
                <Label htmlFor="pr-attach">첨부자료 (쉼표로 구분)</Label>
                <Input
                  id="pr-attach"
                  value={form.attachments}
                  onChange={(e) => set("attachments", e.target.value)}
                  placeholder="예: 수사 결과 요약 1부"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label>초안 길이</Label>
                <div className="mt-1 flex flex-wrap gap-3">
                  {(
                    [
                      { v: "short", l: "간략" },
                      { v: "normal", l: "표준" },
                      { v: "detailed", l: "상세" },
                    ] as { v: LengthOption; l: string }[]
                  ).map((o) => (
                    <label key={o.v} className="flex cursor-pointer items-center gap-1.5 text-body-s text-ink-body">
                      <input
                        type="radio"
                        name="lengthOption"
                        checked={form.lengthOption === o.v}
                        onChange={() => set("lengthOption", o.v)}
                        className="h-4 w-4 border-line-strong text-primary focus:ring-ring"
                      />
                      {o.l}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>포함 항목</Label>
                {(
                  [
                    { k: "includeTitleCandidates", l: "제목 후보 (5개)" },
                    { k: "includeQA", l: "기자 예상 Q&A" },
                    { k: "includeRiskCheck", l: "문장 리스크 점검" },
                    { k: "includeChecklist", l: "담당자 체크리스트" },
                  ] as { k: keyof Form; l: string }[]
                ).map((o) => (
                  <label key={o.k} className="flex cursor-pointer items-center gap-2 text-body-s text-ink-body">
                    <input
                      type="checkbox"
                      checked={Boolean(form[o.k])}
                      onChange={(e) => set(o.k, e.target.checked as Form[typeof o.k])}
                      className="h-4 w-4 rounded border-line-strong text-primary focus:ring-ring"
                    />
                    {o.l}
                  </label>
                ))}
              </div>
              <p className="rounded-md border border-line bg-gray-5 px-3 py-2 text-detail text-ink-muted">
                생성 시 공개 검찰발표자료의 형식·문체만 참고하며, 레퍼런스의 사건 내용은 사용하지 않습니다. 생성물은 ‘초안 — 담당자 검토
                필요’로 표기됩니다.
              </p>
            </>
          )}

          {error && (
            <p className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-detail text-danger">{error}</p>
          )}

          <div className="flex items-center justify-between border-t border-line pt-4">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || loading}>
              <ChevronLeft className="h-4 w-4" /> 이전
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                다음 <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={generate} disabled={loading || !form.officeName.trim() || !form.caseSummary.trim()}>
                {loading ? <Spinner className="border-white/40 border-t-white" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "초안 생성 중…" : "보도자료 초안 생성"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
