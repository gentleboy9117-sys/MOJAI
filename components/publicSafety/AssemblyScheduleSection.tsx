"use client";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { appToday } from "@/lib/appToday";
import { AssemblyByOfficeView } from "./AssemblyByOfficeView";
import { AssemblySchedulePageClient } from "./AssemblySchedulePageClient";

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}
function label(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const wd = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()];
  return `${m}.${d}(${wd})`;
}

/** [공안] 집회·시위 일정 섹션 — 날짜(오늘/내일/모레 + 임의) 선택을 검찰청별·개요가 공유 */
export function AssemblyScheduleSection() {
  const today = useMemo(() => fmt(appToday()), []);
  const quick = useMemo(() => {
    const base = appToday();
    return [
      { v: fmt(base), label: `오늘 ${label(fmt(base))}` },
      { v: fmt(addDays(base, 1)), label: `내일 ${label(fmt(addDays(base, 1)))}` },
      { v: fmt(addDays(base, 2)), label: `모레 ${label(fmt(addDays(base, 2)))}` },
    ];
  }, []);
  const [date, setDate] = useState<string>(today);

  function shift(n: number) {
    const [y, m, d] = date.split("-").map(Number);
    setDate(fmt(addDays(new Date(y, m - 1, d), n)));
  }

  const isQuick = quick.some((q) => q.v === date);

  return (
    <div className="space-y-4">
      {/* 날짜 선택 바 */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-2">
        <CalendarDays className="ml-1 h-4 w-4 text-primary" />
        <div className="flex items-center gap-1 rounded-lg bg-gray-5 p-0.5">
          {quick.map((q) => (
            <button
              key={q.v}
              onClick={() => setDate(q.v)}
              className={cn(
                "rounded-md px-3 py-1 text-caption transition-colors",
                date === q.v ? "bg-white font-bold text-primary shadow-sm" : "text-ink-muted hover:text-ink-title",
              )}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => shift(-1)} className="rounded-md border border-line p-1 text-ink-muted hover:bg-gray-5" title="이전 날짜">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className={cn(
              "h-8 rounded-md border px-2 text-caption",
              isQuick ? "border-line text-ink-body" : "border-primary font-bold text-primary",
            )}
          />
          <button onClick={() => shift(1)} className="rounded-md border border-line p-1 text-ink-muted hover:bg-gray-5" title="다음 날짜">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AssemblyByOfficeView date={date} />
      <AssemblySchedulePageClient date={date} />
    </div>
  );
}
