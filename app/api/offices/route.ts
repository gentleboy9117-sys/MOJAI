import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, handle } from "@/lib/api/response";
import { asArray } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TYPE_RANK: Record<string, number> = { 대검찰청: 0, 고등검찰청: 1, 지방검찰청: 2, 지청: 3 };

export async function GET(_req: NextRequest) {
  return handle(async () => {
    const offices = await prisma.prosecutionOffice.findMany();
    const mapped = offices
      .map((o) => ({
        id: o.id,
        name: o.name,
        type: o.type,
        region: o.region,
        parentId: o.parentId,
        homepageUrl: o.homepageUrl,
        jurisdictionText: o.jurisdictionText,
        policeStations: asArray(o.policeStations),
        searchKeywords: asArray(o.searchKeywords),
      }))
      .sort((a, b) => (TYPE_RANK[a.type] ?? 9) - (TYPE_RANK[b.type] ?? 9) || a.name.localeCompare(b.name, "ko"));
    return ok(mapped, { count: mapped.length });
  });
}
