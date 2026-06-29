"use client";
import { useState } from "react";
import { MessageSquareText, Copy, Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { apiPost } from "@/lib/client/api";
import { ALL_CRIME_TYPES } from "@/lib/classifiers/taxonomy";
import { TEXT_POOL_DISPOSITIONS } from "@/lib/textPool";

interface Form {
  officeName: string;
  crimeType: string;
  caseSummary: string;
  disposition: string;
  dispositionDetail: string;
  subject: string;
  occurredAt: string;
}

const EMPTY: Form = {
  officeName: "",
  crimeType: "",
  caseSummary: "",
  disposition: TEXT_POOL_DISPOSITIONS[6], // 기소(구속)
  dispositionDetail: "",
  subject: "",
  occurredAt: "",
};

export function TextPoolGenerator() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function loadSample() {
    setForm({
      officeName: "서울중앙지방검찰청",
      crimeType: "경제범죄",
      caseSummary: "투자 리딩방을 운영하며 불특정 다수 투자자로부터 약 32억원을 받아 가로챈 혐의",
      disposition: "기소(구속)",
      dispositionDetail: "사기·유사수신행위규제법위반",
      subject: "피의자 A씨(50대)",
      occurredAt: "2026.6.30.",
    });
    setDraft(null);
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const r = await apiPost<{ draft: string }>("/api/text-pool/generate", form);
      setDraft(r.draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
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
          <div>
            <Label htmlFor="tp-office">발표 검찰청 *</Label>
            <Input id="tp-office" value={form.officeName} onChange={(e) => set("officeName", e.target.value)} placeholder="예: 서울중앙지방검찰청" />
          </div>
          <div>
            <Label htmlFor="tp-crime">범죄유형 (선택)</Label>
            <Select id="tp-crime" value={form.crimeType} onChange={(e) => set("crimeType", e.target.value)}>
              <option value="">선택 안 함</option>
              {ALL_CRIME_TYPES.filter((c) => c !== "공판").map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="tp-summary">사건 개요 *</Label>
            <textarea
              id="tp-summary"
              value={form.caseSummary}
              onChange={(e) => set("caseSummary", e.target.value)}
              rows={4}
              placeholder="공개 가능한 사실만 간단히 (예: 회사자금 32억원을 횡령한 혐의)"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-body-s text-ink-title outline-none focus:border-primary focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tp-disp">처분 결과 *</Label>
              <Select id="tp-disp" value={form.disposition} onChange={(e) => set("disposition", e.target.value)}>
                {TEXT_POOL_DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="tp-disp2">처분 보충 (선택)</Label>
              <Input id="tp-disp2" value={form.dispositionDetail} onChange={(e) => set("dispositionDetail", e.target.value)} placeholder="예: 징역 3년 구형" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tp-subj">대상 (선택)</Label>
              <Input id="tp-subj" value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="예: 피의자 A(50대)" />
            </div>
            <div>
              <Label htmlFor="tp-date">일자 (선택)</Label>
              <Input id="tp-date" value={form.occurredAt} onChange={(e) => set("occurredAt", e.target.value)} placeholder="예: 2026.6.30." />
            </div>
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
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center text-ink-disabled">
              <MessageSquareText className="h-8 w-8" />
              <p className="text-body-s">왼쪽에 사건 개요·처분 결과를 입력하면<br />기자단 신속 공보용 문자풀 초안이 생성됩니다.</p>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap rounded-md border border-line bg-gray-5 p-3 text-body-s leading-relaxed text-ink-title">{draft}</pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
