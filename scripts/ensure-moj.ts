// 최상위 통합 분류 엔티티 '법무부/대검찰청' 보장(이슈 모니터링 최상위 분류용)
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";

async function main() {
  const merged = await prisma.prosecutionOffice.upsert({
    where: { name: "법무부/대검찰청" },
    update: { type: "법무부/대검찰청", region: "전국", parentId: null },
    create: {
      name: "법무부/대검찰청", type: "법무부/대검찰청", region: "전국",
      searchKeywords: JSON.stringify(["법무부", "대검찰청", "대검", "검찰총장", "검찰개혁", "공소청", "대법원"]),
      policeStations: JSON.stringify([]),
      jurisdictionText: "검찰 제도·조직, 법무부 소관, 대법원 선고 등 최상위 사항",
    },
  });
  console.log(`✔ 법무부/대검찰청 id=${merged.id}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
