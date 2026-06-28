// 구글뉴스 리다이렉트 URL → 실제 언론사 원문 URL 디코딩·저장(링크용). 분류는 건드리지 않음.
//  사용: tsx scripts/resolve-urls.ts   (BF_MAX, BF_BATCH, BF_DELAY)
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { decodeGoogleNewsUrl } from "@/lib/publicSafety/assemblyNewsEnricher";

const MAX = Number(process.env.BF_MAX || 3000);
const BATCH = Number(process.env.BF_BATCH || 60);
const DELAY = Number(process.env.BF_DELAY || 250);

async function main() {
  let total = 0, resolved = 0, failed = 0;
  while (total < MAX) {
    const arts = await prisma.article.findMany({
      where: { resolvedUrl: null, originalUrl: { contains: "news.google.com" } },
      take: BATCH,
      select: { id: true, originalUrl: true },
    });
    if (arts.length === 0) break;
    for (const a of arts) {
      total++;
      let real: string | null = null;
      try { real = await decodeGoogleNewsUrl(a.originalUrl); } catch { /* ignore */ }
      if (real && real !== a.originalUrl && real.startsWith("http")) {
        await prisma.article.update({ where: { id: a.id }, data: { resolvedUrl: real } });
        resolved++;
      } else {
        // 디코딩 실패 시 재시도 방지를 위해 원본을 그대로 저장(링크는 구글 경유)
        await prisma.article.update({ where: { id: a.id }, data: { resolvedUrl: a.originalUrl } });
        failed++;
      }
      if (DELAY) await new Promise((r) => setTimeout(r, DELAY));
    }
    console.log(`  누적 처리 ${total} · 원문URL ${resolved} · 실패 ${failed}`);
    if (arts.length < BATCH) break;
  }
  console.log(`✔ URL 해석 완료 — 처리 ${total} · 원문 ${resolved} · 실패 ${failed}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
