// 뉴스/공식자료 수집 → 분류 → 저장. 사용: tsx scripts/collect-news.ts <rssUrl|url> ...
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { getNewsProviders } from "@/lib/providers/news";
import { classifyArticle, contentHashOf } from "@/lib/classifiers";
import { getOfficeLites, rebuildClusters } from "@/lib/pipeline/runPipeline";

async function main() {
  const args = process.argv.slice(2);
  const rssUrl = args.find((a) => a.includes("rss") || a.endsWith(".xml"));
  const urls = args.filter((a) => a.startsWith("http") && a !== rssUrl);
  const offices = await getOfficeLites();
  let saved = 0;

  for (const p of getNewsProviders()) {
    const raws = await p.collect({ rssUrl, urls, limit: 30 }).catch(() => []);
    for (const a of raws) {
      const hash = contentHashOf(a.title, a.originalUrl);
      if (await prisma.article.findUnique({ where: { contentHash: hash }, select: { id: true } })) continue;
      const r = classifyArticle({ title: a.title, fullText: a.fullText, summary: a.summary, sourceType: a.sourceType, sourceName: a.sourceName }, offices);
      await prisma.article.create({
        data: {
          title: a.title, sourceName: a.sourceName, publishedAt: a.publishedAt, originalUrl: a.originalUrl,
          fullText: a.canStoreFullText ? a.fullText ?? null : null, summary: a.summary ?? null,
          licenseType: a.licenseType, sourceType: a.sourceType, canStoreFullText: a.canStoreFullText, canDisplayFullText: a.canDisplayFullText,
          copyrightNotice: a.copyrightNotice ?? null, primaryOfficeId: r.primaryOffice?.officeId ?? null, primaryRegion: r.region ?? null,
          crimeType: r.crime.crimeType, crimeSubtype: r.crime.crimeSubtype ?? null, classifyConfidence: r.crime.confidence,
          officeConfidence: r.primaryOffice?.confidence ?? null, officeMatchType: r.primaryOffice?.matchType ?? null,
          needsHumanReview: r.needsHumanReview, reviewReasons: JSON.stringify(r.reviewReasons), keywords: JSON.stringify(r.keywords), contentHash: hash,
        },
      });
      saved++;
    }
  }
  if (saved) await rebuildClusters();
  console.log(`✔ 수집·분류 ${saved}건 (rss=${rssUrl ?? "-"}, urls=${urls.length})`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
