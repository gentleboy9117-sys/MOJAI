import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
(async () => {
  const rows = await prisma.assemblyEvent.findMany({ where: { OR: [{ title: { contains: "집호" } }, { title: { contains: "집회;" } }, { title: { endsWith: ";" } }] }, select: { id: true, title: true } });
  console.log(`수정 대상 ${rows.length}건`);
  let n = 0;
  for (const r of rows) {
    const fixed = r.title.replace(/집호/g, "집회").replace(/[;；]\s*$/g, "").trim();
    if (fixed !== r.title) {
      await prisma.assemblyEvent.update({ where: { id: r.id }, data: { title: fixed } });
      console.log(`  '${r.title}' → '${fixed}'`);
      n++;
    }
  }
  console.log(`✔ ${n}건 수정`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
