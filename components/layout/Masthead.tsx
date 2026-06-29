import { ShieldCheck } from "lucide-react";

// KRDS 공식 배너(Masthead)
export function Masthead() {
  return (
    <div className="flex items-center gap-1.5 bg-gray-10 px-4 py-1 text-detail text-ink-muted">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">공개자료 기반 시스템</span>
    </div>
  );
}
