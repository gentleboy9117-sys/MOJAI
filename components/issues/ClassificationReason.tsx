import { AlertCircle, ListChecks } from "lucide-react";

// AI 분류 설명(#16) + 관할 추정 근거(#18). 키워드/본문 근거를 함께 표시.
export function ClassificationReason({
  reasons, inferred, officeConfidence, crimeConfidence,
}: {
  reasons: string[];
  inferred?: boolean;
  officeConfidence?: number | null;
  crimeConfidence?: number | null;
}) {
  return (
    <div className="rounded-md border border-line bg-gray-5 p-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-label font-semibold text-ink-title">
        <ListChecks className="h-4 w-4 text-primary" /> 분류 근거 (AI 보조)
      </p>
      <ul className="space-y-1">
        {reasons.map((r, i) => (
          <li key={i} className="flex gap-1.5 text-detail text-ink-body">
            <span className="text-ink-disabled">·</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-3 text-detail text-ink-muted">
        {officeConfidence != null && <span>관할 신뢰도 {(officeConfidence * 100).toFixed(0)}%</span>}
        {crimeConfidence != null && <span>유형 신뢰도 {(crimeConfidence * 100).toFixed(0)}%</span>}
      </div>
      {inferred && (
        <p className="mt-2 flex items-start gap-1.5 rounded-sm bg-warning-bg px-2 py-1.5 text-detail text-[#9a6a00]">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          검찰청 직접 언급이 없어 지역/관할 기반으로 <b>추정</b>한 결과입니다. 담당자 확인이 필요합니다.
        </p>
      )}
    </div>
  );
}
