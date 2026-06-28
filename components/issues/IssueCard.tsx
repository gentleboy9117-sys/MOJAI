import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { issueLevelTone, spreadTone } from "@/lib/client/labels";

export interface IssueListItem {
  id: string; title: string; summary?: string | null; officeName?: string | null; crimeType?: string | null; region?: string | null;
  issueScore: number; issueLevel: string; issueLevelLabel: string; spreadStatus: string; spreadLabel: string;
  articleCount: number; sourceCount: number; firstPublishedAt: string; lastPublishedAt: string; highlighted: boolean; crossOffice: boolean;
}

export function IssueCard({ issue, selected, onClick }: { issue: IssueListItem; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border bg-white p-3 text-left transition-colors",
        selected ? "border-primary ring-1 ring-primary" : "border-line hover:border-line-strong hover:bg-gray-5",
      )}
    >
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        {issue.highlighted && <Badge tone="danger"><Flame className="h-3 w-3" /> 다수 보도 {issue.articleCount}건</Badge>}
        <Badge tone={issueLevelTone(issue.issueLevel)}>{issue.issueLevelLabel}</Badge>
        <Badge tone={spreadTone(issue.spreadStatus)}>{issue.spreadLabel}</Badge>
        {issue.crossOffice && <Badge tone="navy">복수 관할</Badge>}
        <span className="ml-auto text-detail font-semibold text-ink-body">{issue.issueScore}<span className="font-normal text-ink-disabled">/100</span></span>
      </div>
      <p className="line-clamp-2 text-body-s font-medium text-ink-title">{issue.title}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        <Badge tone="navy">{issue.officeName ?? "관할 추정"}</Badge>
        <Badge tone="blue">{issue.crimeType ?? "유형 미상"}</Badge>
        {issue.region && <Badge tone="outline">{issue.region}</Badge>}
      </div>
      {issue.summary && <p className="mt-1 line-clamp-1 text-detail text-ink-muted">{issue.summary}</p>}
      <p className="mt-1.5 text-detail text-ink-disabled">
        기사 {issue.articleCount} · 출처 {issue.sourceCount} · {formatDate(issue.firstPublishedAt)} ~ {formatDate(issue.lastPublishedAt)}
      </p>
    </button>
  );
}
