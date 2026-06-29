import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { pickDistinctTop } from "@/lib/client/dedupeSimilar";
import { calendarRange } from "@/lib/periodRange";

(async () => {
  const r = calendarRange("month");
  const rows = await prisma.article.findMany({
    where: { crimeType: "공판", publishedAt: { gte: r.start, lte: r.end } },
    select: { id: true, title: true, issueClusterId: true, issueScore: true, publishedAt: true },
  });
  const mapped = rows.map((a) => ({ ...a, publishedAt: a.publishedAt.toISOString(), issueScore: a.issueScore ?? 0 }));
  const top = pickDistinctTop(mapped as any, 10);
  console.log(`금월 공판 ${rows.length}건 → Top10(중복제거):`);
  top.forEach((a: any, i: number) => console.log(`${i + 1}. [${a.issueScore}] ${a.title.split(" - ")[0].slice(0, 50)}`));
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
