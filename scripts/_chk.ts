import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";
(async () => {
  const moj = await prisma.prosecutionOffice.findFirst({ where: { name: "법무부/대검찰청" }, select: { id: true } });
  if (!moj) throw new Error("법무부/대검찰청 office 없음");
  const before = await prisma.article.count({ where: { crimeType: "형사사법제도/정책", primaryOfficeId: { not: moj.id } } });
  const res = await prisma.article.updateMany({
    where: { crimeType: "형사사법제도/정책" },
    data: { primaryOfficeId: moj.id, officeMatchType: "MANUAL" },
  });
  console.log(`형사사법제도/정책 ${res.count}건 → 법무부/대검찰청 (이전 타관할 ${before}건)`);
  await rebuildClusters();
  console.log("클러스터 재생성 완료");
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
