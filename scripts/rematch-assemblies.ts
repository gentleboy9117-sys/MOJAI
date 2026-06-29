import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { matchAllAssembliesToArticles } from "@/lib/publicSafety/runAssemblyPipeline";
import { appToday } from "@/lib/appToday";

(async () => {
  const before = await prisma.assemblyArticleLink.count();
  // 기존 링크 전부 삭제 후, 장소/주최 일치 게이트가 적용된 새 로직으로 재매칭
  await prisma.assemblyArticleLink.deleteMany({});
  console.log(`기존 링크 ${before}건 삭제 → 재매칭 시작`);
  const created = await matchAllAssembliesToArticles(prisma, appToday());
  const after = await prisma.assemblyArticleLink.count();
  console.log(`재매칭 완료: 새 링크 ${created}건 · 총 ${after}건 (이전 ${before}건)`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
