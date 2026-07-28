import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const terms = ["유류분", "상속", "패륜", "한정승인", "구하라법", "상속재산"];
  const seen = new Set<string>();
  for (const term of terms) {
    const arts = await p.article.findMany({
      where: { title: { contains: term } },
      select: {
        id: true, title: true, summary: true,
        crimeType: true, crimeSubtype: true, classifyConfidence: true,
        publishedAt: true, sourceName: true, primaryRegion: true,
        url: true, needsHumanReview: true, reviewReasons: true,
      },
      orderBy: { publishedAt: "desc" },
    });
    console.log(`\n########## TERM="${term}" count=${arts.length}`);
    for (const a of arts) {
      const dup = seen.has(a.id) ? " (dup-listed)" : "";
      seen.add(a.id);
      console.log("-----------------------------------------" + dup);
      console.log("id:", a.id);
      console.log("title:", a.title);
      console.log("crime:", a.crimeType, "/", a.crimeSubtype, "conf:", a.classifyConfidence);
      console.log("region:", a.primaryRegion, "| src:", a.sourceName, "| pub:", a.publishedAt);
      console.log("url:", a.url);
      console.log("summary:", JSON.stringify((a.summary || "").slice(0, 600)));
      console.log("reviewReasons:", a.reviewReasons);
    }
  }

  // 관할(office) 연결 확인
  console.log("\n\n########## OFFICE LINKS for matched articles");
  for (const id of Array.from(seen)) {
    const a = await p.article.findUnique({
      where: { id },
      select: { title: true, offices: { select: { office: { select: { name: true, type: true } }, isPrimary: true } } },
    });
    console.log("--", a?.title);
    console.log("   offices:", JSON.stringify(a?.offices?.map((o: any) => ({ n: o.office?.name, t: o.office?.type, p: o.isPrimary }))));
  }
}
main().catch((e) => console.error("ERR", e)).finally(() => p.$disconnect());
