// 검찰청 마스터 동기화 (MVP: seed-offices.json. 운영: 대검 공식 페이지 크롤링)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";

async function main() {
  const offices = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/seed-offices.json"), "utf-8")).offices as any[];
  for (const o of offices) {
    const data = {
      type: o.type, region: o.region, homepageUrl: o.homepageUrl ?? null,
      jurisdictionText: o.jurisdictionText ?? null,
      policeStations: o.policeStations ? JSON.stringify(o.policeStations) : null,
      searchKeywords: o.searchKeywords ? JSON.stringify(o.searchKeywords) : null,
    };
    await prisma.prosecutionOffice.upsert({ where: { name: o.name }, update: data, create: { name: o.name, ...data } });
  }
  const all = await prisma.prosecutionOffice.findMany({ select: { id: true, name: true } });
  const idByName = new Map(all.map((o) => [o.name, o.id]));
  for (const o of offices) {
    if (o.parentName && idByName.has(o.parentName)) await prisma.prosecutionOffice.update({ where: { name: o.name }, data: { parentId: idByName.get(o.parentName)! } });
  }
  console.log(`✔ 검찰청 ${offices.length}곳 동기화`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
