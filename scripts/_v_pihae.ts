import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { scoreCrimeCategory, buildHaystack } from "@/lib/classifiers/keyword-rules";

(async () => {
  const arts = await prisma.article.findMany({
    where: { OR: [{ title: { contains: "피해자" } }, { summary: { contains: "피해자" } }, { fullText: { contains: "피해자" } }] },
    select: { id: true, title: true, summary: true, fullText: true, crimeType: true, crimeSubtype: true },
  });
  let soleOnly = 0;
  const samples: string[] = [];
  for (const a of arts) {
    const hay = buildHaystack({ title: a.title, summary: a.summary ?? undefined, fullText: a.fullText ?? undefined } as any);
    const s = scoreCrimeCategory(hay);
    if (s && s.hits.length === 1 && s.hits[0] === "피해자") {
      soleOnly++;
      if (samples.length < 15) samples.push(`[DB:${a.crimeType}/${a.crimeSubtype}] ${a.title}`);
    }
  }
  console.log(`'피해자' 포함 기사 ${arts.length}건 중, 키워드 스코어링 결과가 '피해자' 단독(1점)으로만 유형 확정되는 기사: ${soleOnly}건`);
  samples.forEach((s) => console.log("  -", s));

  // 그중 실제 DB가 경제범죄인 것
  const econ = arts.filter((a) => a.crimeType === "경제범죄");
  console.log(`\n'피해자' 포함 기사 중 DB상 경제범죄: ${econ.length}건`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
