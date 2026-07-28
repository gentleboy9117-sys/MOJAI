import "dotenv/config";
import { prisma } from "@/lib/db/prisma";

(async () => {
  const rows = await prisma.article.findMany({
    where: { OR: [{ title: { contains: "미포" } }, { title: { contains: "잠수부" } }] },
    select: {
      id: true, title: true, crimeType: true, crimeSubtype: true,
      classifyConfidence: true, publishedAt: true, sourceName: true,
      summary: true, fullText: true, keywords: true,
    },
    orderBy: { publishedAt: "desc" },
    take: 20,
  });
  console.log("=== MATCHED", rows.length, "===");
  for (const r of rows) {
    console.log("\n--- id:", r.id);
    console.log("title:", r.title);
    console.log("crime:", r.crimeType, "/", r.crimeSubtype, "conf:", r.classifyConfidence);
    console.log("published:", r.publishedAt?.toISOString?.(), "src:", r.sourceName);
    console.log("keywords:", r.keywords);
    console.log("summaryLen:", (r.summary ?? "").length, "fullTextLen:", (r.fullText ?? "").length);
    console.log("summary:", (r.summary ?? "").slice(0, 600));
    console.log("fullText:", (r.fullText ?? "").slice(0, 1500));
  }
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
