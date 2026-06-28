// 법무부 + 대검찰청 → '법무부/대검찰청' 하나로 병합(오피스 통합 + 기사 재배정)
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

const MERGED = "법무부/대검찰청";

async function main() {
  // 병합 대상(구 법무부/대검찰청) 수집
  const olds = await prisma.prosecutionOffice.findMany({
    where: { OR: [{ name: "법무부" }, { name: "대검찰청" }, { type: "법무부" }, { type: "대검찰청" }] },
    select: { id: true, name: true },
  });
  // 통합 오피스 생성/갱신
  const merged = await prisma.prosecutionOffice.upsert({
    where: { name: MERGED },
    update: { type: MERGED, region: "전국", parentId: null },
    create: {
      name: MERGED, type: MERGED, region: "전국",
      searchKeywords: JSON.stringify(["법무부", "대검찰청", "대검", "검찰총장", "검찰개혁", "공소청", "대법원"]),
      policeStations: JSON.stringify([]),
      jurisdictionText: "검찰 제도·조직, 법무부 소관, 대법원 선고 등 최상위 사항",
    },
  });
  const oldIds = olds.map((o) => o.id).filter((id) => id !== merged.id);
  console.log(`병합 대상 ${oldIds.length}개 → ${MERGED}(${merged.id})`);

  if (oldIds.length) {
    const r1 = await prisma.article.updateMany({ where: { primaryOfficeId: { in: oldIds } }, data: { primaryOfficeId: merged.id } });
    const r2 = await prisma.article.updateMany({ where: { assemblyOfficeId: { in: oldIds } }, data: { assemblyOfficeId: merged.id, assemblyOfficeName: MERGED } });
    await prisma.articleClassification.updateMany({ where: { prosecutionOfficeId: { in: oldIds } }, data: { prosecutionOfficeId: merged.id } }).catch(() => {});
    await prisma.prosecutionOffice.updateMany({ where: { parentId: { in: oldIds } }, data: { parentId: merged.id } }).catch(() => {});
    await prisma.prosecutionOffice.deleteMany({ where: { id: { in: oldIds } } });
    console.log(`  기사 재배정: primaryOffice ${r1.count} · assemblyOffice ${r2.count} · 구 오피스 삭제 ${oldIds.length}`);
  }
  await rebuildClusters();
  console.log("✔ 병합 + 클러스터 재생성 완료");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
