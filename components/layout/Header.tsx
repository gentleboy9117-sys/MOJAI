import { Suspense } from "react";
import { UserChip } from "./UserChip";
import { SearchBar } from "./SearchBar";

// 주최: 법무부 → 법무부 로고를 메인으로, 검찰 엠블럼은 보조 식별자로 배치
export function Header() {
  return (
    <header className="flex items-center gap-4 border-b border-line bg-white px-4 py-2.5 shadow-header">
      <div className="flex shrink-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/moj-logo.png" alt="법무부" className="h-9 w-auto" />
        <div className="h-8 w-px bg-line" />
        <div className="leading-tight">
          <p className="text-body font-bold text-ink-title">AI 기반 검찰 기획업무 자동화 플랫폼</p>
          <p className="text-detail text-ink-muted">Prosecution Planning AI Workbench · 주최 법무부</p>
        </div>
      </div>
      {/* 상단 가운데 키워드 검색 (useSearchParams → Suspense 필수: 빌드 프리렌더 대응) */}
      <div className="flex flex-1 justify-center px-2">
        <Suspense fallback={<div className="h-9 w-full max-w-xl rounded-full border border-line bg-paper" />}>
          <SearchBar />
        </Suspense>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden items-center gap-1.5 md:flex" title="검찰">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/prosecution-flag.svg" alt="검찰" className="h-6 w-auto" />
          <span className="text-detail text-ink-muted">검찰</span>
        </div>
        <UserChip />
      </div>
    </header>
  );
}
