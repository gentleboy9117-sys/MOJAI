// =====================================================================
// 집회·시위 관련 언론보도 백필 수집 (기간 지정, 다중 쿼리, 고용량)
//  * 구글뉴스 날짜 연산자(after:/before:) + 여러 키워드로 커버리지 최대화.
//  * 사용: tsx scripts/backfill-assembly-news.ts   (기본 2026-06-16~2026-06-30)
//    범위 변경: BF_AFTER=YYYY-MM-DD BF_BEFORE=YYYY-MM-DD 환경변수.
//  * 구글뉴스 RSS는 완전 아카이브가 아니라 쿼리당 상한이 있어 100% 망라는 불가.
// =====================================================================
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { getNewsProviders } from "@/lib/providers/news";
import { classifyArticle, contentHashOf } from "@/lib/classifiers";
import { getOfficeLites, rebuildClusters } from "@/lib/pipeline/runPipeline";

const AFTER = process.env.BF_AFTER || "2026-06-16"; // after 는 배타적이라 하루 앞
const BEFORE = process.env.BF_BEFORE || "2026-06-30";
const QUERIES = [
  "집회", "시위", "집회 시위", "옥외집회", "집회 신고",
  "집회 경찰", "1인 시위", "노조 집회", "집회 현장", "도심 집회",
  "주말 집회", "민주노총 집회",
];

function rss(q: string): string {
  const query = `${q} after:${AFTER} before:${BEFORE}`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
}

async function main() {
  const offices = await getOfficeLites();
  let saved = 0;
  let seen = 0;
  for (const q of QUERIES) {
    for (const p of getNewsProviders()) {
      const raws = await p.collect({ rssUrl: rss(q), limit: 100 }).catch(() => []);
      for (const a of raws) {
        seen++;
        const hash = contentHashOf(a.title, a.originalUrl);
        if (await prisma.article.findUnique({ where: { contentHash: hash }, select: { id: true } })) continue;
        const r = classifyArticle(
          { title: a.title, fullText: a.fullText, summary: a.summary, sourceType: a.sourceType, sourceName: a.sourceName },
          offices,
        );
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

  const cnt = await prisma.article.count({
    where: {
      AND: [
        { OR: [{ title: { contains: "집회" } }, { title: { contains: "시위" } }, { summary: { contains: "집회" } }, { summary: { contains: "시위" } }] },
        { publishedAt: { gte: new Date(AFTER) } },
      ],
    },
  });
  console.log(`✔ 백필 완료 — 신규 ${saved}건(조회 ${seen}) · ${AFTER}~ 범위 집회/시위 기사 총 ${cnt}건`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
