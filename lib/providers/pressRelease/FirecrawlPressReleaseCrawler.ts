// =====================================================================
// Firecrawl 기반 검찰발표자료 레퍼런스 크롤러
//  * FIRECRAWL_API_KEY 가 있으면 Firecrawl REST(/v1/scrape) 사용.
//  * 없으면 safeFetch + cheerio 폴백. 둘 다 실패하면 [] 반환(절대 throw 안 함).
//  * 공개 발표자료의 '형식'만 수집한다.
// =====================================================================
import * as cheerio from "cheerio";
import { safeFetch } from "@/lib/security/ssrfGuard";
import { htmlToText } from "@/lib/security/sanitize";
import type { PressReleaseProvider, RawPressReference } from "./types";

const DEFAULT_LIST_URL =
  process.env.SPO_PRESS_RELEASE_LIST_URL ||
  "https://www.spo.go.kr/site/spo/ex/board/List.do?cbIdx=1403";
const FIRECRAWL_BASE = process.env.FIRECRAWL_BASE_URL || "https://api.firecrawl.dev";
const USER_AGENT =
  process.env.COLLECT_USER_AGENT || "ProsecutionPlanningAIWorkbench/0.1 (press-release-style-ref)";

function referenceLimit(): number {
  const n = Number(process.env.PRESS_RELEASE_REFERENCE_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : 50;
}

/** 결정적 단순 해시 (title+url) */
function simpleHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  // 부호 제거 후 36진수
  return `pr_${(h >>> 0).toString(36)}`;
}

/** List.do → View.do 링크 변환/정규화 */
function toAbsolute(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function isDetailLink(url: string): boolean {
  return /View\.do/i.test(url) || /bcIdx=|idx=\d+/.test(url);
}

export class FirecrawlPressReleaseCrawler implements PressReleaseProvider {
  readonly name = "FirecrawlPressReleaseCrawler";

  // ----------------- Firecrawl scrape -----------------
  private async firecrawlScrape(
    url: string
  ): Promise<{ markdown?: string; html?: string; links?: string[] } | null> {
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) return null;
    try {
      const res = await fetch(`${FIRECRAWL_BASE}/v1/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "User-Agent": USER_AGENT,
        },
        body: JSON.stringify({ url, formats: ["markdown", "links"] }),
      });
      if (!res.ok) {
        console.warn(`[FirecrawlPressReleaseCrawler] scrape ${res.status} for ${url}`);
        return null;
      }
      const json: any = await res.json().catch(() => null);
      const data = json?.data ?? json;
      if (!data) return null;
      return {
        markdown: typeof data.markdown === "string" ? data.markdown : undefined,
        html: typeof data.html === "string" ? data.html : undefined,
        links: Array.isArray(data.links) ? data.links.map(String) : undefined,
      };
    } catch (e) {
      console.warn("[FirecrawlPressReleaseCrawler] firecrawl scrape failed:", (e as Error)?.message);
      return null;
    }
  }

  // ----------------- safeFetch + cheerio fallback -----------------
  private async fetchHtml(url: string): Promise<string | null> {
    try {
      const res = await safeFetch(url, {
        timeoutMs: 15000,
        init: { headers: { "User-Agent": USER_AGENT } },
      });
      if (!res.ok) {
        console.warn(`[FirecrawlPressReleaseCrawler] fetch ${res.status} for ${url}`);
        return null;
      }
      return await res.text();
    } catch (e) {
      console.warn("[FirecrawlPressReleaseCrawler] fetchHtml failed:", (e as Error)?.message);
      return null;
    }
  }

  private extractDetailLinksFromHtml(html: string, base: string): string[] {
    const out = new Set<string>();
    try {
      const $ = cheerio.load(html);
      $("a[href]").each((_i, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        const abs = toAbsolute(href, base);
        if (abs && isDetailLink(abs)) out.add(abs);
      });
    } catch (e) {
      console.warn("[FirecrawlPressReleaseCrawler] link parse failed:", (e as Error)?.message);
    }
    return Array.from(out);
  }

  // ----------------- public API -----------------
  async collectList(limit: number): Promise<RawPressReference[]> {
    const max = Math.min(limit || referenceLimit(), referenceLimit());
    const listUrl = DEFAULT_LIST_URL;

    // 1) 목록 페이지에서 상세 링크 수집
    let detailLinks: string[] = [];
    const fc = await this.firecrawlScrape(listUrl);
    if (fc?.links?.length) {
      detailLinks = fc.links
        .map((l) => toAbsolute(l, listUrl))
        .filter((l): l is string => !!l && isDetailLink(l));
    }
    if (detailLinks.length === 0) {
      const html = await this.fetchHtml(listUrl);
      if (html) detailLinks = this.extractDetailLinksFromHtml(html, listUrl);
    }

    // 중복 제거 + 상한
    detailLinks = Array.from(new Set(detailLinks)).slice(0, max);
    if (detailLinks.length === 0) {
      console.warn("[FirecrawlPressReleaseCrawler] no detail links found — returning []");
      return [];
    }

    // 2) 상세 수집
    const results: RawPressReference[] = [];
    for (const url of detailLinks) {
      try {
        const detail = await this.collectDetail(url);
        const title = (detail.title || "").trim();
        if (!title) continue;
        results.push({
          title,
          officeName: detail.officeName,
          publishedAt: detail.publishedAt,
          sourceUrl: url,
          listPageUrl: listUrl,
          viewCount: detail.viewCount,
          markdownContent: detail.markdownContent,
          plainText: detail.plainText,
          attachmentUrls: detail.attachmentUrls || [],
          attachmentTypes: detail.attachmentTypes || [],
          contentHash: detail.contentHash || simpleHash(`${title}|${url}`),
        });
      } catch (e) {
        console.warn("[FirecrawlPressReleaseCrawler] detail failed:", url, (e as Error)?.message);
      }
      if (results.length >= max) break;
    }

    return results;
  }

  async collectDetail(url: string): Promise<Partial<RawPressReference>> {
    // Firecrawl 우선
    const fc = await this.firecrawlScrape(url);
    let markdown = fc?.markdown;
    let html = fc?.html;

    // 폴백: 직접 HTML
    if (!markdown && !html) {
      const fetched = await this.fetchHtml(url);
      if (fetched) html = fetched;
    }

    let title = "";
    let plainText = "";
    if (html) {
      try {
        const $ = cheerio.load(html);
        // 제목 추정: h1/h2/.title/페이지 title 순
        title =
          $("h1").first().text().trim() ||
          $(".title, .board-title, .view-title").first().text().trim() ||
          $("title").first().text().trim();
        plainText = htmlToText($("body").html() || html).slice(0, 4000);
      } catch {
        plainText = htmlToText(html).slice(0, 4000);
      }
    }
    if (!plainText && markdown) {
      plainText = markdown.replace(/[#>*_`]/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 4000);
    }
    if (!title && markdown) {
      const firstHeading = markdown.split("\n").find((l) => l.trim().startsWith("#"));
      if (firstHeading) title = firstHeading.replace(/^#+\s*/, "").trim();
    }

    return {
      title,
      sourceUrl: url,
      markdownContent: markdown,
      plainText: plainText || undefined,
      contentHash: simpleHash(`${title}|${url}`),
    };
  }
}
