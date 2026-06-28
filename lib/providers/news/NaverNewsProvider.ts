// =====================================================================
// NaverNewsProvider — 네이버 뉴스 검색 API (합법 공급원)
//  * originallink = 실제 언론사 원문 URL → 링크 정상(구글 디코딩 불필요)
//  * 제목/요약(description) 제공. 전문(full-text)은 미제공 → canDisplayFullText=false.
//  * 키(NAVER_CLIENT_ID/SECRET) 없으면 [] 반환.
// =====================================================================
import type { CollectOptions, NewsProvider, RawArticle } from "./types";

function stripHtml(s: string): string {
  return (s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .trim();
}

function hostName(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "네이버뉴스"; }
}

export class NaverNewsProvider implements NewsProvider {
  readonly name = "네이버 뉴스 검색 API";
  readonly providerType = "LICENSED_NEWS" as const;
  readonly enabledInProduction = true;

  private get creds(): { id: string; secret: string } | null {
    const id = process.env.NAVER_CLIENT_ID;
    const secret = process.env.NAVER_CLIENT_SECRET;
    return id && secret ? { id, secret } : null;
  }

  async collect(opts: CollectOptions): Promise<RawArticle[]> {
    const creds = this.creds;
    if (!creds) return [];
    const keywords = opts.keywords?.length ? opts.keywords : ["검찰"];
    const display = Math.min(100, opts.limit ?? 100);
    const out: RawArticle[] = [];
    for (const q of keywords) {
      try {
        const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(q)}&display=${display}&sort=date`;
        const res = await fetch(url, {
          headers: { "X-Naver-Client-Id": creds.id, "X-Naver-Client-Secret": creds.secret },
        });
        if (!res.ok) continue;
        const json: any = await res.json();
        for (const it of json.items ?? []) {
          const original = (it.originallink || it.link || "").trim();
          if (!original) continue;
          const title = stripHtml(it.title);
          const summary = stripHtml(it.description);
          out.push({
            title,
            sourceName: hostName(original),
            publishedAt: it.pubDate ? new Date(it.pubDate) : new Date(),
            originalUrl: original, // 실제 언론사 원문 URL
            summary,
            sourceType: "LICENSED_NEWS",
            licenseType: "LICENSED_API",
            canStoreFullText: false,
            canDisplayFullText: false, // 전문 미제공(제목·요약·링크만)
            copyrightNotice: "네이버 뉴스 검색 API — 제목·요약·원문 링크 표시(전문은 원문 참조)",
          });
        }
        await new Promise((r) => setTimeout(r, 120)); // rate limit 여유
      } catch {
        /* ignore one keyword failure */
      }
    }
    return out;
  }
}
