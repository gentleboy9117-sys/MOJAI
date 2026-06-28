// 지정일(기본 2026-06-20) 이전 기사 전체 삭제 + 클러스터/매칭 재구성
//  사용: tsx scripts/cleanup-before.ts   (환경: CUTOFF=YYYY-MM-DD)
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { rebuildClusters, persistTrendAlerts } from "@/lib/pipeline/runPipeline";
import { matchAllAssembliesToArticles } from "@/lib/publicSafety/runAssemblyPipeline";

function parseCutoff(): Date {
  const s = process.env.CUTOFF;
  if (s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 0, 0, 0); }
  return new Date(2026, 5, 20, 0, 0, 0); // 2026-06-20 00:00 (local)
}

async function main() {
  const cutoff = parseCutoff();
  const now = new Date();

  const before = await prisma.article.count({ where: { publishedAt: { lt: cutoff } } });
  const totalBefore = await prisma.article.count();
  console.log(`삭제 대상: ${before}건 / 전체 ${totalBefore}건 (기준 ${cutoff.toISOString().slice(0, 10)} 이전)`);

  // 1) 삭제 대상 기사의 집회 링크 먼저 정리(역정규화 FK라 cascade 안 됨)
  const toDelete = await prisma.article.findMany({ where: { publishedAt: { lt: cutoff } }, select: { id: true } });
  const ids = toDelete.map((a) => a.id);
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    await prisma.assemblyArticleLink.deleteMany({ where: { articleId: { in: chunk } } });
  }

  // 2) 기사 삭제 (classification/entity/legal/timeline 은 cascade/setnull)
  const del = await prisma.article.deleteMany({ where: { publishedAt: { lt: cutoff } } });
  console.log(`✔ 기사 삭제 ${del.count}건`);

  // 3) 클러스터 재구성 + 빈 클러스터 제거
  await rebuildClusters(now);
  const emptied = await prisma.issueCluster.deleteMany({ where: { articles: { none: {} } } });
  console.log(`✔ 클러스터 재구성, 빈 클러스터 ${emptied.count}개 제거`);

  // 4) 집회-기사 매칭 재실행 + 트렌드 갱신
  await matchAllAssembliesToArticles(prisma, now);
  await persistTrendAlerts(now);

  const remain = await prisma.article.count();
  const asmNews = await prisma.article.count({
    where: { OR: [{ title: { contains: "집회" } }, { title: { contains: "시위" } }, { summary: { contains: "집회" } }, { summary: { contains: "시위" } }] },
  });
  console.log(`✔ 완료 — 남은 기사 ${remain}건 (집회·시위 ${asmNews}건)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
