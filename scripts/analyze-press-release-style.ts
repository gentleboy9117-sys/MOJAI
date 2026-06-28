// 레퍼런스 구조/문체/제목 패턴 분석 → StylePattern 저장 + 제목 패턴 분류
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { extractStylePatterns, classifyTitlePattern } from "@/lib/pressRelease";

async function main() {
  const refs = await prisma.pressReleaseReference.findMany();
  if (!refs.length) { console.log("레퍼런스가 없습니다. 먼저 crawl-spo-press-releases 를 실행하세요."); return; }

  const patterns = extractStylePatterns(refs.map((r) => ({ title: r.title, plainText: r.plainText })));
  await prisma.pressReleaseStylePattern.deleteMany();
  for (const p of patterns) {
    await prisma.pressReleaseStylePattern.create({
      data: {
        patternName: p.patternName, description: p.description ?? null,
        examplesJson: JSON.stringify(p.examples ?? []), structureJson: JSON.stringify(p.structure ?? []),
        toneRulesJson: JSON.stringify(p.toneRules ?? []), forbiddenExpressionsJson: JSON.stringify(p.forbiddenExpressions ?? []),
        preferredExpressionsJson: JSON.stringify(p.preferredExpressions ?? []), titlePatternType: p.titlePatternType ?? null,
      },
    });
  }
  for (const r of refs) {
    const c = classifyTitlePattern(r.title);
    await prisma.pressReleaseReference.update({ where: { id: r.id }, data: { titlePatternType: c.type } });
  }
  console.log(`✔ 스타일 패턴 ${patterns.length}종, 레퍼런스 ${refs.length}건 제목 패턴 분류`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
