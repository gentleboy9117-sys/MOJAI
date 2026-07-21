import "dotenv/config";
import { prisma } from "@/lib/db/prisma";

(async () => {
  const all = await prisma.prosecutionOffice.findMany({ select: { id: true, name: true, type: true, parentId: true, createdAt: true } });
  console.log(`총 청 레코드: ${all.length}`);
  // 이름 중복
  const byName = new Map<string, typeof all>();
  for (const o of all) { const k = o.name.trim(); if (!byName.has(k)) byName.set(k, [] as any); (byName.get(k) as any).push(o); }
  const dups = [...byName.entries()].filter(([, v]) => v.length > 1);
  console.log(`이름 중복: ${dups.length}건`);
  dups.forEach(([n, v]) => v.forEach((o: any) => console.log(`  ${n} | ${o.type} | ${o.id} | ${o.createdAt.toISOString().slice(0,10)}`)));
  // 대검/법무부 계열 전체
  const dae = all.filter((o) => o.name.includes("대검") || o.name.includes("법무부"));
  console.log("대검·법무부 계열:");
  dae.forEach((o) => console.log(`  ${o.name} | type=${o.type} | ${o.id} | ${o.createdAt.toISOString().slice(0,10)}`));
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
