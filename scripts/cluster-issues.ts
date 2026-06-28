// 이슈 클러스터 재구성(스코어링/확산/타임라인 포함)
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

async function main() {
  const n = await rebuildClusters();
  console.log(`✔ 이슈 클러스터 ${n}건 재구성`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
