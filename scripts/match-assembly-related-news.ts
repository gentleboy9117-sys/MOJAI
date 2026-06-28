// [공안] 공개 집회 일정 × 최근 공개 보도 매칭 재실행.
//        사용: tsx scripts/match-assembly-related-news.ts
//  * 관련 보도는 범죄가 아니라 '공개 보도'이며, 법적 이슈는 가능성 언급(확정 아님)이다.
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { matchAllAssembliesToArticles } from "@/lib/publicSafety/runAssemblyPipeline";

async function main() {
  console.log("▶ 집회 ↔ 공개 보도 매칭 재실행");
  const created = await matchAllAssembliesToArticles(prisma, new Date());
  console.log(`✔ 신규 링크 ${created}건 (기존 링크는 갱신). 참고용 — 담당자 검토 필요.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
