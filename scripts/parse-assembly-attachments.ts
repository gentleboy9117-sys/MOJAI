// [공안] 집회 공개자료 첨부(HWP/PDF) 파싱 — stub(향후 작업).
//        사용: tsx scripts/parse-assembly-attachments.ts
//  * 서울경찰청 등 공개 게시판은 HWP/PDF 첨부가 많다. HWP 파싱은 별도 라이브러리 필요.
//  * PDF 는 pdftotext(설치 시) best-effort. 본 MVP 에서는 안내만 출력한다.
//  * 추출 텍스트도 '공개 일정 정보' 범위로만 활용하며, 참가자 식별/성향 추론 금지.
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "@/lib/db/prisma";
import { asArray } from "@/lib/utils";

const pexec = promisify(execFile);

async function pdfToTextBestEffort(url: string): Promise<string | null> {
  // 원격 PDF 직접 파싱은 SSRF/저작권 고려가 필요하므로 MVP 에서는 시도하지 않는다.
  // 로컬 파일 경로가 주어진 경우에만 pdftotext 를 best-effort 로 시도한다.
  if (!/^\/.+\.pdf$/i.test(url)) return null;
  try {
    const { stdout } = await pexec("pdftotext", [url, "-"]);
    return stdout?.slice(0, 4000) || null;
  } catch (e) {
    console.warn("  · pdftotext 사용 불가/실패:", (e as Error)?.message);
    return null;
  }
}

async function main() {
  console.log("▶ 집회 첨부 파싱 — MVP stub");
  console.log(
    "  · HWP 파싱은 향후 작업입니다(전용 파서 필요). PDF 는 로컬 파일에 한해 pdftotext best-effort 만 지원합니다.",
  );

  const events = await prisma.assemblyEvent.findMany({
    select: { id: true, title: true, attachmentUrls: true },
    take: 200,
  });
  let withAttachments = 0;
  for (const e of events) {
    const urls = asArray<string>(e.attachmentUrls);
    if (urls.length === 0) continue;
    withAttachments++;
    for (const u of urls) {
      const text = await pdfToTextBestEffort(u);
      console.log(
        `  · [${e.id}] ${e.title} → 첨부 ${u} : ${text ? `텍스트 ${text.length}자(추출, 미저장)` : "파싱 미지원/스킵"}`,
      );
    }
  }
  console.log(
    `✔ 완료 — 첨부 보유 일정 ${withAttachments}건. (추출 텍스트 저장/활용은 향후 작업, 공개 범위 한정)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
