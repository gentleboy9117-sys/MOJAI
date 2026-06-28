"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { apiGet } from "./api";

export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const prevUrl = useRef<string | null>(null);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    // URL이 바뀌면 이전(다른 형태) 데이터를 비워 잔상/형태 불일치 렌더를 방지
    if (prevUrl.current !== url) { setData(null); prevUrl.current = url; }
    if (!url) { setLoading(false); return; }
    let on = true;
    setLoading(true);
    apiGet<T>(url)
      .then((d) => on && (setData(d), setError(null)))
      .catch((e) => on && setError(e.message))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [url, nonce]);

  return { data, loading, error, refetch };
}
