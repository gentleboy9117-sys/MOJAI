import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const arts = await prisma.article.findMany({
    where: { title: { contains: "오피스텔" } },
    select: { id: true, title: true, crimeType: true, crimeSubtype: true, summary: true, fullText: true, classifyConfidence: true, publishedAt: true, sourceName: true },
  });
  console.log("=== 오피스텔 매칭:", arts.length);
  for (const a of arts) {
    console.log(JSON.stringify({ id: a.id, title: a.title, crimeType: a.crimeType, crimeSubtype: a.crimeSubtype, conf: a.classifyConfidence, summary: a.summary, fullTextLen: a.fullText?.length ?? 0 }, null, 2));
  }

  const arts2 = await prisma.article.findMany({
    where: { title: { contains: "범행 배경" } },
    select: { id: true, title: true, crimeType: true, crimeSubtype: true, summary: true },
  });
  console.log("=== '범행 배경' 매칭:", arts2.length, JSON.stringify(arts2, null, 2));

  // 전체 분포
  const total = await prisma.article.count();
  console.log("=== 전체 기사수:", total);
  const grp = await prisma.article.groupBy({ by: ["crimeType"], _count: { _all: true } });
  console.log(JSON.stringify(grp, null, 2));
}
main().finally(() => prisma.$disconnect());
