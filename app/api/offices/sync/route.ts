import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { ok, fail, handle, ERROR } from "@/lib/api/response";
import { getRequestContext } from "@/lib/api/context";
import { writeAudit, AUDIT_ACTIONS } from "@/lib/security/audit";
import { can } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// MVP: seed-offices.json 기준 동기화. 운영: 대검 공식 페이지(전국검찰청찾기) 크롤링으로 교체.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const ctx = await getRequestContext(req);
    if (!can.manageSources(ctx.user.role)) return fail(...ERROR.FORBIDDEN);

    const offices = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/seed-offices.json"), "utf-8")).offices as any[];
    for (const o of offices) {
      const data = {
        type: o.type, region: o.region, homepageUrl: o.homepageUrl ?? null,
        jurisdictionText: o.jurisdictionText ?? null,
        policeStations: o.policeStations ? JSON.stringify(o.policeStations) : null,
        searchKeywords: o.searchKeywords ? JSON.stringify(o.searchKeywords) : null,
      };
      await prisma.prosecutionOffice.upsert({ where: { name: o.name }, update: data, create: { name: o.name, ...data } });
    }
    const all = await prisma.prosecutionOffice.findMany({ select: { id: true, name: true } });
    const idByName = new Map(all.map((o) => [o.name, o.id]));
    for (const o of offices) {
      if (o.parentName && idByName.has(o.parentName)) {
        await prisma.prosecutionOffice.update({ where: { name: o.name }, data: { parentId: idByName.get(o.parentName)! } });
      }
    }
    await writeAudit({ userId: ctx.user.id, action: AUDIT_ACTIONS.SYNC_OFFICES, metadata: { synced: offices.length }, ipAddress: ctx.ip });
    return ok({ synced: offices.length, note: "seed-offices.json 기준(MVP). 운영 시 대검 공식 페이지 크롤링으로 교체." });
  });
}
