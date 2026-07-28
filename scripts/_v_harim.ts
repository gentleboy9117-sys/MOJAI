import { PrismaClient } from "@prisma/client";
import { isCivilCase } from "../lib/collect/filters";
const prisma = new PrismaClient();

async function main() {
  const arts = await prisma.article.findMany({
    where: { OR: [{ title: { contains: "하림" } }, { title: { contains: "526억" } }] },
    select: {
      id: true, title: true, summary: true, sourceName: true, publishedAt: true,
      crimeType: true, crimeSubtype: true, primaryRegion: true, primaryOfficeId: true,
      officeMatchType: true, classifyConfidence: true, needsHumanReview: true, reviewReasons: true,
      originalUrl: true, fullText: true,
    },
    orderBy: { publishedAt: "desc" },
  });
  console.log("=== 하림/526억 매칭:", arts.length);
  for (const a of arts) {
    const office = a.primaryOfficeId
      ? await prisma.prosecutionOffice.findUnique({ where: { id: a.primaryOfficeId }, select: { name: true } })
      : null;
    console.log(JSON.stringify({
      id: a.id, title: a.title, source: a.sourceName, published: a.publishedAt,
      office: office?.name, region: a.primaryRegion, matchType: a.officeMatchType,
      crimeType: a.crimeType, crimeSubtype: a.crimeSubtype, conf: a.classifyConfidence,
      review: a.needsHumanReview, reasons: a.reviewReasons,
      summary: a.summary, fullTextLen: a.fullText?.length ?? 0,
      url: a.originalUrl,
      isCivilCase_titleOnly: isCivilCase(a.title, a.summary),
    }, null, 2));
  }
}
main().finally(() => prisma.$disconnect());
