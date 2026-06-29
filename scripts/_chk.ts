import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
(async () => {
  const arts = await prisma.article.findMany({
    where: { crimeType: "공판", title: { contains: "건진법사" } },
    select: { title: true, issueClusterId: true, issueScore: true },
    orderBy: { issueScore: "desc" },
    take: 12,
  });
  arts.forEach((a) => console.log(`cluster=${(a.issueClusterId ?? "none").slice(0, 8)} score=${a.issueScore} · ${a.title.slice(0, 50)}`));
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
