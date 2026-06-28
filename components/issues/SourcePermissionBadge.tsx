import { Badge } from "@/components/ui/badge";
import { SOURCE_TYPE_LABEL, LICENSE_LABEL, sourceTone } from "@/lib/client/labels";
import { Lock, Unlock } from "lucide-react";

// 출처 유형 + 라이선스 + 원문 표시 권한
export function SourcePermissionBadge({
  sourceType, licenseType, canDisplayFullText,
}: { sourceType?: string | null; licenseType?: string | null; canDisplayFullText?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge tone={sourceTone(sourceType)}>{SOURCE_TYPE_LABEL[sourceType ?? ""] ?? "출처 미상"}</Badge>
      {licenseType && <Badge tone="outline">{LICENSE_LABEL[licenseType] ?? licenseType}</Badge>}
      {canDisplayFullText ? (
        <Badge tone="success"><Unlock className="h-3 w-3" /> 원문 표시 가능</Badge>
      ) : (
        <Badge tone="danger"><Lock className="h-3 w-3" /> 원문 표시 제한</Badge>
      )}
    </div>
  );
}
