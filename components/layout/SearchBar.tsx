"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

/** 상단 가운데 키워드 검색바 — 기사 제목·요약·키워드 검색 */
export function SearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (v) router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  return (
    <form onSubmit={submit} className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="키워드 검색 (기사 제목·내용·검찰청·범죄유형)"
        className="w-full rounded-full border border-line bg-paper py-2 pl-9 pr-4 text-body-s text-ink-title outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
        aria-label="키워드 검색"
      />
    </form>
  );
}
