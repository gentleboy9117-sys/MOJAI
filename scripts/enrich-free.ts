// 무료 본문 크롤러 — 실제 언론사 URL(네이버 originallink 등) 본문을 직접 읽어 관할 분류.
//  * 구글 리다이렉트(news.google.com)는 제외(막혀서 못 읽음). Firecrawl 불필요.
//  사용: tsx scripts/enrich-free.ts   (BF_MAX, BF_CONC, BF_SINCE_DAYS)
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { extractBody } from "@/lib/publicSafety/assemblyNewsEnricher";
import { getJurisdictionOffices } from "@/lib/publicSafety/runAssemblyPipeline";
import { classifyAllOffices } from "@/lib/publicSafety/assemblyJurisdictionClassifier";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

const MAX = Number(process.env.BF_MAX || 8000);
const CONC = Number(process.env.BF_CONC || 8);
const SINCE = Number(process.env.BF_SINCE_DAYS || 60);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" }, signal: ctrl.signal, redirect: "follow" });
    if (!r.ok) return "";
    return await r.text();
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const offices = await getJurisdictionOffices(prisma);
  const since = new Date(Date.now() - SINCE * 86400000);
  const cand = await prisma.article.findMany({
    where: { primaryOfficeId: null, publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    take: MAX,
    select: { id: true, title: true, summary: true, originalUrl: true, resolvedUrl: true },
  });
  // 실제 URL(구글 아님)만 대상
  const targets = cand
    .map((a) => ({ ...a, url: a.resolvedUrl && !a.resolvedUrl.includes("news.google.com") ? a.resolvedUrl : (!a.originalUrl.includes("news.google.com") ? a.originalUrl : "") }))
    .filter((a) => a.url);
  console.log(`미분류 ${cand.length}건 중 실제URL 대상 ${targets.length}건 — 무료 본문 크롤 시작`);

  let done = 0, classified = 0, failed = 0;
  for (let i = 0; i < targets.length; i += CONC) {
    const chunk = targets.slice(i, i + CONC);
    await Promise.all(chunk.map(async (a) => {
      done++;
      const html = await fetchText(a.url);
      if (!html) { failed++; return; }
      const body = extractBody(html);
      const offs = classifyAllOffices(`${a.title} ${a.summary ?? ""} ${body}`, offices);
      const data: any = { bodyEnrichedAt: new Date() };
      if (!a.resolvedUrl) data.resolvedUrl = a.url;
      if (offs[0]) { data.primaryOfficeId = offs[0].officeId; classified++; }
      await prisma.article.update({ where: { id: a.id }, data });
    }));
    if ((i / CONC) % 10 === 0) console.log(`  처리 ${done}/${targets.length} · 관할분류 ${classified} · 본문실패 ${failed}`);
  }
  const remain = await prisma.article.count({ where: { primaryOfficeId: null } });
  console.log(`완료 — 처리 ${done} · 신규관할 ${classified} · 실패 ${failed} · 남은 미분류 ${remain}`);
  if (classified) { await rebuildClusters(); console.log("클러스터 재생성 완료"); }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
