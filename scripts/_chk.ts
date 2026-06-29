import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { isNonLegalNoise } from "@/lib/collect/filters";
(async () => {
  const total = await prisma.article.count();
  const unclass = await prisma.article.count({ where: { primaryOfficeId: null } });
  const un = await prisma.article.findMany({ where: { primaryOfficeId: null }, select: { title: true, originalUrl: true, resolvedUrl: true, summary: true }, take: 40 });
  // 출처 유형 분석
  let google = 0, naver = 0, noise = 0;
  for (const a of un) {
    const u = a.resolvedUrl || a.originalUrl;
    if (u.includes("news.google.com")) google++; else naver++;
    if (isNonLegalNoise(a.title, a.summary)) noise++;
  }
  console.log(`총 ${total} · 미분류 ${unclass} (${Math.round(unclass/total*100)}%)`);
  console.log(`미분류 샘플40: 구글소스 ${google} · 비구글 ${naver} · 무관잡음 ${noise}`);
  console.log("\n샘플:");
  un.slice(0, 12).forEach((a) => console.log("  - " + a.title.slice(0, 45) + "  [" + (a.resolvedUrl || a.originalUrl).slice(0, 30) + "]"));
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
