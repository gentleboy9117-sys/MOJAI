// 주요 첫 화면 API 응답을 정적 스냅샷(/public/_snap)으로 저장 → CDN 즉시 제공.
//  데이터가 고정(수집 중단)이라 매 접속마다 DB를 조회할 필요가 없다.
//  실행: SNAP_BASE=<라이브URL> npx tsx scripts/gen-snapshots.ts
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { calendarRange } from "@/lib/periodRange";
import { snapName } from "@/lib/client/snap";

const BASE = process.env.SNAP_BASE || "https://steady-pudding-700503.netlify.app";
const OUT = join(process.cwd(), "public", "_snap");

const m = calendarRange("month");
const iso = (d: Date) => d.toISOString();
const enc = encodeURIComponent;

// 컴포넌트가 useApi 에 넘기는 문자열과 '정확히' 동일해야 함(원문/인코딩 형태 유지)
const URLS = [
  // 대시보드
  "/api/public-safety/dashboard/summary",
  "/api/articles?period=all&limit=300&sort=score",
  "/api/articles?crimeType=%EA%B3%B5%ED%8C%90&period=all&limit=300&sort=score",
  "/api/articles?keyword=%EC%A7%91%ED%9A%8C&period=all&limit=300&sort=score",
  // 이슈/공판 범죄유형별
  "/api/issues?period=30d",
  "/api/articles?crimeType=공판&period=all&limit=300",
  // 검찰청/지도
  "/api/offices",
  "/api/dashboard/office-heatmap?period=month",
  "/api/dashboard/office-heatmap?period=today",
  "/api/dashboard/office-heatmap?period=week",
  "/api/dashboard/office-heatmap?period=7d",
  // 공안
  "/api/public-safety/sources",
  "/api/articles?keyword=집회&period=all&limit=300&sort=score",
  "/api/articles?crimeType=선거범죄&period=all&limit=300&sort=score",
  `/api/articles?crimeType=${enc("노동/중대재해범죄")}&period=all&limit=300&sort=score`,
  // 제도/정책
  `/api/articles?crimeType=${enc("형사사법제도/정책")}&period=all&limit=300`,
  // 공보 레퍼런스
  "/api/press-releases/references",
  "/api/press-releases/style-guide",
  // 공판 모니터링(월 범위, limit 3000)
  `/api/articles?crimeType=공판&startDate=${iso(m.start)}&endDate=${iso(m.end)}&limit=3000&sort=score`,
  // 공판 검찰청별(월 범위 + 전월 동기간)
  `/api/articles?crimeType=공판&startDate=${iso(m.start)}&endDate=${iso(m.end)}&limit=3000`,
  `/api/articles?crimeType=공판&startDate=${iso(m.prevStart)}&endDate=${iso(m.prevEnd)}&limit=3000`,
  // 공안 보도(월 범위 + 전월 동기간) — 집회/선거/노동
  `/api/articles?keyword=집회&limit=3000&startDate=${iso(m.start)}&endDate=${iso(m.end)}`,
  `/api/articles?keyword=집회&limit=3000&startDate=${iso(m.prevStart)}&endDate=${iso(m.prevEnd)}`,
  `/api/articles?crimeType=선거범죄&limit=3000&startDate=${iso(m.start)}&endDate=${iso(m.end)}`,
  `/api/articles?crimeType=선거범죄&limit=3000&startDate=${iso(m.prevStart)}&endDate=${iso(m.prevEnd)}`,
  `/api/articles?crimeType=${enc("노동/중대재해범죄")}&limit=3000&startDate=${iso(m.start)}&endDate=${iso(m.end)}`,
  `/api/articles?crimeType=${enc("노동/중대재해범죄")}&limit=3000&startDate=${iso(m.prevStart)}&endDate=${iso(m.prevEnd)}`,
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const seen = new Set<string>();
  let ok = 0, fail = 0;
  const manifest: { url: string; file: string; bytes: number }[] = [];
  for (const url of URLS) {
    if (seen.has(url)) continue;
    seen.add(url);
    const file = snapName(url);
    try {
      const res = await fetch(BASE + url, { headers: { "x-user-email": "admin@example.go.kr", "x-user-role": "ADMIN" } });
      const json: any = await res.json();
      if (!json || json.ok !== true) { console.log("SKIP(비정상):", url); fail++; continue; }
      const body = JSON.stringify(json.data);
      writeFileSync(join(OUT, file), body, "utf8");
      manifest.push({ url, file, bytes: body.length });
      ok++;
      console.log(`OK ${file}  ${(body.length / 1024).toFixed(0)}KB  ${url.slice(0, 60)}`);
    } catch (e: any) {
      console.log("FAIL:", url, e.message);
      fail++;
    }
  }
  writeFileSync(join(OUT, "_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`\n완료 — 스냅샷 ${ok}개 저장, 실패 ${fail}개. 위치: public/_snap`);
}
main();
