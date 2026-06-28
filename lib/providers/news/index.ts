// =====================================================================
// NewsProvider 팩토리 — env(NEWS_PROVIDER_MODE / APP_MODE)로 선택
//   public   : 공식 보도자료 + 공개 RSS
//   licensed : 라이선스 뉴스 API
//   dev      : DevCrawler 허용(development 에서만)
// =====================================================================
import type { NewsProvider } from "./types";
import { PublicPressReleaseProvider } from "./PublicPressReleaseProvider";
import { LicensedNewsProvider } from "./LicensedNewsProvider";
import { DevCrawlerProvider } from "./DevCrawlerProvider";

export * from "./types";
export { PublicPressReleaseProvider, LicensedNewsProvider, DevCrawlerProvider };

export function getNewsProviders(): NewsProvider[] {
  const mode = (process.env.NEWS_PROVIDER_MODE || "public").toLowerCase();
  const isProd = process.env.APP_MODE === "production";
  const providers: NewsProvider[] = [new PublicPressReleaseProvider()];

  if (mode === "licensed") providers.push(new LicensedNewsProvider());
  if (mode === "dev" && !isProd) providers.push(new DevCrawlerProvider());

  // 운영 모드에서는 enabledInProduction=false provider 제거(이중 안전장치)
  return providers.filter((p) => !isProd || p.enabledInProduction);
}

export function getDevCrawler(): DevCrawlerProvider | null {
  if (process.env.APP_MODE === "production") return null;
  return new DevCrawlerProvider();
}
