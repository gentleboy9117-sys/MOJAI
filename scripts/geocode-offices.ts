// 검찰청 명칭 → 카카오 지오코딩으로 실제 위경도 생성 → public/geo/office-coords.json
//  실행: KAKAO_ADMIN_KEY=... tsx scripts/geocode-offices.ts
import "dotenv/config";
import { writeFileSync } from "fs";
import { prisma } from "@/lib/db/prisma";

const KEY = process.env.KAKAO_ADMIN_KEY || process.env.KAKAO_REST_KEY;

async function geocode(q: string): Promise<[number, number] | null> {
  try {
    const u = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}`;
    const r = await fetch(u, { headers: { Authorization: `KakaoAK ${KEY}` } });
    if (!r.ok) return null;
    const j: any = await r.json();
    const d = j.documents?.[0];
    if (!d) return null;
    return [Number(d.x), Number(d.y)]; // [lng, lat]
  } catch { return null; }
}

async function main() {
  if (!KEY) throw new Error("KAKAO_ADMIN_KEY 환경변수가 필요합니다.");
  const offices = await prisma.prosecutionOffice.findMany({ select: { name: true, type: true } });
  const out: Record<string, [number, number]> = {};
  let ok = 0, fail = 0;
  for (const o of offices) {
    let coord = await geocode(o.name);
    if (!coord && o.name.endsWith("지청")) coord = await geocode(`검찰청 ${o.name}`);
    if (!coord) coord = await geocode(`${o.name} 검찰청`);
    if (coord) { out[o.name] = coord; ok++; } else { fail++; console.log("  실패:", o.name); }
    await new Promise((r) => setTimeout(r, 60));
  }
  writeFileSync("public/geo/office-coords.json", JSON.stringify(out), "utf8");
  console.log(`✔ ${ok}건 좌표 생성 · 실패 ${fail} → public/geo/office-coords.json`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
