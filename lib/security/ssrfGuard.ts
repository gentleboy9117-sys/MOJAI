// =====================================================================
// SSRF 방어 + 외부 fetch allowlist
//  * 내부 IP / localhost / 클라우드 metadata endpoint 접근 차단
//  * FETCH_ALLOWLIST 도메인만 허용
// =====================================================================
import net from "node:net";
import dns from "node:dns/promises";

const DEFAULT_ALLOWLIST = ["www.spo.go.kr", "spo.go.kr", "www.moj.go.kr", "moj.go.kr"];

export function getAllowlist(): string[] {
  const env = (process.env.FETCH_ALLOWLIST || "").split(",").map((s) => s.trim()).filter(Boolean);
  return env.length ? env : DEFAULT_ALLOWLIST;
}

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return getAllowlist().some((a) => host === a || host.endsWith(`.${a}`));
}

/** 사설/예약 IP 대역 여부 (SSRF 차단) */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true;
    if (a === 127) return true; // loopback
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local / metadata(169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127");
  }
  return false;
}

const BLOCKED_HOSTS = ["localhost", "metadata.google.internal", "metadata", "instance-data"];

/** URL 안전성 검증 — 위반 시 throw */
export async function assertUrlAllowed(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`잘못된 URL: ${rawUrl}`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`허용되지 않은 프로토콜: ${url.protocol}`);
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(host)) throw new Error(`내부 호스트 차단: ${host}`);

  // IP 리터럴이면 사설 대역 차단
  if (net.isIP(host) && isPrivateIp(host)) throw new Error(`내부 IP 차단: ${host}`);

  if (!hostAllowed(host)) {
    throw new Error(`allowlist 외 도메인 차단: ${host} (FETCH_ALLOWLIST 확인)`);
  }

  // DNS 리바인딩 방어: 해석된 IP가 사설이면 차단(오프라인/실패 시 allowlist 신뢰)
  try {
    const records = await dns.lookup(host, { all: true });
    for (const r of records) {
      if (isPrivateIp(r.address)) throw new Error(`사설 IP 로 해석되는 호스트 차단: ${host} → ${r.address}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("차단")) throw e;
    // lookup 실패는 allowlist 통과로 간주(내부망/오프라인 대비)
  }
  return url;
}

/** 안전 fetch — allowlist 검증 + UA + timeout */
export async function safeFetch(rawUrl: string, opts: { timeoutMs?: number; init?: RequestInit } = {}) {
  await assertUrlAllowed(rawUrl);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
  try {
    return await fetch(rawUrl, {
      ...opts.init,
      signal: ctrl.signal,
      redirect: "manual", // 리다이렉트로 우회하는 SSRF 방지
      headers: {
        "User-Agent": process.env.COLLECT_USER_AGENT || "ProsecutionPlanningAIWorkbench/0.1",
        ...(opts.init?.headers || {}),
      },
    });
  } finally {
    clearTimeout(t);
  }
}
