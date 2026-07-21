"use client";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** 전역 '이전 화면' 버튼 — 좌하단 플로팅(대시보드 홈에서는 숨김). 히스토리 없으면 홈으로.
 *  본문을 읽고 내려온 시선·마우스 동선과 가깝도록 화면 좌하단에 고정한다. */
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
      className="fixed bottom-4 left-4 z-40 flex items-center gap-1 rounded-full border border-line bg-white px-3 py-2 text-detail font-medium text-ink-body shadow-md transition-colors hover:border-primary hover:text-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">이전 화면</span>
    </button>
  );
}
