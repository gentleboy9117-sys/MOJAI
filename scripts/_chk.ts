import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";
(async () => {
  const ids = (await prisma.article.findMany({ where: { primaryOfficeId: null }, select: { id: true } })).map((a) => a.id);
  console.log(`미분류(관할 미상) ${ids.length}건 삭제`);
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    await prisma.articleClassification.deleteMany({ where: { articleId: { in: chunk } } }).catch(() => {});
    await prisma.assemblyArticleLink.deleteMany({ where: { articleId: { in: chunk } } }).catch(() => {});
    await prisma.article.deleteMany({ where: { id: { in: chunk } } });
  }
  if (ids.length) { await rebuildClusters(); console.log("클러스터 재생성 완료"); }
  console.log(`남은 총 ${await prisma.article.count()}건 · 미분류 ${await prisma.article.count({ where: { primaryOfficeId: null } })}건`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
