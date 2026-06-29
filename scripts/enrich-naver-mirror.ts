// 미분류/오분류 기사를 네이버 모바일 미러(n.news.naver.com, 서버렌더링)로 본문 추출 → 관할 분류.
//  JS 렌더링 사이트라 무료 크롤러로 못 읽던 본문을 네이버 미러에서 읽어 보강.
//  사용: BF_MAX, BF_CONC, BF_SINCE_DAYS
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { extractBody } from "@/lib/publicSafety/assemblyNewsEnricher";
import { classifyAllOffices } from "@/lib/publicSafety/assemblyJurisdictionClassifier";
import { getJurisdictionOffices } from "@/lib/publicSafety/runAssemblyPipeline";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

const ID = process.env.NAVER_CLIENT_ID!, SECRET = process.env.NAVER_CLIENT_SECRET!;
const MAX = Number(process.env.BF_MAX || 4000);
const CONC = Number(process.env.BF_CONC || 4);
const SINCE = Number(process.env.BF_SINCE_DAYS || 60);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function cleanTitle(t: string) { return t.split(" - ")[0].replace(/\[[^\]]*\]/g, "").trim(); }
async function naverLinks(q: string): Promise<string[]> {
  try {
    const r = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(q)}&display=5&sort=sim`, { headers: { "X-Naver-Client-Id": ID, "X-Naver-Client-Secret": SECRET } });
    if (!r.ok) return [];
    const j: any = await r.json();
    return (j.items ?? []).map((it: any) => (it.link || "").trim()).filter((l: string) => l.includes("n.news.naver.com")).slice(0, 3);
  } catch { return []; }
}
async function body(url: string): Promise<string> {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 12000);
  try { const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: ctrl.signal }); if (!r.ok) return ""; return extractBody(await r.text()); } catch { return ""; } finally { clearTimeout(t); }
}

async function main() {
  const offices = await getJurisdictionOffices(prisma);
  const moj = await prisma.prosecutionOffice.findFirst({ where: { name: "법무부/대검찰청" }, select: { id: true } });
  const since = new Date(Date.now() - SINCE * 86400000);
  const targets = await prisma.article.findMany({
    where: {
      publishedAt: { gte: since },
      OR: [
        { primaryOfficeId: null },
        ...(moj ? [{ AND: [{ primaryOfficeId: moj.id }, { crimeType: { not: "형사사법제도/정책" } }] }] : []),
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: MAX,
    select: { id: true, title: true, summary: true, primaryOfficeId: true },
  });
  console.log(`네이버 미러 보강 대상 ${targets.length}건`);

  let done = 0, fixed = 0, nobody = 0;
  for (let i = 0; i < targets.length; i += CONC) {
    await Promise.all(targets.slice(i, i + CONC).map(async (a) => {
      done++;
      const links = await naverLinks(cleanTitle(a.title));
      if (!links.length) { nobody++; return; }
      let text = `${a.title} ${a.summary ?? ""}`;
      for (const l of links) { const b = await body(l); if (b) text += " " + b; }
      const offs = classifyAllOffices(text, offices);
      if (offs[0] && offs[0].officeId !== a.primaryOfficeId) {
        await prisma.article.update({ where: { id: a.id }, data: { primaryOfficeId: offs[0].officeId, bodyEnrichedAt: new Date() } });
        fixed++;
      }
      await new Promise((r) => setTimeout(r, 80));
    }));
    if ((i / CONC) % 15 === 0) console.log(`  ${done}/${targets.length} · 관할보강 ${fixed} · 미러없음 ${nobody}`);
  }
  console.log(`✔ 완료 — 관할보강 ${fixed} · 미러없음 ${nobody}`);
  await rebuildClusters();
  const remain = await prisma.article.count({ where: { primaryOfficeId: null } });
  console.log(`클러스터 재생성 완료 · 남은 미분류 ${remain}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
