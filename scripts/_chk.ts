import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { scoreCrimeCategory } from "@/lib/classifiers/keyword-rules";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

// 법률상담 홍보(비범죄) 삭제 패턴
const PR_RE = /이웃집\s*변호사|마을\s*변호사|찾아가는\s*법률|무료\s*법률\s*상담|생활\s*법률\s*상담|법률\s*상담\s*(운영|가동|개설|시행|서비스|센터)/;

async function main() {
  // 1) 법률상담 홍보 삭제
  const prs = await prisma.article.findMany({ where: { OR: [{ title: { contains: "이웃집 변호사" } }, { title: { contains: "마을변호사" } }, { title: { contains: "무료 법률상담" } }, { title: { contains: "생활법률" } }, { title: { contains: "법률상담" } }] }, select: { id: true, title: true } });
  const toDelete = prs.filter((a) => PR_RE.test(a.title));
  for (const a of toDelete) {
    await prisma.articleClassification.deleteMany({ where: { articleId: a.id } }).catch(() => {});
    await prisma.assemblyArticleLink.deleteMany({ where: { articleId: a.id } }).catch(() => {});
    await prisma.article.delete({ where: { id: a.id } });
  }
  console.log(`법률상담 홍보 삭제 ${toDelete.length}건`);
  toDelete.slice(0, 8).forEach((a) => console.log("  -", a.title.slice(0, 45)));

  // 2) 노동/중대재해 오분류 정리 — 제목+요약에 노동 신호 없으면 실제 유형/기타로
  const labor = await prisma.article.findMany({ where: { crimeType: "노동/중대재해범죄" }, select: { id: true, title: true, summary: true, bodyEnrichedAt: true } });
  let moved = 0, toOther = 0;
  const byCat: Record<string, number> = {};
  for (const a of labor) {
    const r = scoreCrimeCategory(`${a.title} ${a.title} ${a.summary ?? ""}`);
    if (r && r.cat !== "노동/중대재해범죄") {
      await prisma.article.update({ where: { id: a.id }, data: { crimeType: r.cat, crimeSubtype: r.sub } });
      moved++; byCat[r.cat] = (byCat[r.cat] ?? 0) + 1;
    } else if (!r && a.bodyEnrichedAt) {
      await prisma.article.update({ where: { id: a.id }, data: { crimeType: "기타", crimeSubtype: "기타" } });
      toOther++;
    }
  }
  console.log(`노동/중대재해 정리 — 타유형 이동 ${moved} · 기타 환원 ${toOther}`);
  console.log("이동 유형별:", JSON.stringify(byCat));

  await rebuildClusters();
  const remain = await prisma.article.count({ where: { crimeType: "노동/중대재해범죄" } });
  console.log(`✔ 클러스터 재생성 · 남은 노동/중대재해 ${remain}건`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
