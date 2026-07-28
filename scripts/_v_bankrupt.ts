import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 1) 지적된 기사 직접 조회
  const arts = await prisma.article.findMany({
    where: { title: { contains: "광양보건대" } },
    select: {
      id: true, title: true, summary: true, sourceName: true, publishedAt: true,
      crimeType: true, crimeSubtype: true, primaryRegion: true, primaryOfficeId: true,
      classifyConfidence: true, officeMatchType: true,
      classifications: { select: { prosecutionOfficeId: true, crimeType: true, crimeSubtype: true, prosecutionOffice: { select: { name: true } } } },
    },
  });
  console.log("=== [1] '광양보건대' 매칭:", arts.length);
  console.log(JSON.stringify(arts, null, 2));

  // 2) 도산 관련 패턴 전수 (파산/회생/법정관리/기업회생/개인회생/워크아웃)
  const kws = ["파산", "회생", "법정관리", "워크아웃", "도산", "청산"];
  for (const k of kws) {
    const rows = await prisma.article.findMany({
      where: { title: { contains: k } },
      select: { id: true, title: true, crimeType: true, crimeSubtype: true, primaryRegion: true, summary: true },
      orderBy: { publishedAt: "desc" },
    });
    console.log(`\n=== [2] 제목에 '${k}' 포함:`, rows.length);
    for (const r of rows) {
      console.log(` - [${r.crimeType}/${r.crimeSubtype}] (${r.primaryRegion}) ${r.title}`);
    }
  }

  const total = await prisma.article.count();
  console.log("\n=== 전체 기사수:", total);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
