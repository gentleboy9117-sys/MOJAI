// [공안] 서울경찰청 공개 집회·시위 일정 수집 → 관할(추정) 분류 → upsert
//        → 샘플 관련 보도 삽입 → 매칭. 사용: tsx scripts/collect-seoul-assemblies.ts
//  * 집회·시위는 헌법상 기본권 행사일 수 있으므로 범죄로 단정하지 않는다.
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { collectAndClassifyAssemblies } from "@/lib/publicSafety/runAssemblyPipeline";

async function main() {
  console.log("▶ 공개 집회·시위 일정 수집 시작");
  const r = await collectAndClassifyAssemblies(prisma, new Date());
  console.log(
    `✔ 수집 ${r.collected} · 저장(upsert) ${r.savedAssemblies} · 관련 보도 삽입 ${r.insertedArticles} · 신규 링크 ${r.createdLinks}`,
  );
  console.log("  (모든 결과는 참고용이며 관할은 추정입니다. 담당자 검토가 필요합니다.)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
