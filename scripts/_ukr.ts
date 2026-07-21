import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { isForeignTopic } from "@/lib/collect/filters";

async function cleanupClusters(ids: string[]) {
  let u = 0, r = 0;
  for (const cid of ids) {
    const c = await prisma.article.count({ where: { issueClusterId: cid } });
    if (c === 0) { try { await prisma.issueCluster.delete({ where: { id: cid } }); r++; } catch {} }
    else { try { await prisma.issueCluster.update({ where: { id: cid }, data: { articleCount: c } }); u++; } catch {} }
  }
  return { u, r };
}

(async () => {
  const all = await prisma.article.findMany({ select: { id: true, title: true, summary: true, issueClusterId: true } });
  const hits = all.filter((a) => isForeignTopic(a.title, a.summary));
  console.log(`해외기사 스윕 대상 ${hits.length}건 (예시 15):`);
  hits.slice(0, 15).forEach((h) => console.log("  -", h.title.split(" - ")[0].slice(0, 55)));
  if (hits.length) {
    const clusterIds = [...new Set(hits.map((h) => h.issueClusterId).filter(Boolean) as string[])];
    const del = await prisma.article.deleteMany({ where: { id: { in: hits.map((h) => h.id) } } });
    const cc = await cleanupClusters(clusterIds);
    console.log(`삭제 ${del.count} · 클러스터 갱신 ${cc.u} · 빈 클러스터 삭제 ${cc.r}`);
  }
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
