import { Badge } from "@/components/ui/badge";
import {
  JURISDICTION_METHOD_LABEL,
  confidenceTone,
  isInferredJurisdiction,
  formatPercent,
} from "./publicSafetyLabels";

/**
 * [공안] 관할 배지 — 검찰청명 + 신뢰도 표시.
 *  * MANUAL 이 아니거나 needsHumanReview 면 '검토 필요' 배지를 함께 노출한다.
 */
export function AssemblyJurisdictionBadge({
  officeName,
  confidence,
  method,
  needsHumanReview,
  showConfidence = true,
}: {
  officeName?: string | null;
  confidence?: number | null;
  method?: string | null;
  needsHumanReview?: boolean;
  showConfidence?: boolean;
}) {
  const inferred = isInferredJurisdiction(method, needsHumanReview);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone="navy">{officeName || "관할 추정"}</Badge>
      {inferred && <Badge tone="warning">관할 추정</Badge>}
      {showConfidence && confidence != null && (
        <Badge tone={confidenceTone(confidence)}>신뢰도 {formatPercent(confidence)}</Badge>
      )}
      {method && (
        <span className="text-detail text-ink-disabled">
          {JURISDICTION_METHOD_LABEL[method] ?? method}
        </span>
      )}
    </span>
  );
}
