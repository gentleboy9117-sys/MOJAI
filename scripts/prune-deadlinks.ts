// 원문 링크가 실제로 연결되지 않는 기사 삭제(접속 불가/404 등). 정상(2xx/3xx)·차단가능(403)·일시오류(5xx)는 보존.
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { rebuildClusters } from "@/lib/pipeline/runPipeline";

const CONC = Number(process.env.BF_CONC || 12);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
// 삭제 대상 상태코드(명백히 없는 문서). 403/429/5xx(차단·일시) 는 보존.
const DEAD_STATUS = new Set([400, 404, 410, 451]);

async function isDead(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ko" }, redirect: "follow", signal: ctrl.signal });
    return DEAD_STATUS.has(r.status);
  } catch (e: any) {
    const code = e?.cause?.code || e?.name || "";
    // DNS 없음/연결거부 = 죽은 링크. 타임아웃(AbortError)은 느린 사이트일 수 있어 보존.
    return code === "ENOTFOUND" || code === "ECONNREFUSED" || code === "ECONNRESET" || code === "EAI_AGAIN" || code === "UND_ERR_CONNECT_TIMEOUT";
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const arts = await prisma.article.findMany({ select: { id: true, originalUrl: true, resolvedUrl: true } });
  console.log(`링크 점검 대상 ${arts.length}건`);
  const deadIds: string[] = [];
  let done = 0;
  for (let i = 0; i < arts.length; i += CONC) {
    const chunk = arts.slice(i, i + CONC);
    await Promise.all(chunk.map(async (a) => {
      done++;
      const url = a.resolvedUrl || a.originalUrl;
      if (!url || !/^https?:\/\//.test(url)) { deadIds.push(a.id); return; }
      if (await isDead(url)) deadIds.push(a.id);
    }));
    if ((i / CONC) % 20 === 0) console.log(`  ${done}/${arts.length} · 죽은링크 ${deadIds.length}`);
  }
  console.log(`삭제 대상 죽은 링크 ${deadIds.length}건`);
  if (deadIds.length) {
    await prisma.articleClassification.deleteMany({ where: { articleId: { in: deadIds } } }).catch(() => {});
    await prisma.assemblyArticleLink.deleteMany({ where: { articleId: { in: deadIds } } }).catch(() => {});
    const r = await prisma.article.deleteMany({ where: { id: { in: deadIds } } });
    console.log(`삭제 완료: ${r.count}`);
    await rebuildClusters();
    console.log("클러스터 재생성 완료");
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
