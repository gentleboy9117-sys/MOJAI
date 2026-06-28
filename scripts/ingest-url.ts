// 임의 기사 URL 1건을 수동 수집·분류·반영. 사용: INGEST_URL="https://..." tsx scripts/ingest-url.ts
import "dotenv/config";
import * as cheerio from "cheerio";
import { prisma } from "@/lib/db/prisma";
import { classifyArticle, contentHashOf } from "@/lib/classifiers";
import { getOfficeLites } from "@/lib/pipeline/runPipeline";
import { getJurisdictionOffices } from "@/lib/publicSafety/runAssemblyPipeline";
import { classifyAllOffices } from "@/lib/publicSafety/assemblyJurisdictionClassifier";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
const URL_ = process.env.INGEST_URL || process.argv[2];

function fromJsonLd(html: string): string {
  let best = "";
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1].trim());
      const nodes = Array.isArray(j) ? j : j["@graph"] ? j["@graph"] : [j];
      for (const n of nodes) {
        const t = String(n?.articleBody || n?.description || "").replace(/\s+/g, " ").trim();
        if (t.length > best.length) best = t;
      }
    } catch { /* ignore */ }
  }
  return best;
}

function extractBody(html: string): string {
  // 0) JSON-LD articleBody (언론사 본문이 script 안에 있는 경우 — AMP 등)
  const ld = fromJsonLd(html);
  const $ = cheerio.load(html);
  // 본문 외 영역(관련기사·추천·목록·댓글 등) 제거 — 분류 오염 방지
  $("script,style,nav,header,footer,aside,form,noscript,ul,ol,.related,.relate,.recommend,.rec,.more,.list,.article-list,.copyright,.reporter,.byline,.tag,.share,.comment").remove();
  let best = ld;
  for (const sel of ["#article-view-content-div", "#articleBody", "#articleBodyContents", ".article-body", ".article_body", ".news-content", "article", "main", "#content"]) {
    $(sel).each((_, el) => { const t = $(el).text().replace(/\s+/g, " ").trim(); if (t.length > best.length) best = t; });
  }
  // 본문 컨테이너가 짧으면(AMP 등 cheerio 미탐지) 원시 HTML 태그 제거로 보강(법원명 등 누락 방지)
  if (best.length < 600) {
    // script 내용 보존(일부 언론사는 본문을 head script 안에 넣음) — style만 제거
    const stripped = html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/\\u[0-9a-fA-F]{4}/g, (m) => { try { return JSON.parse('"' + m + '"'); } catch { return " "; } })
      .replace(/\s+/g, " ")
      .trim();
    if (stripped.length > best.length) best = stripped;
  }
  // '관련기사 / 많이 본 / 저작권' 이후는 본문 아님 — 잘라냄
  best = best.split(/관련\s*기사|많이\s*본\s*뉴스|ⓒ|무단\s*전재|저작권자/)[0];
  return best.slice(0, 12000);
}

async function main() {
  if (!URL_) { console.error("INGEST_URL 필요"); process.exit(1); }
  let res = await fetch(URL_, { headers: { "User-Agent": UA }, redirect: "follow" });
  let html = await res.text();
  let $ = cheerio.load(html);
  // AMP/모바일 페이지면 정규 URL(canonical)로 다시 받아 본문 확보
  const canonical = $('link[rel="canonical"]').attr("href") || $('meta[property="og:url"]').attr("content");
  if (canonical && canonical !== URL_ && canonical.startsWith("http") && (URL_.includes("/amp/") || canonical.replace("/amp/", "/") !== URL_.replace("/amp/", "/"))) {
    try {
      const r2 = await fetch(canonical, { headers: { "User-Agent": UA }, redirect: "follow" });
      const h2 = await r2.text();
      if (h2 && h2.length > 500) { html = h2; $ = cheerio.load(html); console.log(`정규 URL로 재수집: ${canonical.slice(0, 70)}`); }
    } catch { /* keep amp */ }
  }
  const title = ($('meta[property="og:title"]').attr("content") || $("title").first().text() || "").replace(/\s+/g, " ").trim();
  const source = ($('meta[property="og:site_name"]').attr("content") || new URL(URL_).hostname).trim();
  const body = extractBody(html);
  console.log(`제목: ${title}`);
  console.log(`출처: ${source} · 본문길이 ${body.length}`);

  // 제목으로 중복 확인 (INGEST_FORCE=1 이면 기존 삭제 후 재반영)
  const key = title.slice(0, 20);
  const exists = key ? await prisma.article.findFirst({ where: { title: { contains: key } }, select: { id: true, title: true } }) : null;
  if (exists) {
    if (process.env.INGEST_FORCE === "1") {
      await prisma.assemblyArticleLink.deleteMany({ where: { articleId: exists.id } });
      await prisma.article.delete({ where: { id: exists.id } });
      console.log(`기존 삭제 후 재반영: ${exists.title.slice(0, 30)}`);
    } else {
      console.log(`이미 반영됨: ${exists.title.slice(0, 40)} (id=${exists.id})`);
      await prisma.$disconnect();
      return;
    }
  }

  const offices = await getOfficeLites();
  const r = classifyArticle({ title, fullText: body, summary: body.slice(0, 200), sourceType: "WEB_NEWS", sourceName: source }, offices);

  // 집회/시위 기사면 발생장소 복수 관할
  let assemblyOffices: any[] = [];
  if (/집회|시위/.test(`${title} ${body}`)) {
    const jo = await getJurisdictionOffices(prisma);
    assemblyOffices = classifyAllOffices(`${title} ${body}`, jo);
  }
  const primaryAsm = assemblyOffices[0];

  const hash = contentHashOf(title, URL_);
  // contentHash 중복행 정리(재반영 안전)
  const dup = await prisma.article.findUnique({ where: { contentHash: hash }, select: { id: true } });
  if (dup) {
    await prisma.assemblyArticleLink.deleteMany({ where: { articleId: dup.id } });
    await prisma.article.delete({ where: { id: dup.id } });
  }
  await prisma.article.create({
    data: {
      title, sourceName: source, publishedAt: new Date(), originalUrl: URL_,
      fullText: body || null, summary: body.slice(0, 200) || null,
      licenseType: "DEV_CRAWL", sourceType: "WEB_NEWS", canStoreFullText: true, canDisplayFullText: false,
      copyrightNotice: "수동 수집 — 원문 표시 제한",
      primaryOfficeId: (primaryAsm?.officeId ?? r.primaryOffice?.officeId) ?? null,
      primaryRegion: r.region ?? null,
      crimeType: r.crime.crimeType, crimeSubtype: r.crime.crimeSubtype ?? null, classifyConfidence: r.crime.confidence,
      officeConfidence: r.primaryOffice?.confidence ?? null, officeMatchType: r.primaryOffice?.matchType ?? null,
      needsHumanReview: r.needsHumanReview, reviewReasons: JSON.stringify(r.reviewReasons), keywords: JSON.stringify(r.keywords),
      contentHash: hash,
      assemblyOfficeId: primaryAsm?.officeId ?? null, assemblyOfficeName: primaryAsm?.officeName ?? null,
      assemblyOffices: assemblyOffices.length ? JSON.stringify(assemblyOffices) : null,
      assemblyLocationHint: primaryAsm?.hint ?? null,
      bodyEnrichedAt: new Date(),
    },
  });
  console.log(`✔ 반영 완료 — 범죄유형 ${r.crime.crimeType} · 관할 ${primaryAsm?.officeName ?? r.primaryOffice?.officeName ?? "(미분류)"}` +
    (assemblyOffices.length > 1 ? ` (복수: ${assemblyOffices.map((o) => o.officeName).join(", ")})` : ""));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
