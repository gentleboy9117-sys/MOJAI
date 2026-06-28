// 구글 리다이렉트 링크(깨짐) → 실제 원문 URL 해석.
//  1) 이미 실제 URL을 가진 동일 제목 기사가 있으면 그 URL 재사용(무료, 즉시)
//  2) 없으면 네이버 뉴스 검색 API로 제목 검색 → 동일 제목 결과의 originallink 사용
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";

const ID = process.env.NAVER_CLIENT_ID;
const SECRET = process.env.NAVER_CLIENT_SECRET;
const MAX = Number(process.env.BF_MAX || 6000);

function strip(s: string): string {
  return (s || "").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
}
function normTitle(t: string): string {
  return t.split(" - ")[0].replace(/\[[^\]]*\]/g, "").replace(/[\s·.,'"“”()…\-]/g, "").toLowerCase();
}
function isGoogle(u: string | null): boolean { return !!u && u.includes("news.google.com"); }

async function naverSearch(query: string): Promise<{ title: string; link: string }[]> {
  try {
    const res = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=10&sort=sim`, {
      headers: { "X-Naver-Client-Id": ID!, "X-Naver-Client-Secret": SECRET! },
    });
    if (!res.ok) return [];
    const j: any = await res.json();
    return (j.items ?? []).map((it: any) => ({ title: strip(it.title), link: (it.originallink || it.link || "").trim() }));
  } catch { return []; }
}

async function main() {
  if (!ID || !SECRET) { console.error("NAVER 키 필요"); process.exit(1); }
  // 실제 URL 보유 기사 → 제목맵
  const reals = await prisma.article.findMany({
    where: { resolvedUrl: { not: null }, NOT: { resolvedUrl: { contains: "news.google.com" } } },
    select: { title: true, resolvedUrl: true },
  });
  const realMap = new Map<string, string>();
  for (const a of reals) { const k = normTitle(a.title); if (k && !realMap.has(k)) realMap.set(k, a.resolvedUrl!); }
  console.log(`실제URL 제목맵 ${realMap.size}개`);

  const broken = await prisma.article.findMany({
    where: { originalUrl: { contains: "news.google.com" }, OR: [{ resolvedUrl: null }, { resolvedUrl: { contains: "news.google.com" } }] },
    take: MAX,
    select: { id: true, title: true },
  });
  console.log(`구글 깨진링크 ${broken.length}건 해석 시작`);

  let dup = 0, naver = 0, fail = 0, n = 0;
  for (const a of broken) {
    n++;
    const nt = normTitle(a.title);
    let resolved: string | null = nt ? realMap.get(nt) ?? null : null;
    if (resolved) { dup++; }
    else {
      const items = await naverSearch(a.title.split(" - ")[0]);
      const hit = items.find((it) => normTitle(it.title) === nt && it.link.startsWith("http") && !isGoogle(it.link));
      if (hit) { resolved = hit.link; naver++; realMap.set(nt, resolved); }
      await new Promise((r) => setTimeout(r, 120));
    }
    if (resolved) await prisma.article.update({ where: { id: a.id }, data: { resolvedUrl: resolved } });
    else fail++;
    if (n % 100 === 0) console.log(`  ${n}/${broken.length} · 중복재사용 ${dup} · 네이버해석 ${naver} · 미해결 ${fail}`);
  }
  console.log(`✔ 완료 — 중복재사용 ${dup} · 네이버해석 ${naver} · 미해결 ${fail}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
