"use client";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { cn, formatDate } from "@/lib/utils";
import { AssemblyJurisdictionBadge } from "./AssemblyJurisdictionBadge";

export interface AssemblyRow {
  id: string;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  title: string;
  locationName: string;
  district?: string | null;
  organizerName?: string | null;
  expectedParticipants?: string | null;
  prosecutionOfficeName?: string | null;
  jurisdictionConfidence?: number | null;
  jurisdictionMethod?: string | null;
  needsHumanReview: boolean;
  relatedReportCount: number;
  legalIssueMention: boolean;
}

function timeRange(s?: string | null, e?: string | null): string {
  if (!s && !e) return "-";
  return `${s ?? "?"}${e ? `~${e}` : ""}`;
}

/**
 * [공안] 공개 집회·시위 일정 표.
 *  날짜/시간/장소/행정구/주최/예상인원/관할(추정)/신뢰도/관련 보도/검토필요
 */
export function AssemblyScheduleTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: AssemblyRow[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  if (!rows.length) {
    return (
      <EmptyState
        title="공개 집회·시위 일정이 없습니다"
        desc="상단의 '공개 일정 수집'을 실행하거나 기간 필터를 조정하세요."
      />
    );
  }
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-body-s">
        <thead>
          <tr className="border-b border-line bg-gray-5 text-left text-detail text-ink-muted">
            <th className="px-3 py-2 font-medium">일자</th>
            <th className="px-3 py-2 font-medium">시간</th>
            <th className="px-3 py-2 font-medium">장소 / 일정</th>
            <th className="px-3 py-2 font-medium">행정구</th>
            <th className="px-3 py-2 font-medium">주최(공개)</th>
            <th className="px-3 py-2 font-medium">예상 인원</th>
            <th className="px-3 py-2 font-medium">관할(추정)</th>
            <th className="px-3 py-2 text-right font-medium">관련 보도</th>
            <th className="px-3 py-2 font-medium">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={cn(
                "cursor-pointer hover:bg-gray-5",
                selectedId === r.id && "bg-blue-5",
              )}
            >
              <td className="whitespace-nowrap px-3 py-2 text-ink-body">{formatDate(r.eventDate)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{timeRange(r.startTime, r.endTime)}</td>
              <td className="px-3 py-2">
                <p className="font-medium text-ink-title">{r.locationName}</p>
                <p className="text-detail text-ink-muted">{r.title}</p>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-ink-body">{r.district ?? "-"}</td>
              <td className="px-3 py-2 text-ink-body">{r.organizerName ?? "미표기"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{r.expectedParticipants ?? "미표기"}</td>
              <td className="px-3 py-2">
                <AssemblyJurisdictionBadge
                  officeName={r.prosecutionOfficeName}
                  confidence={r.jurisdictionConfidence}
                  method={r.jurisdictionMethod}
                  needsHumanReview={r.needsHumanReview}
                  showConfidence={false}
                />
              </td>
              <td className="px-3 py-2 text-right">
                {r.relatedReportCount > 0 ? (
                  <Badge tone={r.legalIssueMention ? "warning" : "blue"}>
                    보도 {r.relatedReportCount}
                  </Badge>
                ) : (
                  <span className="text-detail text-ink-disabled">-</span>
                )}
              </td>
              <td className="px-3 py-2">
                {r.needsHumanReview ? (
                  <Badge tone="danger">검토 필요</Badge>
                ) : (
                  <Badge tone="outline">확인</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
