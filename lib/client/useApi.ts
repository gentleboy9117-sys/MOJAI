"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { apiGet } from "./api";
import { snapName, SNAP_DIR } from "./snap";

// 정적 스냅샷(고정 데이터) 우선 로드 → 없으면 라이브 API 폴백.
//  스냅샷은 CDN에서 즉시 응답하므로 첫 화면 로딩이 빨라진다.
async function loadUrl<T>(url: string): Promise<T> {
  try {
    const r = await fetch(`${SNAP_DIR}/${snapName(url)}`, { cache: "force-cache" });
    if (r.ok) {
      const j = await r.json();
      return j as T; // 스냅샷은 이미 unwrap 된 data
    }
  } catch {
    /* 스냅샷 없음/파싱 실패 → 라이브 폴백 */
  }
  return apiGet<T>(url);
}

// 세션(페이지 로드) 동안 URL별 응답을 캐시 → 화면 이동 시 재요청하지 않음.
//  사용자가 '새로고침' 버튼을 누를 때만(refetch / refreshApiCache) 다시 불러온다.
const cache = new Map<string, unknown>();
const listeners = new Set<() => void>();

/** 전역 새로고침 — 모든 캐시 비우고 마운트된 useApi 들을 다시 불러오게 한다 */
export function refreshApiCache() {
  cache.clear();
  listeners.forEach((l) => l());
}

export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(url && cache.has(url) ? (cache.get(url) as T) : null);
  const [loading, setLoading] = useState(!!url && !cache.has(url));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // refetch/전역 새로고침 트리거
  const prevUrl = useRef<string | null>(null);

  // 전역 새로고침 구독
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const refetch = useCallback(() => {
    if (url) cache.delete(url); // 이 URL만 강제 재요청
    setTick((t) => t + 1);
  }, [url]);

  useEffect(() => {
    if (prevUrl.current !== url) prevUrl.current = url;
    if (!url) { setData(null); setLoading(false); return; }
    // 캐시에 있으면 재요청하지 않고 그대로 사용
    if (cache.has(url)) { setData(cache.get(url) as T); setLoading(false); setError(null); return; }
    let on = true;
    setLoading(true);
    loadUrl<T>(url)
      .then((d) => { if (on) { cache.set(url, d); setData(d); setError(null); } })
      .catch((e) => on && setError(e.message))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [url, tick]);

  return { data, loading, error, refetch };
}
