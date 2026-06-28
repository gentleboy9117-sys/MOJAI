// [공안] 일일(DAILY) 공안 브리핑 생성 + 저장.
//        사용: tsx scripts/generate-public-safety-briefing.ts
//  * 집회·시위는 범죄로 단정하지 않으며, 모든 산출물은 참고용(담당자 최종판단)이다.
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { checkText } from "@/lib/report/riskChecker";
import {
  buildPublicSafetyBriefingData,
  generatePublicSafetyBriefingMarkdown,
} from "@/lib/publicSafety/publicSafetyBriefingGenerator";

const DAY = 86400000;

async function main() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 2 * DAY);

  console.log("▶ 일일 공안 브리핑 생성");
  const data = await buildPublicSafetyBriefingData(prisma, {
    start,
    end,
    generatedBy: "자동 브리핑(시스템)",
    now,
    type: "DAILY",
  });
  const { title, markdown } = generatePublicSafetyBriefingMarkdown(data, "DAILY");
  const safety = checkText(markdown);

  const briefing = await prisma.publicSafetyBriefing.create({
    data: {
      title,
      briefingType: "DAILY",
      periodStart: start,
      periodEnd: end,
      markdownContent: markdown,
      safetyCheckJson: JSON.stringify(safety),
    },
  });
  console.log(
    `✔ 공안 브리핑 생성 완료 — 공개 일정 ${data.totalAssemblyCount}건, 관련 보도 ${data.relatedNews.length}건, 문서 ${briefing.id} (리스크 ${safety.riskLevel})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
