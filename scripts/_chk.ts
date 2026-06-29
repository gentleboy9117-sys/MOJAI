import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { isNonLegalNoise, isForeignTopic, isCelebGossip, isPhotoOnlyTitle, isOpinionColumn } from "@/lib/collect/filters";
(async () => {
  const all = await prisma.article.findMany({ select: { id: true, title: true, summary: true } });
  const noise = all.filter((a) => isNonLegalNoise(a.title, a.summary));
  const foreign = all.filter((a) => isForeignTopic(a.title, a.summary));
  const celeb = all.filter((a) => isCelebGossip(a.title, a.summary));
  const photo = all.filter((a) => isPhotoOnlyTitle(a.title));
  const col = all.filter((a) => isOpinionColumn(a.title));
  const union = new Set([...noise, ...foreign, ...celeb, ...photo, ...col].map((a) => a.id));
  console.log(`전체 ${all.length}`);
  console.log(`  형사사법무관 ${noise.length} · 해외 ${foreign.length} · 연예 ${celeb.length} · 포토 ${photo.length} · 칼럼 ${col.length}`);
  console.log(`  삭제 합집합 ${union.size} (잔존 예상 ${all.length - union.size})`);
  console.log("\n형사사법무관 샘플 15:");
  noise.slice(0, 15).forEach((a) => console.log("  - " + a.title.slice(0, 50)));
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
