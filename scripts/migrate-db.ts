// Neon → Supabase 데이터 이전(같은 Postgres 스키마). 두 PrismaClient로 테이블별 복사.
//  사용: SRC_URL=<neon> DEST_URL=<supabase> tsx scripts/migrate-db.ts
import { PrismaClient } from "@prisma/client";

const SRC = process.env.SRC_URL!;
const DEST = process.env.DEST_URL!;
const src = new PrismaClient({ datasources: { db: { url: SRC } } });
const dest = new PrismaClient({ datasources: { db: { url: DEST } } });

function chunk<T>(arr: T[], n: number): T[][] { const out: T[][] = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }

// FK 의존 순서
const ORDER = [
  "user", "sourceConfig", "prosecutionOffice", "issueCluster", "article", "assemblyEvent",
  "articleClassification", "articleEntity", "legalKeywordMatch", "issueTimelineEvent",
  "assemblyArticleLink", "auditLog", "report", "briefingRun", "trendAlert",
  "pressReleaseReference", "pressReleaseStylePattern", "generatedPressRelease", "pressReleaseInputFact",
  "publicSafetyBriefing", "assemblyJurisdictionCorrection", "assemblySourceStatus",
];

async function copyModel(key: string) {
  const s: any = (src as any)[key];
  const d: any = (dest as any)[key];
  if (!s || !d) { console.log(`  ${key}: (모델 없음, 건너뜀)`); return; }
  let rows: any[] = [];
  try { rows = await s.findMany(); } catch (e: any) { console.log(`  ${key}: 읽기 실패 ${String(e.message).slice(0,80)}`); return; }
  if (!rows.length) { console.log(`  ${key}: 0건`); return; }

  // ProsecutionOffice: 자기참조(parentId) → 1차 null로 삽입, 2차 update
  if (key === "prosecutionOffice") {
    for (const c of chunk(rows.map((r) => ({ ...r, parentId: null })), 500)) await d.createMany({ data: c, skipDuplicates: true });
    let upd = 0;
    for (const r of rows) if (r.parentId) { await d.update({ where: { id: r.id }, data: { parentId: r.parentId } }).catch(() => {}); upd++; }
    console.log(`  ${key}: ${rows.length}건(부모연결 ${upd})`);
    return;
  }
  let n = 0;
  for (const c of chunk(rows, 500)) { const res = await d.createMany({ data: c, skipDuplicates: true }); n += res.count ?? 0; }
  console.log(`  ${key}: ${n}/${rows.length}건`);
}

async function main() {
  console.log("Neon → Supabase 이전 시작");
  for (const key of ORDER) await copyModel(key);
  console.log("✔ 이전 완료");
  await src.$disconnect(); await dest.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
