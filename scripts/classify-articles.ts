// 미분류/검토필요 기사 일괄 재분류 후 클러스터/증가감지 갱신
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { getOfficeLites, reclassifyArticle, rebuildClusters, persistTrendAlerts } from "@/lib/pipeline/runPipeline";

async function main() {
  const useLlm = process.argv.includes("--llm");
  const offices = await getOfficeLites();
  const articles = await prisma.article.findMany({ select: { id: true } });
  for (const a of articles) await reclassifyArticle(a.id, offices, useLlm);
  const clusters = await rebuildClusters();
  const trends = await persistTrendAlerts();
  console.log(`✔ 기사 ${articles.length}건 재분류 · 클러스터 ${clusters} · 증가감지 ${trends} (LLM=${useLlm})`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
