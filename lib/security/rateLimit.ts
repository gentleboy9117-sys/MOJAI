// =====================================================================
// 간단한 인메모리 rate limit (고정 윈도우)
//  * 수집/생성 등 비용 큰 작업 보호. 운영 다중 인스턴스에서는 Redis 로 교체.
// =====================================================================
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetInMs: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetInMs: windowMs };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetInMs: b.resetAt - now };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, resetInMs: b.resetAt - now };
}

/** 수집 작업 분당 제한(env COLLECT_RATE_LIMIT_PER_MIN) */
export function checkCollectRateLimit(key = "collect"): RateLimitResult {
  const limit = Number(process.env.COLLECT_RATE_LIMIT_PER_MIN || 20);
  return checkRateLimit(key, limit, 60_000);
}
