import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { isOpinionColumn } from "@/lib/collect/filters";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";
(async () => {
  const all = await prisma.article.findMany({ select: { id: true, title: true } });
  const hit = all.filter((a) => isOpinionColumn(a.title));
  console.log(`칼럼·오피니언 기사 ${hit.length}건 삭제`);
  hit.slice(0, 15).forEach((a) => console.log("  -", a.title.slice(0, 45)));
  const ids = hit.map((h) => h.id);
  for (let i = 0; i < ids.length; i += 200) {
    const c = ids.slice(i, i + 200);
    await prisma.articleClassification.deleteMany({ where: { articleId: { in: c } } }).catch(() => {});
    await prisma.assemblyArticleLink.deleteMany({ where: { articleId: { in: c } } }).catch(() => {});
    await prisma.article.deleteMany({ where: { id: { in: c } } });
  }
  if (ids.length) await rebuildClusters();
  console.log("클러스터 재생성 완료");
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
