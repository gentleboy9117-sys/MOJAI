// Firecrawl v2 scrape 래퍼 — 구글뉴스 리다이렉트/봇차단 언론사도 본문(markdown) 확보.
//  반환: { markdown, resolvedUrl } | null
const BASE = process.env.FIRECRAWL_BASE_URL || "https://api.firecrawl.dev";

export async function firecrawlScrape(
  url: string,
  opts: { retries?: number } = {},
): Promise<{ markdown: string; resolvedUrl: string | null } | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  const retries = opts.retries ?? 2;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}/v2/scrape`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, timeout: 30000 }),
      });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
      const json: any = await res.json();
      const d = json?.data;
      if (!d) return null;
      const md: string = d.markdown || "";
      // 실제 원문 URL 후보(구글뉴스가 아닌 것)
      const meta = d.metadata || {};
      const cand = [meta.url, meta.sourceURL, meta["og:url"], meta.ogUrl].find(
        (u: any) => typeof u === "string" && u.startsWith("http") && !u.includes("news.google.com"),
      );
      return { markdown: md, resolvedUrl: cand ?? null };
    } catch {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}
