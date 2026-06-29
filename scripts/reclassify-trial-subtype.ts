// 공판 기사 중 하위 범죄유형이 '기타'인 건을 네이버 미러로 본문 크롤링 → 하위 범죄유형(crimeSubtype) 재분류.
//  crimeType('공판')은 보존하고 crimeSubtype 만 보강한다.
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { extractBody } from "@/lib/publicSafety/assemblyNewsEnricher";
import { classifyCrime } from "@/lib/classifiers/keyword-rules";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

const ID = process.env.NAVER_CLIENT_ID!, SECRET = process.env.NAVER_CLIENT_SECRET!;
const CONC = Number(process.env.BF_CONC || 4);
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
  const targets = await prisma.article.findMany({
    where: { crimeType: "공판", crimeSubtype: "기타" },
    orderBy: { publishedAt: "desc" },
    select: { id: true, title: true, summary: true },
  });
  console.log(`공판 하위유형 '기타' 재분류 대상 ${targets.length}건`);

  let done = 0, fixed = 0, nobody = 0;
  const byCat: Record<string, number> = {};
  for (let i = 0; i < targets.length; i += CONC) {
    await Promise.all(targets.slice(i, i + CONC).map(async (a) => {
      done++;
      const links = await naverLinks(cleanTitle(a.title));
      if (!links.length) { nobody++; return; }
      let text = "";
      for (const l of links) { const b = await body(l); if (b) text += " " + b; }
      if (!text.trim()) { nobody++; return; }
      // skipTitleTrial: 공판 판정을 건너뛰고 기저(underlying) 범죄유형을 얻는다
      const r = classifyCrime({ title: a.title, summary: a.summary ?? "", fullText: text } as any, { skipTitleTrial: true });
      if (r.crimeType && r.crimeType !== "기타" && r.crimeType !== "공판") {
        await prisma.article.update({ where: { id: a.id }, data: { crimeSubtype: r.crimeType, bodyEnrichedAt: new Date() } });
        fixed++; byCat[r.crimeType] = (byCat[r.crimeType] ?? 0) + 1;
      }
      await new Promise((res) => setTimeout(res, 80));
    }));
  }
  console.log(`✔ 완료 — 재분류 ${fixed} · 미러없음 ${nobody}`);
  console.log("유형별:", JSON.stringify(byCat));
  await rebuildClusters();
  const remain = await prisma.article.count({ where: { crimeType: "공판", crimeSubtype: "기타" } });
  console.log(`클러스터 재생성 완료 · 남은 공판-기타 ${remain}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
