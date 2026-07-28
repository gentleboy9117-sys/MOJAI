import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const arts = await p.article.findMany({
    where: { title: { contains: "SK에코플랜트" } },
    select: {
      id: true, title: true, summary: true, fullText: true,
      crimeType: true, crimeSubtype: true, classifyConfidence: true,
      publishedAt: true, sourceName: true, primaryRegion: true,
      needsHumanReview: true, reviewReasons: true, keywords: true,
    },
    orderBy: { publishedAt: "desc" },
  });
  console.log("=== SK에코플랜트 articles:", arts.length);
  for (const a of arts) {
    console.log("--------------------------------------------------");
    console.log("id:", a.id);
    console.log("title:", a.title);
    console.log("crime:", a.crimeType, "/", a.crimeSubtype, "conf:", a.classifyConfidence);
    console.log("published:", a.publishedAt, "src:", a.sourceName);
    console.log("summaryLen:", a.summary?.length ?? 0, "fullTextLen:", a.fullText?.length ?? 0);
    console.log("summary:", JSON.stringify(a.summary));
    console.log("fullText:", JSON.stringify(a.fullText?.slice(0, 3000)));
    console.log("reviewReasons:", a.reviewReasons);
    const cls = await p.articleClassification.findMany({
      where: { articleId: a.id },
      select: { crimeType: true, crimeSubtype: true, confidence: true, reason: true, evidenceKeywords: true, method: true, isPrimary: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    console.log("classifications:", JSON.stringify(cls, null, 1));
  }
}
main().finally(() => p.$disconnect());
