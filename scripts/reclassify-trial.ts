// 본문 기반 보정 패스: ① 공판 판정(제목 선고 헤드라인 또는 본문의 어제/오늘 선고; 미래·가사 제외)
//   ② 관할은 '본문의 법원·검찰청' 우선(서울중앙지법→서울중앙지검, 부산지검→부산지검; 매체명·지역폴백을 덮어씀)
//  사용: BF_CONC, BF_SINCE_DAYS
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { extractBody } from "@/lib/publicSafety/assemblyNewsEnricher";
import { classifyCrime, detectFreshVerdict, isTitleVerdict } from "@/lib/classifiers/keyword-rules";
import { classifyAllOffices } from "@/lib/publicSafety/assemblyJurisdictionClassifier";
import { getJurisdictionOffices } from "@/lib/publicSafety/runAssemblyPipeline";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

const CONC = Number(process.env.BF_CONC || 8);
const SINCE = Number(process.env.BF_SINCE_DAYS || 60);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
// 본문 확인이 필요한 힌트(법률/사건/관할 표현)
const HINT = /선고|판결|징역|금고|집행유예|법정구속|실형|무죄|유죄|기소|구속|송치|혐의|재판|법원|지법|고법|대법원|지검|고검|대검|검찰|경찰|압수수색|입건|체포|구형|벌금|항소|상고|파기|영장/;

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
  const offices = await getJurisdictionOffices(prisma);
  const since = new Date(Date.now() - SINCE * 86400000);
  const all = await prisma.article.findMany({
    where: { publishedAt: { gte: since } },
    select: { id: true, title: true, summary: true, crimeType: true, crimeSubtype: true, publishedAt: true, originalUrl: true, resolvedUrl: true, sourceType: true, sourceName: true, primaryOfficeId: true },
  });
  const cand = all.filter((a) => a.crimeType === "공판" || HINT.test(`${a.title} ${a.summary ?? ""}`));
  console.log(`본문 보정 후보 ${cand.length}/${all.length}건`);

  let done = 0, crimeChg = 0, officeChg = 0, toTrial = 0, fromTrial = 0;
  for (let i = 0; i < cand.length; i += CONC) {
    const chunk = cand.slice(i, i + CONC);
    await Promise.all(chunk.map(async (a) => {
      done++;
      const url = a.resolvedUrl && !a.resolvedUrl.includes("news.google.com") ? a.resolvedUrl : (!a.originalUrl.includes("news.google.com") ? a.originalUrl : "");
      const body = url ? extractBody(await fetchText(url)) : "";
      const text = `${a.title} ${a.summary ?? ""} ${body}`;
      // ① 공판 판정: 제목 선고 헤드라인 OR 본문 어제/오늘 선고 (가사·미래 제외는 함수 내부)
      const fresh = isTitleVerdict(a.title) || detectFreshVerdict(text, a.publishedAt);
      const base = classifyCrime({ title: a.title, summary: a.summary ?? undefined, fullText: body || undefined, sourceType: a.sourceType, sourceName: a.sourceName } as any, { skipTitleTrial: true });
      const newType = fresh ? "공판" : base.crimeType;
      const newSub = fresh ? base.crimeType : base.crimeSubtype ?? null;
      // ② 관할: 본문의 법원·검찰청 우선. 강한 단서(검찰청 직접/법원/구·시군)면 덮어쓰기, 약한 지역폴백은 미분류일 때만.
      const offs = classifyAllOffices(text, offices);
      const data: any = {};
      if (newType !== a.crimeType || newSub !== a.crimeSubtype) { data.crimeType = newType; data.crimeSubtype = newSub; }
      if (offs[0]) {
        // 본문을 읽었으면 본문의 관할(법원·검찰청·경찰서·지역)로 덮어씀(매체명·지역폴백 오분류 교정).
        // 본문을 못 읽었으면(빈 body) 미분류일 때만 제목·요약 기준으로 채움.
        if (body) {
          if (offs[0].officeId !== a.primaryOfficeId) data.primaryOfficeId = offs[0].officeId;
        } else if (!a.primaryOfficeId) {
          data.primaryOfficeId = offs[0].officeId;
        }
      }
      if (Object.keys(data).length) {
        if (data.crimeType) { crimeChg++; if (newType === "공판" && a.crimeType !== "공판") toTrial++; if (newType !== "공판" && a.crimeType === "공판") fromTrial++; }
        if (data.primaryOfficeId) officeChg++;
        await prisma.article.update({ where: { id: a.id }, data: { ...data, bodyEnrichedAt: new Date() } });
      }
    }));
    if ((i / CONC) % 20 === 0) console.log(`  ${done}/${cand.length} · 유형변경 ${crimeChg} · 관할변경 ${officeChg}`);
  }
  console.log(`✔ 완료 — 유형변경 ${crimeChg}(→공판 ${toTrial}, 공판해제 ${fromTrial}) · 관할변경 ${officeChg}`);
  await rebuildClusters();
  console.log("클러스터 재생성 완료");
  const trial = await prisma.article.count({ where: { crimeType: "공판" } });
  console.log(`현재 공판 ${trial}건`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
