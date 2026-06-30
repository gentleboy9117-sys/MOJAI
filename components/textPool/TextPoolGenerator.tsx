"use client";
import { useState } from "react";
import { MessageSquareText, Copy, Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/client/api";
import { TEXT_POOL_DISPOSITIONS, type TextPoolStyle } from "@/lib/textPool";

interface Form {
  officeName: string;
  division: string;
  chief: string;
  crimeName: string;
  caseSummary: string;
  disposition: string;
  dispositionDate: string;
  significance: string;
  futurePlan: string;
  footnote: string;
  style: TextPoolStyle;
  includeHeader: boolean;
  includeDisclaimer: boolean;
}

const EMPTY: Form = {
  officeName: "", division: "", chief: "", crimeName: "", caseSummary: "",
  disposition: TEXT_POOL_DISPOSITIONS[6], dispositionDate: "", significance: "", futurePlan: "", footnote: "",
  style: "formal", includeHeader: true, includeDisclaimer: true,
};

const ta = "w-full rounded-md border border-line bg-white px-3 py-2 text-body-s text-ink-title outline-none focus:border-primary focus:ring-1 focus:ring-ring";

export function TextPoolGenerator() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function loadSample() {
    setForm({
      officeName: "서울북부지방검찰청",
      division: "형사2부",
      chief: "김재혁",
      crimeName: "특정범죄가중처벌등에관한법률위반(보복상해등)·무고",
      caseSummary: "노래방 종업원인 피해자의 음주운전 신고로 형사처벌을 받게 되자 보복 목적으로 피해자에게 상해를 가하고, 오히려 피해를 입었다며 허위 고소장을 제출한 피의자를 직구속하여",
      disposition: "구속 기소",
      dispositionDate: "2023. 12. 28.",
      significance: "경찰이 특정범죄가중처벌등에관한법률위반(보복폭행등)만 인정하여 송치한 사건에 대하여, CCTV 영상 분석 및 관련자 조사 등 직접수사를 통해 무고 혐의를 입증한 사례입니다",
      futurePlan: "",
      footnote: "",
      style: "formal",
      includeHeader: true,
      includeDisclaimer: true,
    });
    setDraft(null);
  }

  async function generate() {
    setLoading(true); setError(null);
    try {
      const r = await apiPost<{ draft: string }>("/api/text-pool/generate", form);
      setDraft(r.draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성에 실패했습니다.");
    } finally { setLoading(false); }
  }

  async function copy() {
    if (!draft) return;
    try { await navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  const canGen = form.officeName.trim() && form.caseSummary.trim() && form.disposition.trim();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 입력 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5"><MessageSquareText className="h-4 w-4 text-primary" /> 입력</CardTitle>
          <button onClick={loadSample} className="flex items-center gap-1 text-detail text-blue-60 hover:underline">
            <Sparkles className="h-4 w-4" /> 샘플 입력 불러오기
          </button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tp-office">발표 검찰청 *</Label>
              <Input id="tp-office" value={form.officeName} onChange={(e) => set("officeName", e.target.value)} placeholder="예: 서울북부지방검찰청" />
            </div>
            <div>
              <Label htmlFor="tp-div">수사 부서</Label>
              <Input id="tp-div" value={form.division} onChange={(e) => set("division", e.target.value)} placeholder="예: 형사2부" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tp-chief">부장검사</Label>
              <Input id="tp-chief" value={form.chief} onChange={(e) => set("chief", e.target.value)} placeholder="예: 김재혁" />
            </div>
            <div>
              <Label htmlFor="tp-crime">죄명</Label>
              <Input id="tp-crime" value={form.crimeName} onChange={(e) => set("crimeName", e.target.value)} placeholder="예: 특정범죄가중처벌등에관한법률위반(보복상해등)" />
            </div>
          </div>
          <div>
            <Label htmlFor="tp-summary">사건 개요·경위 *</Label>
            <textarea id="tp-summary" value={form.caseSummary} onChange={(e) => set("caseSummary", e.target.value)} rows={3} className={ta}
              placeholder="처분 대상이 되는 행위를 '~한 피의자를' 형태로 (예: …상해를 가하고 허위 고소장을 제출한 피의자를 직구속하여)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tp-disp">처분 *</Label>
              <Select id="tp-disp" value={form.disposition} onChange={(e) => set("disposition", e.target.value)}>
                {TEXT_POOL_DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="tp-date">처분 일자</Label>
              <Input id="tp-date" value={form.dispositionDate} onChange={(e) => set("dispositionDate", e.target.value)} placeholder="예: 2026. 6. 30." />
            </div>
          </div>
          <div>
            <Label htmlFor="tp-sig">수사 경위·의의</Label>
            <textarea id="tp-sig" value={form.significance} onChange={(e) => set("significance", e.target.value)} rows={2} className={ta}
              placeholder="직접수사·입증 경위 등 (예: CCTV 분석·관련자 조사로 무고 혐의 입증한 사례)" />
          </div>
          <div>
            <Label htmlFor="tp-plan">향후 방침 (비우면 기본 문구)</Label>
            <textarea id="tp-plan" value={form.futurePlan} onChange={(e) => set("futurePlan", e.target.value)} rows={2} className={ta}
              placeholder="예: 향후에도 보복·무고 범죄에 엄정 대응하고 공소유지에 만전을 기하겠습니다" />
          </div>
          <div>
            <Label htmlFor="tp-foot">각주 (*)</Label>
            <Input id="tp-foot" value={form.footnote} onChange={(e) => set("footnote", e.target.value)} placeholder="제도·근거 보충 (예: DNA법 시행 이후 대검·국과수 연계서버 교차대조)" />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex rounded-md border border-line p-0.5">
              {(["formal", "concise"] as const).map((v) => (
                <button key={v} onClick={() => set("style", v)} className={cn("rounded px-2 py-0.5 text-caption transition-colors", form.style === v ? "bg-primary font-medium text-white" : "text-ink-muted hover:text-ink-title")}>
                  {v === "formal" ? "정중체(~합니다)" : "개조식(~함)"}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-detail text-ink-body">
              <input type="checkbox" checked={form.includeHeader} onChange={(e) => set("includeHeader", e.target.checked)} className="h-4 w-4 rounded border-line-strong text-primary" /> 머리표[알림]
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-detail text-ink-body">
              <input type="checkbox" checked={form.includeDisclaimer} onChange={(e) => set("includeDisclaimer", e.target.checked)} className="h-4 w-4 rounded border-line-strong text-primary" /> 확정 아님 고지
            </label>
          </div>
          {error && <p className="text-detail text-danger">{error}</p>}
          <Button className="w-full" onClick={generate} disabled={loading || !canGen}>
            {loading ? <Spinner className="border-white/40 border-t-white" /> : null}
            {loading ? "생성 중…" : "문자풀 초안 생성"}
          </Button>
        </CardContent>
      </Card>

      {/* 결과 */}
      <Card>
        <CardHeader>
          <CardTitle>문자풀 초안</CardTitle>
          {draft && (
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "복사됨" : "복사"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!draft ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 text-center text-ink-disabled">
              <MessageSquareText className="h-8 w-8" />
              <p className="text-body-s">입력 후 생성하면 검찰 문자풀 형식<br />([○○ 알림] · ○ 처분/경위/방침 · 확정 아님 고지)으로 작성됩니다.</p>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap rounded-md border border-line bg-gray-5 p-3 text-body-s leading-relaxed text-ink-title">{draft}</pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
