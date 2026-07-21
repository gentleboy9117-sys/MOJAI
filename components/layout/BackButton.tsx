"use client";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** 전역 '이전 화면' 버튼 — 모든 페이지 공통(대시보드 홈에서는 숨김). 히스토리 없으면 홈으로. */
export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname === "/") return null;
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };
  return (
    <button
      onClick={goBack}
      title="이전 화면으로"
      className="flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1.5 text-detail font-medium text-ink-body transition-colors hover:border-primary hover:text-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">이전 화면</span>
    </button>
  );
}
