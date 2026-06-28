import { formatDate } from "@/lib/utils";

interface Event { eventDate: string; eventTitle: string; eventSummary?: string; sourceType?: string; confidence?: number }

// 보도 기반 타임라인. '보도에 따르면/공식 발표에 따르면' 표현 유지.
export function IssueTimeline({ events }: { events: Event[] }) {
  if (!events?.length) return <p className="text-detail text-ink-muted">타임라인 정보가 없습니다.</p>;
  return (
    <ol className="relative ml-2 border-l-2 border-line">
      {events.map((e, i) => (
        <li key={i} className="mb-3 ml-4">
          <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full border-2 border-white bg-primary" />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <time className="text-detail font-semibold text-primary">{formatDate(e.eventDate)}</time>
            <span className="text-body-s font-medium text-ink-title">{e.eventTitle}</span>
          </div>
          {e.eventSummary && <p className="mt-0.5 text-detail leading-relaxed text-ink-body">{e.eventSummary}</p>}
        </li>
      ))}
    </ol>
  );
}
