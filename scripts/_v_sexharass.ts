import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { classifyCrime, scoreCrimeCategory, buildHaystack, isTitleVerdict, isNonIncidentPR } from "@/lib/classifiers/keyword-rules";
import { CRIME_TAXONOMY, countHits } from "@/lib/classifiers/taxonomy";

(async () => {
  const arts = await prisma.article.findMany({
    where: { title: { contains: "퇴사 강요" } },
    select: { id: true, title: true, summary: true, fullText: true, crimeType: true, crimeSubtype: true, classifyConfidence: true, publishedAt: true, sourceName: true, reviewReasons: true, needsHumanReview: true },
  });
  console.log("=== 매칭 기사 수:", arts.length);
  for (const a of arts) {
    console.log("\n#####################################");
    console.log("id:", a.id);
    console.log("title:", a.title);
    console.log("crimeType:", a.crimeType, "/", a.crimeSubtype, "conf:", a.classifyConfidence);
    console.log("published:", a.publishedAt.toISOString(), "src:", a.sourceName);
    console.log("summary:", (a.summary ?? "").slice(0, 600));
    console.log("fullText len:", (a.fullText ?? "").length);
    console.log("fullText:", (a.fullText ?? "").slice(0, 2500));
    const input = { title: a.title, summary: a.summary ?? undefined, fullText: a.fullText ?? undefined, sourceName: a.sourceName };
    const hay = buildHaystack(input as any);
    console.log("--- isTitleVerdict:", isTitleVerdict(a.title), " isNonIncidentPR:", isNonIncidentPR(hay));
    console.log("--- scoreCrimeCategory:", JSON.stringify(scoreCrimeCategory(hay)));
    console.log("--- classifyCrime:", JSON.stringify(classifyCrime(input as any)));
    // 유형별 전체 점수표
    console.log("--- 전체 점수표 ---");
    for (const cat of CRIME_TAXONOMY) {
      const th = countHits(hay, cat.typeKeywords);
      for (const sub of cat.subtypes) {
        const sh = countHits(hay, sub.keywords);
        const sc = sh.count * 2 + th.count;
        if (sc > 0) console.log(`   ${cat.type}/${sub.name} = ${sc}  sub:[${sh.hits}] type:[${th.hits}]`);
      }
    }
    for (const kw of ["성희롱", "직장 내 괴롭힘", "직장내괴롭힘", "부당해고", "근로기준법", "강제추행", "추행", "사기", "피해자", "노동", "임금", "근로자", "사업장", "작업"]) {
      if (hay.includes(kw)) console.log(`   [텍스트포함] ${kw}`);
    }
  }

  // '피해자' 통계
  const tot = await prisma.article.count();
  const withPihae = await prisma.article.count({ where: { OR: [{ title: { contains: "피해자" } }, { summary: { contains: "피해자" } }, { fullText: { contains: "피해자" } }] } });
  const titlePihae = await prisma.article.count({ where: { title: { contains: "피해자" } } });
  console.log(`\n=== 전체 ${tot} · '피해자' 포함 ${withPihae} · 제목포함 ${titlePihae}`);
  const sungKorean = await prisma.article.count({ where: { OR: [{ title: { contains: "성희롱" } }, { summary: { contains: "성희롱" } }, { fullText: { contains: "성희롱" } }] } });
  console.log("=== '성희롱' 포함 기사:", sungKorean);
  const sh = await prisma.article.findMany({ where: { OR: [{ title: { contains: "성희롱" } }, { summary: { contains: "성희롱" } }] }, select: { title: true, crimeType: true, crimeSubtype: true } });
  sh.forEach((x) => console.log(`   [${x.crimeType}/${x.crimeSubtype}] ${x.title}`));
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
