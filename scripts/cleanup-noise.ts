// 형사사법 무관·해외·연예·포토·칼럼 기사 일괄 삭제 + 클러스터 재생성
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { isNonLegalNoise, isForeignTopic, isCelebGossip, isPhotoOnlyTitle, isOpinionColumn } from "@/lib/collect/filters";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

async function main() {
  const all = await prisma.article.findMany({ select: { id: true, title: true, summary: true } });
  const ids = all
    .filter((a) => isPhotoOnlyTitle(a.title) || isOpinionColumn(a.title) || isCelebGossip(a.title, a.summary) || isForeignTopic(a.title, a.summary) || isNonLegalNoise(a.title, a.summary))
    .map((a) => a.id);
  console.log(`삭제 대상 ${ids.length}건 (전체 ${all.length})`);
  if (ids.length) {
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      await prisma.articleClassification.deleteMany({ where: { articleId: { in: chunk } } }).catch(() => {});
      await prisma.assemblyArticleLink.deleteMany({ where: { articleId: { in: chunk } } }).catch(() => {});
      await prisma.article.deleteMany({ where: { id: { in: chunk } } });
    }
    console.log("삭제 완료");
    await rebuildClusters();
    console.log("클러스터 재생성 완료");
  }
  console.log(`남은 총 ${await prisma.article.count()}건`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
