// =====================================================================
// LicensedNewsProvider — 라이선스 뉴스 API(빅카인즈/뉴스토어/언론사 계약 API)
//  * MVP: mock. 라이선스 키가 있으면 원문 표시 가능 구조를 보여준다.
//  * 무단 크롤링 대체용 — 합법적 공급원 연결 지점.
// =====================================================================
import type { CollectOptions, NewsProvider, RawArticle } from "./types";

export class LicensedNewsProvider implements NewsProvider {
  readonly name = "라이선스 뉴스 API(mock)";
  readonly providerType = "LICENSED_NEWS" as const;
  readonly enabledInProduction = true;

  private get hasLicense(): boolean {
    return Boolean(process.env.LICENSED_NEWS_API_KEY);
  }

  async collect(_opts: CollectOptions): Promise<RawArticle[]> {
    // 실제 운영: 라이선스 API 호출. 여기서는 연결 구조만 시연.
    // 라이선스가 없으면 원문 표시 불가(canDisplayFullText=false)로 반환되어
    // UI 에서 '원문 표시 제한' fallback 이 동작함을 보여준다.
    const licensed = this.hasLicense;
    return [
      {
        title: "[라이선스 연동 예시] 라이선스 API 연결 시 원문 표시 가능",
        sourceName: "라이선스 뉴스 공급원",
        publishedAt: new Date(),
        originalUrl: "https://example-licensed-news.invalid/article/0",
        summary: "라이선스 계약 기반 공급원. 키 연결 시 원문 본문이 표시됩니다.",
        fullText: licensed ? "(라이선스 계약 범위 내 원문 본문)" : undefined,
        sourceType: "LICENSED_NEWS",
        licenseType: "LICENSED_API",
        canStoreFullText: licensed,
        canDisplayFullText: licensed,
        copyrightNotice: licensed
          ? "라이선스 계약 범위 내 표시 허용"
          : "라이선스 미연결 — 제목/요약/링크만 표시 가능",
      },
    ];
  }
}
