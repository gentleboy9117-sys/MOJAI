// 관할 미분류 기사를 Firecrawl 본문으로 보강 → 관할(primaryOffice) 분류 (이슈+공안 공통 반영)
//  사용: tsx scripts/enrich-firecrawl.ts   (BF_MAX, BF_CONC, BF_SINCE_DAYS)
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { firecrawlScrape } from "@/lib/providers/news/firecrawlScrape";
import { getJurisdictionOffices } from "@/lib/publicSafety/runAssemblyPipeline";
import { classifyAllOffices } from "@/lib/publicSafety/assemblyJurisdictionClassifier";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

const MAX = Number(process.env.BF_MAX || 3000);
const CONC = Number(process.env.BF_CONC || 5);
const SINCE = Number(process.env.BF_SINCE_DAYS || 30);

async function main() {
  const offices = await getJurisdictionOffices(prisma);
  const since = new Date(Date.now() - SINCE * 86400000);
  const targets = await prisma.article.findMany({
    where: {
      publishedAt: { gte: since },
      OR: [
        { primaryOfficeId: null }, // 관할 미분류 → 본문으로 분류
        // 구글 리다이렉트 링크(깨짐) → 실제 원문 URL 해석
        { AND: [{ originalUrl: { contains: "news.google.com" } }, { OR: [{ resolvedUrl: null }, { resolvedUrl: { contains: "news.google.com" } }] }] },
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: MAX,
    select: { id: true, title: true, summary: true, originalUrl: true },
  });
  console.log(`대상 ${targets.length}건(미분류+구글링크, 최근 ${SINCE}일) — Firecrawl 본문보강·URL해석 시작`);

  let done = 0, classified = 0, failed = 0;
  for (let i = 0; i < targets.length; i += CONC) {
    const chunk = targets.slice(i, i + CONC);
    await Promise.all(chunk.map(async (a) => {
      const r = await firecrawlScrape(a.originalUrl);
      done++;
      if (!r || !r.markdown) { failed++; return; }
      const offs = classifyAllOffices(`${a.title} ${a.summary ?? ""} ${r.markdown}`, offices);
      const data: any = { bodyEnrichedAt: new Date() };
      if (r.resolvedUrl) data.resolvedUrl = r.resolvedUrl;
      if (offs[0]) { data.primaryOfficeId = offs[0].officeId; classified++; }
      await prisma.article.update({ where: { id: a.id }, data });
    }));
    if ((i / CONC) % 5 === 0) console.log(`  처리 ${done}/${targets.length} · 관할분류 ${classified} · 본문실패 ${failed}`);
  }
  const remain = await prisma.article.count({ where: { primaryOfficeId: null } });
  console.log(`보강 완료 — 처리 ${done} · 신규관할 ${classified} · 실패 ${failed} · 남은 미분류 ${remain}`);
  if (classified) { await rebuildClusters(); console.log("클러스터 재생성 완료"); }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
