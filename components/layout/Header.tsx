"use client";
import { Suspense } from "react";
import { Menu } from "lucide-react";
import { UserChip } from "./UserChip";
import { SearchBar } from "./SearchBar";
import { BackButton } from "./BackButton";

// 좌: 법무부 로고 / 우: 검찰 로고(대칭) · 가운데: 검색(새로고침 내장)
export function Header({ onMenu }: { onMenu?: () => void }) {
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
      {/* 이전 화면으로(전역) */}
      <BackButton />
      {/* 좌: 법무부 로고 + 타이틀 */}
      <div className="flex shrink-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/moj-logo.png" alt="법무부" className="h-8 w-auto sm:h-9" />
        <div className="hidden h-8 w-px bg-line md:block" />
        <div className="hidden md:flex md:items-center">
          <p className="text-body-l font-bold leading-tight text-ink-title">AI 기반 검찰 기획업무 자동화 플랫폼</p>
        </div>
      </div>
      {/* 가운데 키워드 검색(우측 끝에 새로고침 내장) — useSearchParams 는 Suspense 필요 */}
      <div className="flex flex-1 justify-center px-1 sm:px-2">
        <Suspense fallback={<div className="h-9 w-full max-w-xl rounded-full border border-line bg-paper" />}>
          <SearchBar />
        </Suspense>
      </div>
      {/* 우: 사용자(분석관) | 검찰 로고(맨 오른쪽) */}
      <div className="flex shrink-0 items-center gap-3">
        <UserChip />
        <div className="h-8 w-px bg-line" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/prosecution-flag.svg" alt="검찰" className="h-12 w-auto sm:h-14" />
      </div>
    </header>
  );
}
