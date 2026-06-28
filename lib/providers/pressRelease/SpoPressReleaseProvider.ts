// =====================================================================
// SPO(대검찰청/검찰) 발표자료 Provider
//  * FirecrawlPressReleaseCrawler 로 위임.
//  * loadSampleReferences(): 오프라인 데모용 샘플 레퍼런스(fs) 로드.
// =====================================================================
import { promises as fs } from "node:fs";
import path from "node:path";
import { FirecrawlPressReleaseCrawler } from "./FirecrawlPressReleaseCrawler";
import type { PressReleaseProvider, RawPressReference } from "./types";

const SAMPLE_PATH = path.join(
  process.cwd(),
  "data",
  "sample-press-release-references.json"
);

export class SpoPressReleaseProvider implements PressReleaseProvider {
  readonly name = "SpoPressReleaseProvider";
  private crawler = new FirecrawlPressReleaseCrawler();

  collectList(limit: number): Promise<RawPressReference[]> {
    return this.crawler.collectList(limit);
  }

  collectDetail(url: string): Promise<Partial<RawPressReference>> {
    return this.crawler.collectDetail(url);
  }

  /** 오프라인 데모용 샘플 레퍼런스 로드 (실패 시 []) */
  async loadSampleReferences(): Promise<RawPressReference[]> {
    try {
      const raw = await fs.readFile(SAMPLE_PATH, "utf-8");
      const json = JSON.parse(raw);
      const arr = Array.isArray(json) ? json : json?.references;
      if (!Array.isArray(arr)) return [];
      return arr.map((r: any): RawPressReference => ({
        title: String(r.title || ""),
        officeName: r.officeName ? String(r.officeName) : undefined,
        publishedAt: r.publishedAt ? new Date(r.publishedAt) : undefined,
        sourceUrl: String(r.sourceUrl || ""),
        listPageUrl: r.listPageUrl ? String(r.listPageUrl) : undefined,
        viewCount: typeof r.viewCount === "number" ? r.viewCount : undefined,
        markdownContent: r.markdownContent ? String(r.markdownContent) : undefined,
        plainText: r.plainText ? String(r.plainText) : undefined,
        attachmentUrls: Array.isArray(r.attachmentUrls) ? r.attachmentUrls.map(String) : [],
        attachmentTypes: Array.isArray(r.attachmentTypes) ? r.attachmentTypes.map(String) : [],
        contentHash: String(r.contentHash || `sample_${Math.random().toString(36).slice(2)}`),
      }));
    } catch (e) {
      console.warn("[SpoPressReleaseProvider] loadSampleReferences failed:", (e as Error)?.message);
      return [];
    }
  }
}

let cached: PressReleaseProvider | null = null;

/** Provider 팩토리 (현재 SPO 단일) */
export function getPressReleaseProvider(): PressReleaseProvider {
  if (cached) return cached;
  cached = new SpoPressReleaseProvider();
  return cached;
}
