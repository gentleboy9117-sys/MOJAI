import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, handle } from "@/lib/api/response";
import { asArray } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY = 86400000;

// 공개 집회·시위 일정 목록 (필터: period / officeId / district / needsReview)
export async function GET(req: NextRequest) {
  return handle(async () => {
    const sp = req.nextUrl.searchParams;
    const period = sp.get("period") || "7d";
    const officeId = sp.get("officeId") || undefined;
    const district = sp.get("district") || undefined;
    const needsReview = sp.get("needsReview");
    const limit = Math.min(300, Number(sp.get("limit") || 200));

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const where: any = {};
    const dateParam = sp.get("date");
    if (dateParam) {
      const [y, m, d] = dateParam.split("-").map(Number);
      const s = new Date(y, m - 1, d);
      where.eventDate = { gte: s, lt: new Date(s.getTime() + DAY) };
    } else if (period === "today") {
      where.eventDate = { gte: startOfToday, lt: new Date(startOfToday.getTime() + DAY) };
    } else if (period === "tomorrow") {
      where.eventDate = {
        gte: new Date(startOfToday.getTime() + DAY),
        lt: new Date(startOfToday.getTime() + 2 * DAY),
      };
    } else if (period === "7d") {
      where.eventDate = { gte: startOfToday, lt: new Date(startOfToday.getTime() + 7 * DAY) };
    } else if (period === "30d") {
      where.eventDate = { gte: startOfToday, lt: new Date(startOfToday.getTime() + 30 * DAY) };
    } else if (period === "upcoming") {
      where.eventDate = { gte: startOfToday };
    }
    if (officeId) where.prosecutionOfficeId = officeId;
    if (district) where.district = district;
    if (needsReview === "true") where.needsHumanReview = true;

    const events = await prisma.assemblyEvent.findMany({
      where,
      orderBy: { eventDate: "asc" },
      take: limit,
      include: { articleLinks: { select: { id: true, hasLegalIssueMention: true } } },
    });

    const list = events.map((e) => ({
      id: e.id,
      eventDate: e.eventDate,
      startTime: e.startTime,
      endTime: e.endTime,
      title: e.title,
      locationName: e.locationName,
      district: e.district,
      organizerName: e.organizerName,
      expectedParticipants: e.expectedParticipants,
      prosecutionOfficeId: e.prosecutionOfficeId,
      prosecutionOfficeName: e.prosecutionOfficeName,
      jurisdictionConfidence: e.jurisdictionConfidence,
      jurisdictionMethod: e.jurisdictionMethod,
      needsHumanReview: e.needsHumanReview,
      relatedReportCount: e.articleLinks.length,
      legalIssueMention: e.articleLinks.some((l) => l.hasLegalIssueMention),
      attachmentUrls: asArray<string>(e.attachmentUrls),
    }));

    return ok(list, { count: list.length });
  });
}
