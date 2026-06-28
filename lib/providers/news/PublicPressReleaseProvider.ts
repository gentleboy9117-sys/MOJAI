// =====================================================================
// PublicPressReleaseProvider — 검찰청/법무부 공식 보도자료, 공개 RSS
//  * 재사용 가능한 공개 자료 → 원문 저장/표시 허용
// =====================================================================
import Parser from "rss-parser";
import { safeFetch } from "@/lib/security/ssrfGuard";
import { htmlToText } from "@/lib/security/sanitize";
import type { CollectOptions, NewsProvider, RawArticle } from "./types";

const parser = new Parser({ timeout: 15000 });

export class PublicPressReleaseProvider implements NewsProvider {
  readonly name = "공식 보도자료/공개 RSS";
  readonly providerType = "PUBLIC_PRESS_RELEASE" as const;
  readonly enabledInProduction = true;

  async collect(opts: CollectOptions): Promise<RawArticle[]> {
    if (!opts.rssUrl) return [];
    try {
      // allowlist 검증 후 fetch → 파싱(파서 자체 fetch 우회로 SSRF 통제)
      const res = await safeFetch(opts.rssUrl, { timeoutMs: 15000 });
      if (!res.ok) return [];
      const xml = await res.text();
      const feed = await parser.parseString(xml);
      const items = (feed.items || []).slice(0, opts.limit ?? 30);
      return items.map((it) => {
        const text = htmlToText(it["content:encoded"] || it.content || it.contentSnippet || "");
        return {
          title: (it.title || "(제목 없음)").trim(),
          sourceName: feed.title || "공식 보도자료",
          publishedAt: it.isoDate ? new Date(it.isoDate) : new Date(),
          originalUrl: it.link || opts.rssUrl!,
          fullText: text || undefined,
          summary: it.contentSnippet?.slice(0, 200),
          sourceType: "OFFICIAL_PRESS",
          licenseType: "PUBLIC_PRESS",
          canStoreFullText: true,
          canDisplayFullText: true,
          copyrightNotice: "공공기관 공식 보도자료(재사용 가능 공개 자료)",
        } satisfies RawArticle;
      });
    } catch (e) {
      console.error("[PublicPressReleaseProvider] 수집 실패:", e instanceof Error ? e.message : e);
      return [];
    }
  }
}
