import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const arts = await prisma.article.findMany({
    where: { OR: [{ title: { contains: "미래에셋" } }, { title: { contains: "부당지원" } }, { title: { contains: "과징금" } }] },
    select: {
      id: true, title: true, url: true, summary: true, fullText: true,
      crimeType: true, crimeSubtype: true, classifyConfidence: true,
      publishedAt: true, sourceName: true,
    },
    orderBy: { publishedAt: "desc" },
    take: 60,
  });
  console.log("=== 매칭 건수:", arts.length);
  for (const a of arts) {
    console.log("-----");
    console.log(JSON.stringify({
      id: a.id, title: a.title, url: a.url, source: a.sourceName,
      crimeType: a.crimeType, crimeSubtype: a.crimeSubtype, conf: a.classifyConfidence,
      publishedAt: a.publishedAt,
      summary: (a.summary || "").slice(0, 400),
      fullTextLen: a.fullText?.length ?? 0,
      fullTextHead: (a.fullText || "").slice(0, 400),
    }, null, 2));
  }
}
main().finally(() => prisma.$disconnect());
