// 네이버 뉴스 검색 API로 검찰·공안·범죄 관련 기사 대량 수집 (원문 URL 저장 → 링크 정상)
//  사용: tsx scripts/collect-naver.ts   (BF_PAGES=페이지수, CUTOFF=YYYY-MM-DD)
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { classifyArticle, contentHashOf } from "@/lib/classifiers";
import { getOfficeLites, rebuildClusters } from "@/lib/pipeline/runPipeline";
import { isPhotoOnlyTitle, isForeignTopic, isOpinionColumn, isCelebGossip, isNonLegalNoise } from "@/lib/collect/filters";

const ID = process.env.NAVER_CLIENT_ID;
const SECRET = process.env.NAVER_CLIENT_SECRET;
const PAGES = Number(process.env.BF_PAGES || 5); // 키워드당 페이지(×100건)
const CUTOFF = (() => { const s = process.env.CUTOFF || "2026-06-20"; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); })();

const KEYWORDS = [
  "검찰", "검찰 수사", "검찰 기소", "검찰 구속", "검찰 송치", "검찰 불기소", "검찰 압수수색", "검찰 구형",
  "특검", "공수처", "검찰개혁", "공소청",
  "집회", "시위", "집회 신고", "재선거", "부정선거",
  "법원 선고", "법원 판결", "징역 선고", "집행유예", "법원 구속영장",
  "마약", "보이스피싱", "전세사기", "뇌물", "횡령", "배임", "공정거래위원회",
  "노동조합 파업", "중대재해", "임금체불", "성범죄 기소", "음주운전",
];

function strip(s: string): string {
  return (s || "").replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
}
function host(u: string): string { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "naver"; } }

async function main() {
  if (!ID || !SECRET) { console.error("NAVER_CLIENT_ID/SECRET 필요"); process.exit(1); }
  const offices = await getOfficeLites();
  let saved = 0, seen = 0, skipped = 0;
  for (const q of KEYWORDS) {
    for (let p = 0; p < PAGES; p++) {
      const start = p * 100 + 1;
      if (start > 1000) break;
      let json: any;
      try {
        const res = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(q)}&display=100&start=${start}&sort=date`,
          { headers: { "X-Naver-Client-Id": ID, "X-Naver-Client-Secret": SECRET } });
        if (!res.ok) break;
        json = await res.json();
      } catch { break; }
      const items: any[] = json.items ?? [];
      if (!items.length) break;
      for (const it of items) {
        seen++;
        const url = (it.originallink || it.link || "").trim();
        if (!url) continue;
        const publishedAt = it.pubDate ? new Date(it.pubDate) : new Date();
        if (publishedAt < CUTOFF) { skipped++; continue; }
        const title = strip(it.title);
        const summary = strip(it.description);
        if (isPhotoOnlyTitle(title)) { skipped++; continue; } // 사진/화보 기사 제외
        if (isOpinionColumn(title)) { skipped++; continue; } // 칼럼·오피니언·연재물 제외
        if (isCelebGossip(title, summary)) { skipped++; continue; } // 연예 가십(법률 맥락 없음) 제외
        if (isNonLegalNoise(title, summary)) { skipped++; continue; } // 형사사법 무관(정치·경제·스포츠) 제외
        if (isForeignTopic(title, summary)) { skipped++; continue; } // 해외토픽(외국인·외국 사건) 제외
        const hash = contentHashOf(title, url);
        if (await prisma.article.findUnique({ where: { contentHash: hash }, select: { id: true } })) continue;
        const r = classifyArticle({ title, summary, sourceType: "LICENSED_NEWS", sourceName: host(url) }, offices);
        await prisma.article.create({
          data: {
            title, sourceName: host(url), publishedAt, originalUrl: url, resolvedUrl: url,
            summary, fullText: null, licenseType: "LICENSED_API", sourceType: "LICENSED_NEWS",
            canStoreFullText: false, canDisplayFullText: false,
            copyrightNotice: "네이버 뉴스 검색 API — 제목·요약·원문 링크",
            primaryOfficeId: r.primaryOffice?.officeId ?? null, primaryRegion: r.region ?? null,
            crimeType: r.crime.crimeType, crimeSubtype: r.crime.crimeSubtype ?? null, classifyConfidence: r.crime.confidence,
            officeConfidence: r.primaryOffice?.confidence ?? null, officeMatchType: r.primaryOffice?.matchType ?? null,
            needsHumanReview: r.needsHumanReview, reviewReasons: JSON.stringify(r.reviewReasons), keywords: JSON.stringify(r.keywords), contentHash: hash,
          },
        });
        saved++;
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    console.log(`  q='${q}' 누적 신규 ${saved} (조회 ${seen}, 기간외 ${skipped})`);
  }
  if (saved) await rebuildClusters();
  console.log(`✔ 네이버 수집 완료 — 신규 ${saved} · 조회 ${seen} · 기간외 ${skipped}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
