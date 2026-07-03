"use client";
import { useEffect } from "react";
import { calendarRange } from "@/lib/periodRange";
import { prefetchApi } from "@/lib/client/useApi";

/** 초기 로드 후 유휴 시간에 주요 탭의 스냅샷을 미리 받아 메모리 캐시에 저장.
 *  → 집회/선거/노동 보도, 검찰청별/범죄유형별 보기 등 클릭 시 즉시 표시된다. */
export function PrefetchSnapshots() {
  useEffect(() => {
    const m = calendarRange("month");
    const iso = (d: Date) => d.toISOString();
    const enc = encodeURIComponent;
    const urls = [
      "/api/offices",
      "/api/dashboard/office-heatmap?period=month",
      "/api/issues?period=30d",
      "/api/public-safety/sources",
      "/api/articles?crimeType=공판&period=all&limit=300",
      `/api/articles?crimeType=공판&startDate=${iso(m.start)}&endDate=${iso(m.end)}&limit=3000&sort=score`,
      `/api/articles?crimeType=공판&startDate=${iso(m.start)}&endDate=${iso(m.end)}&limit=3000`,
      `/api/articles?crimeType=공판&startDate=${iso(m.prevStart)}&endDate=${iso(m.prevEnd)}&limit=3000`,
      `/api/articles?keyword=집회&limit=3000&startDate=${iso(m.start)}&endDate=${iso(m.end)}`,
      `/api/articles?keyword=집회&limit=3000&startDate=${iso(m.prevStart)}&endDate=${iso(m.prevEnd)}`,
      `/api/articles?crimeType=선거범죄&limit=3000&startDate=${iso(m.start)}&endDate=${iso(m.end)}`,
      `/api/articles?crimeType=선거범죄&limit=3000&startDate=${iso(m.prevStart)}&endDate=${iso(m.prevEnd)}`,
      `/api/articles?crimeType=${enc("노동/중대재해범죄")}&limit=3000&startDate=${iso(m.start)}&endDate=${iso(m.end)}`,
      `/api/articles?crimeType=${enc("노동/중대재해범죄")}&limit=3000&startDate=${iso(m.prevStart)}&endDate=${iso(m.prevEnd)}`,
      `/api/articles?crimeType=${enc("형사사법제도/정책")}&period=all&limit=300`,
    ];
    const run = () => urls.forEach((u, i) => setTimeout(() => prefetchApi(u), i * 150));
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
    if (ric) ric(run); else setTimeout(run, 1500);
  }, []);
  return null;
}
