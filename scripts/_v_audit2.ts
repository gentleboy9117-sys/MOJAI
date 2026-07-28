import { PrismaClient } from "@prisma/client";
import { CRIME_TAXONOMY, countHits } from "../lib/classifiers/taxonomy";
import { classifyCrime, buildHaystack, scoreCrimeCategory } from "../lib/classifiers/keyword-rules";

const prisma = new PrismaClient();

function allScores(text: string) {
  const rows: { cat: string; sub: string; score: number; hits: string[]; idx: number }[] = [];
  CRIME_TAXONOMY.forEach((cat, idx) => {
    const th = countHits(text, cat.typeKeywords);
    for (const sub of cat.subtypes) {
      const sh = countHits(text, sub.keywords);
      const score = sh.count * 2 + th.count;
      if (score > 0) rows.push({ cat: cat.type, sub: sub.name, score, hits: [...new Set([...sh.hits, ...th.hits])], idx });
    }
  });
  return rows.sort((a, b) => b.score - a.score || a.idx - b.idx);
}

async function main() {
  const a = await prisma.article.findUnique({ where: { id: "cms4oe1zc00bkci28ansn71b9" } });
  if (!a) { console.log("NOT FOUND"); return; }
  console.log("TITLE:", a.title);
  console.log("SUMMARY:", a.summary);
  console.log("DB:", a.crimeType, "/", a.crimeSubtype, "conf=", a.classifyConfidence);
  const input = { title: a.title, summary: a.summary ?? "", fullText: a.fullText ?? "", sourceName: a.sourceName, sourceType: a.sourceType };
  const text = buildHaystack(input as any);
  console.log("--- 전체 점수표 ---");
  console.table(allScores(text));
  console.log("--- scoreCrimeCategory ---", JSON.stringify(scoreCrimeCategory(text)));
  console.log("--- classifyCrime 재현 ---", JSON.stringify(classifyCrime(input as any), null, 2));

  // 동일 패턴 카운트: 현재 DB가 마약범죄인데, 강력범죄와 동점이며 강력범죄가 index 뒤라서 밀린 건
  const all = await prisma.article.findMany({ select: { id: true, title: true, summary: true, fullText: true, sourceName: true, sourceType: true, crimeType: true, crimeSubtype: true } });
  let tieLossDrugOverViolent = 0;
  let drugTotal = 0;
  const samples: string[] = [];
  for (const x of all) {
    if (x.crimeType === "마약범죄") drugTotal++;
    const t = buildHaystack({ title: x.title, summary: x.summary ?? "", fullText: x.fullText ?? "" } as any);
    const rows = allScores(t);
    if (!rows.length) continue;
    const top = rows[0];
    if (top.cat !== "마약범죄") continue;
    const violent = rows.find((r) => r.cat === "강력범죄");
    if (violent && violent.score === top.score) {
      tieLossDrugOverViolent++;
      if (samples.length < 8) samples.push(`${x.crimeType}/${x.crimeSubtype} | ${x.title}`);
    }
  }
  console.log("마약범죄 DB 총건수:", drugTotal);
  console.log("마약범죄가 강력범죄와 동점인데 선언순으로 이긴 건수:", tieLossDrugOverViolent);
  console.log(samples.join("\n"));
}
main().finally(() => prisma.$disconnect());
