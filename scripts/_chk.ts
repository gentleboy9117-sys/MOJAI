import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
(async () => {
  const latest = await prisma.article.findFirst({ orderBy: { publishedAt: "desc" }, select: { publishedAt: true } });
  const earliest = await prisma.article.findFirst({ orderBy: { publishedAt: "asc" }, select: { publishedAt: true } });
  console.log("latest:", latest?.publishedAt.toISOString(), "earliest:", earliest?.publishedAt.toISOString());
  // 최근 10일 일자별 건수
  const all = await prisma.article.findMany({ select: { publishedAt: true } });
  const byDay = new Map<string, number>();
  for (const a of all) { const k = a.publishedAt.toISOString().slice(0, 10); byDay.set(k, (byDay.get(k) ?? 0) + 1); }
  const days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 12);
  days.forEach(([d, n]) => console.log(`  ${d}: ${n}`));
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
