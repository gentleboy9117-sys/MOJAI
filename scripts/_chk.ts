import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
(async () => {
  const n = await prisma.pressReleaseReference.count();
  const u = await prisma.pressReleaseReference.count({ where: { isUsableForStyleReference: true } });
  console.log(`pressReleaseReference 총 ${n} · 스타일참고 ${u}`);
  const s = await prisma.pressReleaseReference.findMany({ take: 3, select: { title: true, titlePatternType: true } });
  s.forEach((r) => console.log("  -", r.title, "|", r.titlePatternType));
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
