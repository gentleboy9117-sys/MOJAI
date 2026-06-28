"use client";
import { useState } from "react";
import { CheckCircle2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { apiPost, getDevUser } from "@/lib/client/api";
import { useApi } from "@/lib/client/useApi";

interface OfficeLite {
  id: string;
  name: string;
  region: string;
}

/**
 * [공안] 관할(추정) 검토 패널.
 *  * 분석관 이상만 사용. 검토 완료 또는 관할 수동 수정(POST review).
 *  * 관할은 추정이며 최종 판단은 담당자.
 */
export function AssemblyReviewPanel({
  assemblyId,
  currentOfficeId,
  onReviewed,
}: {
  assemblyId: string;
  currentOfficeId?: string | null;
  onReviewed?: () => void;
}) {
  const canAct = getDevUser().role !== "VIEWER";
  const { data: offices } = useApi<OfficeLite[]>(canAct ? "/api/offices" : null);
  const [correctedOfficeId, setCorrectedOfficeId] = useState<string>(currentOfficeId ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canAct) {
    return (
      <p className="rounded-md border border-line bg-gray-5 px-3 py-2 text-detail text-ink-muted">
        관할 검토·수정은 분석관 이상 권한이 필요합니다(상단 사용자 전환).
      </p>
    );
  }

  async function submit(withCorrection: boolean) {
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/public-safety/assemblies/${assemblyId}/review`, {
        correctedOfficeId: withCorrection && correctedOfficeId ? correctedOfficeId : undefined,
        reason: reason || undefined,
      });
      setDone(true);
      onReviewed?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "검토 처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const sorted = [...(offices ?? [])].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const changed = !!correctedOfficeId && correctedOfficeId !== (currentOfficeId ?? "");

  return (
    <div className="space-y-3 rounded-lg border border-line bg-white p-3">
      <p className="flex items-center gap-1.5 text-label font-semibold text-ink-title">
        <PencilLine className="h-3.5 w-3.5 text-primary" /> 관할 검토 · 수동 수정
      </p>

      <div>
        <Label htmlFor="asm-office">관할 검찰청(추정 → 확정)</Label>
        <Select
          id="asm-office"
          value={correctedOfficeId}
          onChange={(e) => setCorrectedOfficeId(e.target.value)}
          disabled={busy || done}
        >
          <option value="">선택 안 함(추정 유지)</option>
          {sorted.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.region})
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="asm-reason">검토 메모(선택)</Label>
        <Textarea
          id="asm-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예: 공개자료 주소 기준 관할 확인"
          disabled={busy || done}
        />
      </div>

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-detail text-danger">
          {error}
        </p>
      )}
      {done ? (
        <p className="flex items-center gap-1.5 rounded-md border border-success/30 bg-success-bg px-3 py-2 text-detail text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> 검토 완료로 처리했습니다.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => submit(false)} disabled={busy}>
            {busy ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />} 검토 완료(추정 유지)
          </Button>
          <Button size="sm" onClick={() => submit(true)} disabled={busy || !changed}>
            {busy ? <Spinner className="border-white/40 border-t-white" /> : <PencilLine className="h-4 w-4" />}
            관할 수정 + 검토 완료
          </Button>
        </div>
      )}
      <p className="text-detail text-ink-disabled">
        수정 시 변경 이력이 감사 로그에 기록됩니다.
      </p>
    </div>
  );
}
