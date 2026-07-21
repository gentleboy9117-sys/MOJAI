import "dotenv/config";
import { prisma } from "@/lib/db/prisma";

// 조직도의 '대검찰청'(중복 레코드)을 '법무부/대검찰청'으로 병합
(async () => {
  const keep = await prisma.prosecutionOffice.findFirst({ where: { name: { contains: "법무부" } } });
  const dup = await prisma.prosecutionOffice.findFirst({ where: { name: "대검찰청" } });
  if (!keep) { console.log("법무부/대검찰청 레코드 없음 — 중단"); process.exit(1); }
  if (!dup) { console.log("별도 '대검찰청' 레코드 없음 — 병합 불필요"); await prisma.$disconnect(); return; }
  console.log(`병합: ${dup.name}(${dup.id}) → ${keep.name}(${keep.id})`);

  const a = await prisma.article.updateMany({ where: { primaryOfficeId: dup.id }, data: { primaryOfficeId: keep.id } });
  const c = await prisma.articleClassification.updateMany({ where: { prosecutionOfficeId: dup.id }, data: { prosecutionOfficeId: keep.id } });
  const e = await prisma.assemblyEvent.updateMany({ where: { prosecutionOfficeId: dup.id }, data: { prosecutionOfficeId: keep.id, prosecutionOfficeName: keep.name } });
  const t = await prisma.trendAlert.updateMany({ where: { officeId: dup.id }, data: { officeId: keep.id } }).catch(() => ({ count: 0 }));
  // 혹시 dup을 부모로 둔 청이 있으면 keep으로
  const ch = await prisma.prosecutionOffice.updateMany({ where: { parentId: dup.id }, data: { parentId: keep.id } });
  await prisma.prosecutionOffice.delete({ where: { id: dup.id } });
  console.log(`이관 — 기사 ${a.count} · 분류 ${c.count} · 집회 ${e.count} · 트렌드 ${t.count} · 하위청 ${ch.count} → '대검찰청' 삭제 완료`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
