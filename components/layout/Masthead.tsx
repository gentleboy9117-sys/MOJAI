import { ShieldCheck } from "lucide-react";

// KRDS 공식 배너(Masthead)
export function Masthead() {
  return (
    <div className="flex items-center gap-1.5 bg-gray-10 px-4 py-1 text-detail text-ink-muted">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">이 누리집은 대한민국 공식 전자정부 누리집입니다. — 내부 업무용 · 공개 자료 기반 참고 시스템</span>
    </div>
  );
}
