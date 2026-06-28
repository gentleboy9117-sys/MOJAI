// =====================================================================
// NewsProvider 추상화 — 수집 단계와 저작권/표시 권한을 분리
// =====================================================================
import type { LicenseType, ProviderType } from "@/lib/types";

/** Provider 가 반환하는 원시 기사(분류 전) */
export interface RawArticle {
  title: string;
  sourceName: string;
  publishedAt: Date;
  originalUrl: string;
  rawHtml?: string;
  fullText?: string;
  summary?: string;
  // 저작권/표시 정책 — provider 가 단정한다
  sourceType: string; // OFFICIAL_PRESS | MOJ_SPO_OFFICIAL | LICENSED_NEWS | WEB_NEWS | MANUAL | SAMPLE
  licenseType: LicenseType;
  canStoreFullText: boolean;
  canDisplayFullText: boolean;
  copyrightNotice?: string;
}

export interface CollectOptions {
  rssUrl?: string;
  urls?: string[];
  keywords?: string[];
  limit?: number;
}

export interface NewsProvider {
  readonly name: string;
  readonly providerType: ProviderType;
  /** 운영 모드에서 사용 가능 여부 */
  readonly enabledInProduction: boolean;
  collect(opts: CollectOptions): Promise<RawArticle[]>;
}
