// 범죄유형별 공개 보도량 기준 증가 감지 생성
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { persistTrendAlerts } from "@/lib/pipeline/runPipeline";

async function main() {
  const n = await persistTrendAlerts();
  console.log(`✔ 공개 보도량 증가 감지 ${n}건`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
