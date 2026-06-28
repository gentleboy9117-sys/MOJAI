// =====================================================================
// [공안] 집회·시위 보도 본문 기반 발생지 관할 분류 (enrichment)
//  * 구글뉴스 RSS 링크 → 실제 언론사 URL 디코딩(batchexecute) → 본문 수집
//  * 본문(제목+요약+본문)에서 발생 장소를 찾아 검찰청 관할로 분류해 저장
//  * 일반 primaryOffice 와 별도(assemblyOffice*). 실패해도 throw 하지 않는다.
// =====================================================================
import type { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";
import { getJurisdictionOffices } from "./runAssemblyPipeline";
import { classifyAllOffices } from "./assemblyJurisdictionClassifier";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: ctrl.signal });
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/** 구글뉴스 RSS article URL → 실제 언론사 URL (batchexecute 디코딩) */
export async function decodeGoogleNewsUrl(url: string): Promise<string | null> {
  if (!url.includes("news.google.com")) return url; // 이미 실제 URL
  try {
    const html = await fetchText(url);
    const id = html.match(/data-n-a-id="([^"]+)"/)?.[1];
    const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
    if (!id || !sg || !ts) return null;
    const inner = JSON.stringify([
      "garturlreq",
      [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0],
      id, Number(ts), sg,
    ]);
    const freq = JSON.stringify([[["Fbv4je", inner, null, "generic"]]]);
    const res = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: "f.req=" + encodeURIComponent(freq),
    });
    const text = await res.text();
    const urls = text.match(/https?:\/\/[^\s"\\]+/g);
    return urls?.find((u) => !u.includes("google.com") && !u.includes("gstatic")) ?? null;
  } catch {
    return null;
  }
}

const BODY_SELECTORS = [
  "#article-view-content-div", "#articleBody", "#articleBodyContents", "#newsEndContents",
  "#news_body_area", "#article_body", "#dic_area", "#newsct_article", "#textBody",
  ".article-body", ".article_body", ".news-content", ".news_content", ".article_view",
  ".articleView", ".art_text", ".article-veiw-body", ".view_con", ".view-con", ".cont_view",
  "article", "main", "#content",
];

export function extractBody(html: string): string {
  try {
    const $ = cheerio.load(html);
    $("script,style,nav,header,footer,aside,form,noscript,figure,figcaption,.copyright,.reporter,.byline,.caption,.img_desc,.photo_caption").remove();
    // 관련기사·추천·광고 영역 제거(다른 사건 지명 오매칭 방지)
    $("[class*='relate'],[class*='recommend'],[class*='related'],[id*='relate'],[class*='ad_'],[class*='banner'],[class*='link_news'],[class*='reporterArea']").remove();
    let best = "";
    for (const sel of BODY_SELECTORS) {
      $(sel).each((_, el) => {
        const t = $(el).text().replace(/\s+/g, " ").trim();
        if (t.length > best.length) best = t;
      });
    }
    // 폴백: 본문 컨테이너를 못 찾으면 body 전체 텍스트
    if (best.length < 200) {
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      if (bodyText.length > best.length) best = bodyText;
    }
    // 일부 언론사는 본문을 head script 안에 넣음 — script 보존 정규식 추출(style만 제거)
    if (best.length < 400) {
      const stripped = html
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z#0-9]+;/gi, " ")
        .replace(/\\u[0-9a-fA-F]{4}/g, (m) => { try { return JSON.parse('"' + m + '"'); } catch { return " "; } })
        .replace(/\s+/g, " ")
        .trim();
      if (stripped.length > best.length) best = stripped;
    }
    return best.slice(0, 12000);
  } catch {
    return "";
  }
}

export interface EnrichResult {
  processed: number;
  classified: number;
  failed: number;
}

/** 미처리(또는 재처리) 집회·시위 기사 본문을 수집해 발생지 관할로 분류·저장 */
export async function enrichAssemblyNewsBodies(
  prisma: PrismaClient,
  opts: { limit?: number; sinceDays?: number; delayMs?: number; allArticles?: boolean; unclassifiedOnly?: boolean } = {},
): Promise<EnrichResult> {
  const limit = opts.limit ?? 80;
  const sinceDays = opts.sinceDays ?? 120;
  const delayMs = opts.delayMs ?? 400;
  const since = new Date(Date.now() - sinceDays * 86400000);

  const offices = await getJurisdictionOffices(prisma);
  // allArticles=true 면 집회뿐 아니라 모든 기사 본문을 분석해 관할(primaryOffice)을 정밀화
  const where: any = { bodyEnrichedAt: null, publishedAt: { gte: since } };
  if (opts.unclassifiedOnly) where.primaryOfficeId = null; // 제목으로 관할 못 잡은 기사만 본문 분석
  if (!opts.allArticles) {
    where.OR = [
      { title: { contains: "집회" } }, { title: { contains: "시위" } },
      { summary: { contains: "집회" } }, { summary: { contains: "시위" } },
    ];
  }
  const articles = await prisma.article.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { id: true, title: true, summary: true, originalUrl: true },
  });

  let classified = 0;
  let failed = 0;
  for (const a of articles) {
    let offs: { officeId: string; officeName: string; hint: string }[] = [];
    let resolvedUrl: string | null = null;
    try {
      const real = await decodeGoogleNewsUrl(a.originalUrl);
      if (real && real !== a.originalUrl) resolvedUrl = real; // 실제 언론사 원문 URL(링크용)
      let body = "";
      if (real) body = extractBody(await fetchText(real));
      const text = `${a.title} ${a.summary ?? ""} ${body}`;
      // 본문 기준 관할 추출(검찰청 직접언급 > 법원 대응 > 구·시군·경찰서·랜드마크, 복수 허용)
      offs = classifyAllOffices(text, offices);
      if (offs.length) classified++;
    } catch {
      failed++;
    }
    const primary = offs[0];
    const isAssembly = /집회|시위/.test(`${a.title} ${a.summary ?? ""}`);
    await prisma.article.update({
      where: { id: a.id },
      data: {
        ...(resolvedUrl ? { resolvedUrl } : {}),
        // 본문에서 관할을 찾으면 이슈 모니터링 관할(primaryOffice)도 정밀화(못 찾으면 기존 유지)
        ...(primary ? { primaryOfficeId: primary.officeId } : {}),
        // 집회·시위 보도 탭용 복수 관할(집회 기사에만)
        assemblyOfficeId: isAssembly ? primary?.officeId ?? null : null,
        assemblyOfficeName: isAssembly ? primary?.officeName ?? null : null,
        assemblyOffices: isAssembly && offs.length ? JSON.stringify(offs) : null,
        assemblyLocationHint: isAssembly ? primary?.hint ?? null : null,
        bodyEnrichedAt: new Date(),
      },
    });
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  }

  return { processed: articles.length, classified, failed };
}
