// 집회·시위 보도 본문 기반 발생지 관할 분류 백필 (반복 배치)
//  사용: tsx scripts/enrich-assembly-news.ts   (환경: BF_MAX, BF_BATCH, BF_SINCE_DAYS)
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { enrichAssemblyNewsBodies } from "@/lib/publicSafety/assemblyNewsEnricher";

const MAX = Number(process.env.BF_MAX || 600);
const BATCH = Number(process.env.BF_BATCH || 40);
const SINCE = Number(process.env.BF_SINCE_DAYS || 120);

async function main() {
  // BF_RESET_ALL=1 이면 모든 기사의 본문분류 상태 초기화(최종 규칙 + 실제 URL 일괄 재적용)
  if (process.env.BF_RESET_ALL === "1") {
    const r = await prisma.article.updateMany({ data: { bodyEnrichedAt: null } });
    console.log(`  전체 bodyEnrichedAt 리셋: ${r.count}건`);
  }
  // BF_RESET_UNCLASS=1 이면 아직 관할 미분류인 기사들의 본문분류 상태만 초기화(지역 폴백 등 새 규칙 재적용)
  if (process.env.BF_RESET_UNCLASS === "1") {
    const r = await prisma.article.updateMany({ where: { primaryOfficeId: null }, data: { bodyEnrichedAt: null } });
    console.log(`  미분류 bodyEnrichedAt 리셋: ${r.count}건`);
  }
  // BF_RESET=1 이면 집회/시위 기사의 본문분류 상태를 초기화하고 다시 분류
  if (process.env.BF_RESET === "1") {
    const r = await prisma.article.updateMany({
      where: { OR: [{ title: { contains: "집회" } }, { title: { contains: "시위" } }, { summary: { contains: "집회" } }, { summary: { contains: "시위" } }] },
      data: { bodyEnrichedAt: null, assemblyOffices: null, assemblyOfficeId: null, assemblyOfficeName: null, assemblyLocationHint: null },
    });
    console.log(`  bodyEnrichedAt 리셋: ${r.count}건`);
  }
  const allArticles = process.env.BF_ALL === "1";
  const unclassifiedOnly = process.env.BF_UNCLASS === "1";
  let total = 0, classified = 0, failed = 0;
  while (total < MAX) {
    const r = await enrichAssemblyNewsBodies(prisma, { limit: BATCH, sinceDays: SINCE, delayMs: 350, allArticles, unclassifiedOnly });
    total += r.processed; classified += r.classified; failed += r.failed;
    console.log(`  배치: 처리 ${r.processed} · 분류 ${r.classified} · 실패 ${r.failed} (누적 처리 ${total}, 분류 ${classified})`);
    if (r.processed < BATCH) break; // 더 이상 미처리 없음
  }
  console.log(`✔ 본문 분류 백필 완료 — 총 처리 ${total} · 관할 분류 ${classified} · 실패 ${failed}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
