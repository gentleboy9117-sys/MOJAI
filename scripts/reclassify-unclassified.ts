// 관할 미분류 기사만 제목+요약 기준으로 재분류(지역 폴백 등 새 규칙 적용, 본문 재수집 없음)
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { getJurisdictionOffices } from "@/lib/publicSafety/runAssemblyPipeline";
import { classifyAllOffices } from "@/lib/publicSafety/assemblyJurisdictionClassifier";

async function main() {
  const offices = await getJurisdictionOffices(prisma);
  const arts = await prisma.article.findMany({
    where: { primaryOfficeId: null },
    select: { id: true, title: true, summary: true },
  });
  let fixed = 0;
  for (const a of arts) {
    const offs = classifyAllOffices(`${a.title} ${a.summary ?? ""}`, offices);
    if (offs[0]) {
      await prisma.article.update({ where: { id: a.id }, data: { primaryOfficeId: offs[0].officeId } });
      fixed++;
    }
  }
  const remain = await prisma.article.count({ where: { primaryOfficeId: null } });
  console.log(`✔ 미분류 ${arts.length}건 중 ${fixed}건 관할 분류 · 남은 미분류 ${remain}건`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
