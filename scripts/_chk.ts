import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";
(async () => {
  const wrong = await prisma.prosecutionOffice.findUnique({ where: { id: "cmqy09ckf0000hkbd4eu84jot" }, select: { name: true } });
  console.log("cmqy09ckf =", wrong?.name);

  // 1) 김규리 연예 반응 기사 삭제
  const k = (await prisma.article.findMany({ where: { title: { contains: "김규리" } }, select: { id: true } })).map((t) => t.id);
  for (let i = 0; i < k.length; i += 200) {
    const c = k.slice(i, i + 200);
    await prisma.articleClassification.deleteMany({ where: { articleId: { in: c } } }).catch(() => {});
    await prisma.assemblyArticleLink.deleteMany({ where: { articleId: { in: c } } }).catch(() => {});
    await prisma.article.deleteMany({ where: { id: { in: c } } });
  }
  console.log(`김규리 기사 ${k.length}건 삭제`);

  // 2) 박성재(내란 1심 서울중앙지법) → 서울중앙지검 관할 교정
  const central = await prisma.prosecutionOffice.findFirst({ where: { name: "서울중앙지방검찰청" }, select: { id: true } });
  if (central) {
    const res = await prisma.article.updateMany({ where: { title: { contains: "박성재" } }, data: { primaryOfficeId: central.id, officeMatchType: "MANUAL" } });
    console.log(`박성재 기사 ${res.count}건 → 서울중앙지방검찰청`);
  }

  await rebuildClusters();
  console.log("클러스터 재생성 완료");
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
