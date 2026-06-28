"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/lib/client/useApi";
import { apiPost, getDevUser } from "@/lib/client/api";
import { ALL_CRIME_TYPES } from "@/lib/classifiers/taxonomy";
import { UserCheck } from "lucide-react";

interface Office { id: string; name: string; type: string }

export function HumanReviewPanel({
  articleId, currentCrimeType, currentOfficeId, onDone,
}: { articleId: string; currentCrimeType?: string | null; currentOfficeId?: string | null; onDone?: () => void }) {
  const role = getDevUser().role;
  const canReview = role === "ANALYST" || role === "ADMIN";
  const { data: offices } = useApi<Office[]>(canReview ? "/api/offices" : null);
  const [crimeType, setCrimeType] = useState(currentCrimeType ?? "");
  const [officeId, setOfficeId] = useState(currentOfficeId ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!canReview)
    return <p className="rounded-md bg-gray-5 p-2.5 text-detail text-ink-muted">분류 수정/검토 완료는 <b>분석관</b> 권한이 필요합니다. (설정에서 권한 전환)</p>;

  async function submit(reviewDone: boolean) {
    setBusy(true); setErr(null);
    try {
      await apiPost(`/api/articles/${articleId}/review`, { crimeType: crimeType || undefined, primaryOfficeId: officeId || undefined, reviewDone });
      setDone(true);
      onDone?.();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-md border border-blue-20 bg-blue-5/40 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-label font-semibold text-ink-title"><UserCheck className="h-4 w-4 text-blue-60" /> 분석관 검토 / 수정</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>범죄유형</Label>
          <Select value={crimeType} onChange={(e) => setCrimeType(e.target.value)}>
            <option value="">(변경 없음)</option>
            {ALL_CRIME_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div>
          <Label>관련 검찰청</Label>
          <Select value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
            <option value="">(변경 없음)</option>
            {offices?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </div>
      </div>
      {err && <p className="mt-2 text-detail text-danger">{err}</p>}
      {done ? (
        <Badge tone="success" className="mt-2">검토 반영됨 (감사 로그 기록)</Badge>
      ) : (
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => submit(false)}>수정 저장</Button>
          <Button size="sm" disabled={busy} onClick={() => submit(true)}>검토 완료</Button>
        </div>
      )}
    </div>
  );
}
