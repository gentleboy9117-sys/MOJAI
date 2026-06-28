// =====================================================================
// DevCrawlerProvider — 개발/로컬 테스트 전용. 운영 모드에서 비활성화.
//  * 수동 입력 URL 만 대상. robots/allowlist/SSRF 통제 하에서만 동작.
//  * 원문 대량 저장/표시 기본 비허용(canStore/Display=false).
// =====================================================================
import * as cheerio from "cheerio";
import { safeFetch } from "@/lib/security/ssrfGuard";
import { htmlToText } from "@/lib/security/sanitize";
import type { CollectOptions, NewsProvider, RawArticle } from "./types";

function extractReadable(html: string): { title: string; text: string } {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, aside, form, noscript").remove();
  const title =
    $('meta[property="og:title"]').attr("content") || $("title").first().text() || "(제목 없음)";
  // article > main > 본문 후보 중 가장 텍스트가 많은 컨테이너
  let best = "";
  $("article, main, #content, .article-body, .news-content, .view-con, body").each((_, el) => {
    const t = htmlToText($.html(el));
    if (t.length > best.length) best = t;
  });
  return { title: title.trim(), text: best.slice(0, 6000) };
}

export class DevCrawlerProvider implements NewsProvider {
  readonly name = "개발용 수집기(DevCrawler)";
  readonly providerType = "DEV_CRAWLER" as const;
  readonly enabledInProduction = false;

  async collect(opts: CollectOptions): Promise<RawArticle[]> {
    if (process.env.APP_MODE === "production") {
      console.warn("[DevCrawler] 운영 모드에서는 비활성화됩니다.");
      return [];
    }
    const urls = (opts.urls || []).slice(0, opts.limit ?? 10);
    const out: RawArticle[] = [];
    for (const url of urls) {
      try {
        const res = await safeFetch(url, { timeoutMs: 15000 });
        if (!res.ok) continue;
        const html = await res.text();
        const { title, text } = extractReadable(html);
        out.push({
          title,
          sourceName: new URL(url).hostname,
          publishedAt: new Date(),
          originalUrl: url,
          fullText: text,
          sourceType: "WEB_NEWS",
          licenseType: "DEV_CRAWL",
          canStoreFullText: false,
          canDisplayFullText: false,
          copyrightNotice: "개발용 수집 — 원문 표시/저장 제한(상용화 시 라이선스 필요)",
        });
        // 과도한 요청 방지(간단 지연)
        await new Promise((r) => setTimeout(r, 400));
      } catch (e) {
        console.error("[DevCrawler] 실패:", url, e instanceof Error ? e.message : e);
      }
    }
    return out;
  }
}
