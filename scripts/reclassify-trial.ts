// 공판 재판정 — 본문에 '당일/전일 법원 선고'가 있는 기사만 공판으로. (과거 재판 언급 기사는 제외)
//  실제 URL(네이버 등) 본문을 직접 읽어 판별. 구글 전용 링크는 제목·요약만으로 판정.
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { extractBody } from "@/lib/publicSafety/assemblyNewsEnricher";
import { classifyCrime, detectFreshVerdict } from "@/lib/classifiers/keyword-rules";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

const CONC = Number(process.env.BF_CONC || 8);
const SINCE = Number(process.env.BF_SINCE_DAYS || 60);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
// 공판 후보(판결 관련 표현) — 이들만 본문 확인
const VERDICT_HINT = /선고|판결|징역|금고|집행유예|법정구속|실형|무죄|유죄|벌금형|항소심|상고심|구형|기소/;

async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" }, signal: ctrl.signal, redirect: "follow" });
    if (!r.ok) return "";
    return await r.text();
  } catch { return ""; } finally { clearTimeout(t); }
}

async function main() {
  const since = new Date(Date.now() - SINCE * 86400000);
  const all = await prisma.article.findMany({
    where: { publishedAt: { gte: since } },
    select: { id: true, title: true, summary: true, crimeType: true, crimeSubtype: true, publishedAt: true, originalUrl: true, resolvedUrl: true, sourceType: true, sourceName: true },
  });
  // 후보: 현재 공판이거나 제목/요약에 판결 관련 표현
  const cand = all.filter((a) => a.crimeType === "공판" || VERDICT_HINT.test(`${a.title} ${a.summary ?? ""}`));
  console.log(`공판 후보 ${cand.length}건 재판정 시작`);

  let done = 0, toTrial = 0, fromTrial = 0, changed = 0;
  for (let i = 0; i < cand.length; i += CONC) {
    const chunk = cand.slice(i, i + CONC);
    await Promise.all(chunk.map(async (a) => {
      done++;
      const url = a.resolvedUrl && !a.resolvedUrl.includes("news.google.com") ? a.resolvedUrl : (!a.originalUrl.includes("news.google.com") ? a.originalUrl : "");
      const body = url ? extractBody(await fetchText(url)) : "";
      const text = `${a.title} ${a.summary ?? ""} ${body}`;
      const fresh = detectFreshVerdict(text, a.publishedAt);
      // 비공판 기준 분류(본문 포함) — 공판이 아닐 때의 유형 / 공판일 때의 기저유형
      const base = classifyCrime({ title: a.title, summary: a.summary ?? undefined, fullText: body || undefined, sourceType: a.sourceType, sourceName: a.sourceName } as any, { skipTitleTrial: true });
      const newType = fresh ? "공판" : base.crimeType;
      const newSub = fresh ? base.crimeType : base.crimeSubtype ?? null;
      if (newType !== a.crimeType || newSub !== a.crimeSubtype) {
        await prisma.article.update({ where: { id: a.id }, data: { crimeType: newType, crimeSubtype: newSub, bodyEnrichedAt: new Date() } });
        changed++;
        if (newType === "공판" && a.crimeType !== "공판") toTrial++;
        if (newType !== "공판" && a.crimeType === "공판") fromTrial++;
      }
    }));
    if ((i / CONC) % 15 === 0) console.log(`  ${done}/${cand.length} · 변경 ${changed} (→공판 ${toTrial}, 공판→타 ${fromTrial})`);
  }
  console.log(`✔ 완료 — 변경 ${changed} · 신규공판 ${toTrial} · 공판해제 ${fromTrial}`);
  if (changed) { await rebuildClusters(); console.log("클러스터 재생성 완료"); }
  const trial = await prisma.article.count({ where: { crimeType: "공판" } });
  console.log(`현재 공판 기사 ${trial}건`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
