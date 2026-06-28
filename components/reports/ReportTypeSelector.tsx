"use client";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { REPORT_TYPES, type ReportType } from "@/lib/report/reportTemplates";

export function ReportTypeSelector({
  value,
  onChange,
  disabled,
}: {
  value: ReportType;
  onChange: (key: ReportType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {REPORT_TYPES.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(t.key)}
            className={cn(
              "w-full rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              active
                ? "border-primary bg-navy-5 ring-1 ring-primary"
                : "border-line bg-white hover:border-line-strong hover:bg-gray-5",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className={cn("text-body-s font-bold", active ? "text-primary" : "text-ink-title")}>{t.label}</p>
              <Badge tone={active ? "navy" : "outline"} className="shrink-0">
                <Users className="h-3 w-3" /> {t.audience}
              </Badge>
            </div>
            <p className="mt-1 text-detail leading-relaxed text-ink-muted">{t.description}</p>
          </button>
        );
      })}
    </div>
  );
}
