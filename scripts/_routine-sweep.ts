import "dotenv/config";
import { prisma } from "@/lib/db/prisma";

// 플레이북 상시 스윕: 더벨 · 트럼프/미국 정치 잔재 정리 + 클러스터 정합
(async () => {
  const targets = await prisma.article.findMany({
    where: { OR: [
      { sourceName: { contains: "thebell" } },
      { title: { contains: "더벨" } },
      { title: { contains: "트럼프" } },
      { title: { contains: "美 대법" } },
      { title: { contains: "美대법" } },
      { title: { contains: "미 대법원" } },
    ] },
    select: { id: true, title: true, issueClusterId: true },
  });
  console.log(`상시 스윕 대상 ${targets.length}건`);
  targets.slice(0, 6).forEach((t) => console.log("  -", t.title.split(" - ")[0].slice(0, 50)));
  if (targets.length) {
    const clusterIds = [...new Set(targets.map((t) => t.issueClusterId).filter(Boolean) as string[])];
    const del = await prisma.article.deleteMany({ where: { id: { in: targets.map((t) => t.id) } } });
    let u = 0, r = 0;
    for (const cid of clusterIds) {
      const c = await prisma.article.count({ where: { issueClusterId: cid } });
      if (c === 0) { try { await prisma.issueCluster.delete({ where: { id: cid } }); r++; } catch {} }
      else { try { await prisma.issueCluster.update({ where: { id: cid }, data: { articleCount: c } }); u++; } catch {} }
    }
    console.log(`삭제 ${del.count} · 클러스터 갱신 ${u} · 빈 클러스터 삭제 ${r}`);
  }
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
