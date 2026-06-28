// 집회·시위 일정 크롤(전국 지방경찰청 게시판) → AssemblyEvent 적재 + 관련 보도 매칭.
//  Neon에 집회 데이터가 비어있을 때 복구용.
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { crawlRegionalAssembliesAndClassify, matchAllAssembliesToArticles } from "@/lib/publicSafety/runAssemblyPipeline";
import { crawlDetailedAssemblies } from "@/lib/publicSafety/assemblyDetailCrawler";

async function main() {
  const now = new Date();
  console.log("집회 게시판 크롤 시작…");
  const asm = await crawlRegionalAssembliesAndClassify(prisma, now);
  console.log(`  게시판 ${asm.sources}곳(성공 ${asm.okSources}) · 수집 ${asm.collected} · 저장 ${asm.savedAssemblies} · 매칭 ${asm.createdLinks}`);
  const detailed = await crawlDetailedAssemblies(prisma, now, { maxPosts: 8 }).catch(() => []);
  const dn = detailed.reduce((s, d) => s + d.assemblies, 0);
  if (dn) { await matchAllAssembliesToArticles(prisma, now); console.log(`  상세 파싱 집회 ${dn}건 재매칭`); }
  const total = await prisma.assemblyEvent.count();
  console.log(`✔ 집회 일정 적재 완료 — AssemblyEvent ${total}건`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
