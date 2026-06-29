"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, RefreshCw } from "lucide-react";
import { refreshApiCache } from "@/lib/client/useApi";

/** 상단 가운데 키워드 검색바 — 우측 끝에 새로고침 버튼 내장 */
export function SearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [spinning, setSpinning] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (v) router.push(`/search?q=${encodeURIComponent(v)}`);
  };
  const refresh = () => {
    setSpinning(true);
    refreshApiCache();
    setTimeout(() => setSpinning(false), 800);
  };

  return (
    <form onSubmit={submit} className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="키워드 검색 (기사 제목·내용·검찰청·범죄유형)"
        className="w-full rounded-full border border-line bg-paper py-2 pl-9 pr-11 text-body-s text-ink-title outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
        aria-label="키워드 검색"
      />
      <button
        type="button"
        onClick={refresh}
        aria-label="새로고침"
        title="새로고침(최신 데이터 불러오기)"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-muted transition hover:bg-gray-5 hover:text-primary"
      >
        <RefreshCw className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
      </button>
    </form>
  );
}
