// 고등법원 선고 기사 → 대응 고등검찰청으로 관할 분류(서울고법→서울고검 등)
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

const HIGH_COURT: { keys: string[]; office: string }[] = [
  { keys: ["서울고등법원", "서울고법"], office: "서울고등검찰청" },
  { keys: ["수원고등법원", "수원고법"], office: "수원고등검찰청" },
  { keys: ["대전고등법원", "대전고법"], office: "대전고등검찰청" },
  { keys: ["대구고등법원", "대구고법"], office: "대구고등검찰청" },
  { keys: ["부산고등법원", "부산고법"], office: "부산고등검찰청" },
  { keys: ["광주고등법원", "광주고법"], office: "광주고등검찰청" },
];

async function main() {
  const offs = await prisma.prosecutionOffice.findMany({ where: { type: "고등검찰청" }, select: { id: true, name: true } });
  const idByName = new Map(offs.map((o) => [o.name, o.id]));
  console.log("고검 오피스:", offs.map((o) => o.name).join(", "));

  const arts = await prisma.article.findMany({ select: { id: true, title: true, summary: true, primaryOfficeId: true } });
  let changed = 0;
  for (const a of arts) {
    const text = `${a.title} ${a.summary ?? ""}`;
    // 가장 먼저 등장하는 고등법원 찾기
    let best: { idx: number; office: string } | null = null;
    for (const h of HIGH_COURT) {
      for (const k of h.keys) {
        const i = text.indexOf(k);
        if (i >= 0 && (!best || i < best.idx)) best = { idx: i, office: h.office };
      }
    }
    if (best) {
      const id = idByName.get(best.office);
      if (id && id !== a.primaryOfficeId) {
        await prisma.article.update({ where: { id: a.id }, data: { primaryOfficeId: id } });
        changed++;
      }
    }
  }
  console.log(`고법→고검 재분류 ${changed}건`);
  await rebuildClusters();
  console.log("클러스터 재생성 완료");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
