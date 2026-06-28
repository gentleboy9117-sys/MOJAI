// 대검 검찰발표자료 레퍼런스 수집(Firecrawl). 미설정 시 샘플 폴백.
//   환경: FIRECRAWL_API_KEY, SPO_PRESS_RELEASE_LIST_URL, PRESS_RELEASE_REFERENCE_LIMIT
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { getPressReleaseProvider, SpoPressReleaseProvider } from "@/lib/providers/pressRelease/SpoPressReleaseProvider";

async function main() {
  const limit = Number(process.env.PRESS_RELEASE_REFERENCE_LIMIT || 50);
  let refs = await getPressReleaseProvider().collectList(limit).catch(() => []);
  let fallback = false;
  if (!refs.length) {
    refs = await new SpoPressReleaseProvider().loadSampleReferences();
    fallback = true;
  }
  let saved = 0;
  for (const r of refs.slice(0, limit)) {
    if (!r.contentHash) continue;
    await prisma.pressReleaseReference.upsert({
      where: { contentHash: r.contentHash },
      update: { title: r.title, officeName: r.officeName ?? null, plainText: r.plainText ?? null },
      create: {
        title: r.title, officeName: r.officeName ?? null, publishedAt: r.publishedAt ?? null, sourceUrl: r.sourceUrl,
        listPageUrl: r.listPageUrl ?? null, viewCount: r.viewCount ?? null, markdownContent: r.markdownContent ?? null, plainText: r.plainText ?? null,
        attachmentUrls: r.attachmentUrls ? JSON.stringify(r.attachmentUrls) : null, attachmentTypes: r.attachmentTypes ? JSON.stringify(r.attachmentTypes) : null,
        contentHash: r.contentHash,
      },
    });
    saved++;
  }
  console.log(`✔ 검찰발표자료 레퍼런스 ${saved}건 저장 (${fallback ? "샘플 폴백 — FIRECRAWL_API_KEY 미설정" : "Firecrawl 수집"})`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
