import * as React from "react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-primary", className)} aria-label="로딩 중" />
  );
}

export function EmptyState({ title, desc, icon }: { title: string; desc?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      {icon && <div className="text-ink-disabled">{icon}</div>}
      <p className="text-body-s font-medium text-ink-body">{title}</p>
      {desc && <p className="text-caption text-ink-muted">{desc}</p>}
    </div>
  );
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

/** 보도 파급도 점수 막대 (공개 보도 기준) */
export function ScoreBar({ score, tone = "navy" }: { score: number; tone?: "navy" | "warning" | "danger" | "blue" }) {
  const color = { navy: "bg-primary", warning: "bg-warning", danger: "bg-danger", blue: "bg-blue-50" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-10">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(3, Math.min(100, score))}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <p className="text-caption text-ink-muted">{label}</p>
      <p className={cn("mt-0.5 text-heading-m", tone)}>{value}</p>
      {sub && <p className="text-detail text-ink-muted">{sub}</p>}
    </div>
  );
}
