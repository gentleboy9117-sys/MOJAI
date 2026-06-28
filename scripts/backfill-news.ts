// 이슈 모니터링용 일반 검찰 뉴스 백필 (기간 지정, 다중 쿼리)
//  사용: tsx scripts/backfill-news.ts   (BF_AFTER/BF_BEFORE 환경변수)
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { getNewsProviders } from "@/lib/providers/news";
import { classifyArticle, contentHashOf } from "@/lib/classifiers";
import { getOfficeLites, rebuildClusters } from "@/lib/pipeline/runPipeline";

const AFTER = process.env.BF_AFTER || "2026-06-19";
const BEFORE = process.env.BF_BEFORE || "2026-06-30";
const QUERIES = [
  "검찰", "검찰청", "검찰 수사", "검찰 기소", "검찰 구속", "검찰 압수수색",
  "특검", "공수처", "검찰 송치", "검찰 불기소", "검찰 무혐의", "검찰 항소",
  "마약 수사", "보이스피싱", "전세사기", "성범죄 수사",
  // 판결·선고(법원) 기사 — 대응 검찰청 관할로 분류
  "법원 선고", "법원 판결", "지법 선고", "징역 선고", "법원 징역", "1심 선고",
  "항소심 선고", "법원 실형", "법원 집행유예", "법원 무죄", "법원 유죄", "검찰 구형",
];
function rss(q: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} after:${AFTER} before:${BEFORE}`)}&hl=ko&gl=KR&ceid=KR:ko`;
}

async function main() {
  const offices = await getOfficeLites();
  let saved = 0, seen = 0;
  for (const q of QUERIES) {
    for (const p of getNewsProviders()) {
      const raws = await p.collect({ rssUrl: rss(q), limit: 100 }).catch(() => []);
      for (const a of raws) {
        seen++;
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
    console.log(`  q='${q}' → 누적 신규 ${saved}`);
  }
  if (saved) await rebuildClusters();
  console.log(`✔ 일반 뉴스 백필 완료 — 신규 ${saved}건(조회 ${seen})`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
