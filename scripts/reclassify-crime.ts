// 전체 기사 범죄유형 재분류(형사사법제도/정책 등 신규 유형 반영). 관할(primaryOffice)은 보존.
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { classifyCrime } from "@/lib/classifiers/keyword-rules";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

async function main() {
  const arts = await prisma.article.findMany({
    select: { id: true, title: true, summary: true, fullText: true, sourceType: true, sourceName: true },
  });
  let changed = 0;
  for (const a of arts) {
    const r = classifyCrime({ title: a.title, summary: a.summary ?? undefined, fullText: a.fullText ?? undefined, sourceType: a.sourceType, sourceName: a.sourceName } as any);
    if (r.crimeType !== undefined) {
      const cur = await prisma.article.findUnique({ where: { id: a.id }, select: { crimeType: true, crimeSubtype: true } });
      if (cur?.crimeType !== r.crimeType || cur?.crimeSubtype !== (r.crimeSubtype ?? null)) {
        await prisma.article.update({ where: { id: a.id }, data: { crimeType: r.crimeType, crimeSubtype: r.crimeSubtype ?? null } });
        changed++;
      }
    }
  }
  console.log(`범죄유형 재분류 — ${changed}건 변경`);
  await rebuildClusters();
  const policy = await prisma.article.count({ where: { crimeType: "형사사법제도/정책" } });
  console.log(`✔ 클러스터 재생성 완료 · 형사사법제도/정책 ${policy}건`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
