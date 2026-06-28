// 지방경찰청 언급 기사 재분류 — 새 매핑(대구경찰→대구지검 등) 반영
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { getJurisdictionOffices } from "@/lib/publicSafety/runAssemblyPipeline";
import { classifyAllOffices } from "@/lib/publicSafety/assemblyJurisdictionClassifier";

const AGENCY_RE = /(서울|부산|대구|인천|광주|대전|울산|세종|경기남부|경기북부|경기|강원|충북|충남|전북|전남|경북|경남|제주)경찰/;

async function main() {
  const offices = await getJurisdictionOffices(prisma);
  const arts = await prisma.article.findMany({
    select: { id: true, title: true, summary: true, primaryOfficeId: true },
  });
  let changed = 0;
  for (const a of arts) {
    const text = `${a.title} ${a.summary ?? ""}`;
    if (!AGENCY_RE.test(text)) continue;
    const offs = classifyAllOffices(text, offices);
    if (offs[0] && offs[0].officeId !== a.primaryOfficeId) {
      await prisma.article.update({ where: { id: a.id }, data: { primaryOfficeId: offs[0].officeId } });
      changed++;
    }
  }
  console.log(`✔ 지방청 언급 기사 재분류 — ${changed}건 관할 변경`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
