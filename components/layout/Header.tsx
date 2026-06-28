"use client";
import { Suspense, useState } from "react";
import { Menu, RefreshCw } from "lucide-react";
import { UserChip } from "./UserChip";
import { SearchBar } from "./SearchBar";
import { refreshApiCache } from "@/lib/client/useApi";

// 주최: 법무부 → 법무부 로고를 메인으로, 검찰 엠블럼은 보조 식별자로 배치
export function Header({ onMenu }: { onMenu?: () => void }) {
  const [spinning, setSpinning] = useState(false);
  const onRefresh = () => {
    setSpinning(true);
    refreshApiCache(); // 전역 캐시 비우고 현재 화면 데이터 새로고침
    setTimeout(() => setSpinning(false), 800);
  };
  return (
    <header className="flex items-center gap-2 border-b border-line bg-white px-3 py-2.5 shadow-header sm:gap-4 sm:px-4">
      {/* 모바일 햄버거 — 사이드 메뉴 열기 */}
      <button
        onClick={onMenu}
        aria-label="메뉴 열기"
        className="shrink-0 rounded-md p-1.5 text-ink-body hover:bg-gray-5 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex shrink-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/moj-logo.png" alt="법무부" className="h-8 w-auto sm:h-9" />
        <div className="hidden h-8 w-px bg-line md:block" />
        <div className="hidden leading-tight md:block">
          <p className="text-body font-bold text-ink-title">AI 기반 검찰 기획업무 자동화 플랫폼</p>
          <p className="text-detail text-ink-muted">Prosecution Planning AI Workbench · 주최 법무부</p>
        </div>
      </div>
      {/* 가운데 키워드 검색 (useSearchParams → Suspense 필수: 빌드 프리렌더 대응) */}
      <div className="flex flex-1 justify-center px-1 sm:px-2">
        <Suspense fallback={<div className="h-9 w-full max-w-xl rounded-full border border-line bg-paper" />}>
          <SearchBar />
        </Suspense>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          onClick={onRefresh}
          aria-label="새로고침"
          title="새로고침(최신 데이터 불러오기)"
          className="rounded-md p-1.5 text-ink-body hover:bg-gray-5"
        >
          <RefreshCw className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
        </button>
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
