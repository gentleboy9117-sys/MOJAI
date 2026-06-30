"use client";
import { useState } from "react";
import { FileText, Copy, Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { apiPost } from "@/lib/client/api";
import { TEXT_POOL_DISPOSITIONS } from "@/lib/textPool";

interface Form {
  officeName: string; division: string; chief: string; crimeName: string;
  caseSummary: string; disposition: string; dispositionDate: string;
  significance: string; emphasis: string; futurePlan: string;
}
const EMPTY: Form = {
  officeName: "", division: "", chief: "", crimeName: "", caseSummary: "",
  disposition: TEXT_POOL_DISPOSITIONS[6], dispositionDate: "", significance: "", emphasis: "", futurePlan: "",
};
const ta = "w-full rounded-md border border-line bg-white px-3 py-2 text-body-s text-ink-title outline-none focus:border-primary focus:ring-1 focus:ring-ring";

export function PressReleaseSimple() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function loadSample() {
    setForm({
      officeName: "서울중앙지방검찰청", division: "반부패수사1부", chief: "이○○",
      crimeName: "특정경제범죄가중처벌등에관한법률위반(사기)·유사수신행위의규제에관한법률위반",
      caseSummary: "투자 리딩방을 운영하며 불특정 다수 투자자로부터 원금 보장을 약속하고 약 320억원을 받아 가로챈 피의자를 구속하여",
      disposition: "구속 기소", dispositionDate: "2026. 6. 30.",
      significance: "계좌 추적과 디지털 포렌식을 통해 자금 흐름을 규명하고, 범죄수익 보전을 위해 약 50억원 상당을 추징보전하였습니다.",
      emphasis: "원금·고수익을 보장한다는 투자 권유는 유사수신·사기 범죄일 수 있으므로 각별한 주의가 필요합니다.",
      futurePlan: "",
    });
    setDraft(null);
  }
  async function generate() {
    setLoading(true); setError(null);
    try { const r = await apiPost<{ draft: string }>("/api/press-release-simple/generate", form); setDraft(r.draft); }
    catch (e) { setError(e instanceof Error ? e.message : "생성에 실패했습니다."); }
    finally { setLoading(false); }
  }
  async function copy() { if (!draft) return; try { await navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }
  const canGen = form.officeName.trim() && form.caseSummary.trim() && form.disposition.trim();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-primary" /> 입력</CardTitle>
          <button onClick={loadSample} className="flex items-center gap-1 text-detail text-blue-60 hover:underline"><Sparkles className="h-4 w-4" /> 샘플 입력 불러오기</button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="pr-office">발표 검찰청 *</Label><Input id="pr-office" value={form.officeName} onChange={(e) => set("officeName", e.target.value)} placeholder="예: 서울중앙지방검찰청" /></div>
            <div><Label htmlFor="pr-div">수사 부서</Label><Input id="pr-div" value={form.division} onChange={(e) => set("division", e.target.value)} placeholder="예: 반부패수사1부" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="pr-chief">부장검사</Label><Input id="pr-chief" value={form.chief} onChange={(e) => set("chief", e.target.value)} placeholder="예: 홍길동" /></div>
            <div><Label htmlFor="pr-crime">죄명</Label><Input id="pr-crime" value={form.crimeName} onChange={(e) => set("crimeName", e.target.value)} placeholder="예: 특정경제범죄가중처벌등에관한법률위반(사기)" /></div>
          </div>
          <div><Label htmlFor="pr-sum">사건 개요·경위 *</Label><textarea id="pr-sum" value={form.caseSummary} onChange={(e) => set("caseSummary", e.target.value)} rows={3} className={ta} placeholder="'~한 피의자를' 형태로 (예: …약 320억원을 가로챈 피의자를 구속하여)" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="pr-disp">처분 *</Label><Select id="pr-disp" value={form.disposition} onChange={(e) => set("disposition", e.target.value)}>{TEXT_POOL_DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}</Select></div>
            <div><Label htmlFor="pr-date">처분 일자</Label><Input id="pr-date" value={form.dispositionDate} onChange={(e) => set("dispositionDate", e.target.value)} placeholder="예: 2026. 6. 30." /></div>
          </div>
          <div><Label htmlFor="pr-sig">수사 경위·의의</Label><textarea id="pr-sig" value={form.significance} onChange={(e) => set("significance", e.target.value)} rows={2} className={ta} placeholder="예: 계좌 추적·포렌식으로 자금흐름 규명, 범죄수익 추징보전" /></div>
          <div><Label htmlFor="pr-emph">강조 메시지</Label><textarea id="pr-emph" value={form.emphasis} onChange={(e) => set("emphasis", e.target.value)} rows={2} className={ta} placeholder="예: 원금·고수익 보장 투자 권유 주의 당부" /></div>
          <div><Label htmlFor="pr-plan">향후 방침 (비우면 기본 문구)</Label><textarea id="pr-plan" value={form.futurePlan} onChange={(e) => set("futurePlan", e.target.value)} rows={2} className={ta} placeholder="예: 향후에도 …공소유지에 최선을 다하겠습니다" /></div>
          {error && <p className="text-detail text-danger">{error}</p>}
          <Button className="w-full" onClick={generate} disabled={loading || !canGen}>{loading ? <Spinner className="border-white/40 border-t-white" /> : null}{loading ? "생성 중…" : "보도자료 초안 생성"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>보도자료 초안</CardTitle>
          {draft && <Button size="sm" variant="secondary" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "복사됨" : "복사"}</Button>}
        </CardHeader>
        <CardContent>
          {!draft ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 text-center text-ink-disabled">
              <FileText className="h-8 w-8" />
              <p className="text-body-s">입력 후 생성하면 복사해 쓸 수 있는<br />보도자료 초안이 바로 나옵니다.</p>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap rounded-md border border-line bg-gray-5 p-3 text-body-s leading-relaxed text-ink-title">{draft}</pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
