import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { classifyCrime, scoreCrimeCategory, buildHaystack, isTitleVerdict, isNonIncidentPR } from "@/lib/classifiers/keyword-rules";

(async () => {
  // 1) 대상 기사 조회
  const arts = await prisma.article.findMany({
    where: { title: { contains: "성추행" } },
    select: { id: true, title: true, summary: true, fullText: true, crimeType: true, crimeSubtype: true, classifyConfidence: true, publishedAt: true, sourceName: true },
    orderBy: { publishedAt: "desc" },
    take: 60,
  });
  console.log(`=== 제목에 '성추행' 포함 기사: ${arts.length}건 ===`);
  for (const a of arts) {
    console.log(`- [${a.crimeType}/${a.crimeSubtype}] conf=${a.classifyConfidence} | ${a.title}`);
  }

  const target = arts.find((a) => a.title.includes("국립대") || a.title.includes("위자료"));
  console.log("\n=== 지적 대상 기사 상세 ===");
  if (!target) {
    console.log("!! 제목에 '국립대'/'위자료' 포함 기사 없음");
  } else {
    console.log("id:", target.id);
    console.log("title:", target.title);
    console.log("source:", target.sourceName, "| published:", target.publishedAt.toISOString());
    console.log("DB crimeType:", target.crimeType, "/", target.crimeSubtype, "conf=", target.classifyConfidence);
    console.log("summary:", JSON.stringify(target.summary));
    console.log("fullText len:", (target.fullText ?? "").length);
    console.log("fullText head:", JSON.stringify((target.fullText ?? "").slice(0, 800)));

    const input = { title: target.title, summary: target.summary ?? undefined, fullText: target.fullText ?? undefined, sourceName: target.sourceName };
    const hay = buildHaystack(input as any);
    console.log("\n-- 재현 --");
    console.log("isTitleVerdict:", isTitleVerdict(target.title));
    console.log("isNonIncidentPR:", isNonIncidentPR(hay));
    console.log("scoreCrimeCategory:", JSON.stringify(scoreCrimeCategory(hay)));
    console.log("classifyCrime:", JSON.stringify(classifyCrime(input as any)));
    console.log("텍스트에 '강제추행' 포함?", hay.includes("강제추행"), "| '성추행'?", hay.includes("성추행"), "| '추행'?", hay.includes("추행"));
  }

  // 2) 전체 분포
  const total = await prisma.article.count();
  const grp = await prisma.article.groupBy({ by: ["crimeType"], _count: { _all: true } });
  console.log(`\n=== 전체 ${total}건 분포 ===`);
  grp.sort((a, b) => b._count._all - a._count._all).forEach((g) => {
    console.log(`  ${g.crimeType ?? "(null)"}: ${g._count._all} (${((g._count._all / total) * 100).toFixed(1)}%)`);
  });

  // 3) '성추행'/'추행' 이 들어간 기사들의 현재 유형 분포 (검증 핵심)
  const chuhaeng = await prisma.article.findMany({
    where: { OR: [{ title: { contains: "추행" } }, { summary: { contains: "추행" } }] },
    select: { title: true, summary: true, crimeType: true, crimeSubtype: true },
  });
  const dist: Record<string, number> = {};
  for (const a of chuhaeng) dist[`${a.crimeType}/${a.crimeSubtype}`] = (dist[`${a.crimeType}/${a.crimeSubtype}`] ?? 0) + 1;
  console.log(`\n=== '추행' 포함(제목/요약) ${chuhaeng.length}건의 현재 분류 ===`);
  Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  // '성추행'만 있고 '강제추행' 없는 기사 수
  const onlySeong = chuhaeng.filter((a) => {
    const t = `${a.title} ${a.summary ?? ""}`;
    return t.includes("성추행") && !t.includes("강제추행") && !t.includes("준강제추행") && !t.includes("공중밀집장소추행");
  });
  console.log(`\n'성추행' 있으나 등록 키워드(강제추행 등) 없는 기사: ${onlySeong.length}건`);
  const d2: Record<string, number> = {};
  for (const a of onlySeong) d2[`${a.crimeType}/${a.crimeSubtype}`] = (d2[`${a.crimeType}/${a.crimeSubtype}`] ?? 0) + 1;
  Object.entries(d2).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  onlySeong.slice(0, 25).forEach((a) => console.log(`   * [${a.crimeType}/${a.crimeSubtype}] ${a.title}`));

  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
