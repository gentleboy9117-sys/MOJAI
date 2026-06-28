// =====================================================================
// 범죄유형별 "공개 보도량 기준 증가" 감지
//  * 주의: '범죄 발생 급증' 아님. 공개 보도량 기준 증가로만 표현.
//  * recentCount(최근24h) / baselineAvg(최근7일 일평균) >= 2 → 증가 감지
// =====================================================================
import { prisma } from "@/lib/db/prisma";

export interface TrendAlertComputed {
  crimeType: string;
  recentCount: number;
  baselineAvg: number;
  increaseRatio: number;
  severity: "info" | "watch" | "elevated";
  sampleOffices: string[];
  windowLabel: string;
}

const DAY = 86400000;

export async function computeTrendAlerts(opts: { now?: Date; threshold?: number } = {}): Promise<TrendAlertComputed[]> {
  const now = opts.now ?? new Date();
  const threshold = opts.threshold ?? 2;
  const since24 = new Date(now.getTime() - DAY);
  const since7 = new Date(now.getTime() - 7 * DAY);

  const [recent, week, offices] = await Promise.all([
    prisma.article.findMany({
      where: { publishedAt: { gte: since24, lte: now }, crimeType: { not: null } },
      select: { crimeType: true, primaryOfficeId: true },
    }),
    prisma.article.findMany({
      where: { publishedAt: { gte: since7, lte: now }, crimeType: { not: null } },
      select: { crimeType: true },
    }),
    prisma.prosecutionOffice.findMany({ select: { id: true, name: true } }),
  ]);

  const officeName = new Map(offices.map((o) => [o.id, o.name]));
  const recentByCrime = new Map<string, { count: number; offices: Map<string, number> }>();
  for (const a of recent) {
    const c = a.crimeType!;
    const g = recentByCrime.get(c) ?? { count: 0, offices: new Map() };
    g.count++;
    if (a.primaryOfficeId) g.offices.set(a.primaryOfficeId, (g.offices.get(a.primaryOfficeId) ?? 0) + 1);
    recentByCrime.set(c, g);
  }
  const weekByCrime = new Map<string, number>();
  for (const a of week) weekByCrime.set(a.crimeType!, (weekByCrime.get(a.crimeType!) ?? 0) + 1);

  const alerts: TrendAlertComputed[] = [];
  for (const [crimeType, g] of recentByCrime) {
    const weekCount = weekByCrime.get(crimeType) ?? g.count;
    const baselineAvg = Math.max(0.5, weekCount / 7);
    const increaseRatio = g.count / baselineAvg;
    if (g.count >= 2 && increaseRatio >= threshold) {
      const sampleOffices = [...g.offices.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => officeName.get(id) ?? "관할 추정")
        .filter(Boolean);
      alerts.push({
        crimeType,
        recentCount: g.count,
        baselineAvg: Number(baselineAvg.toFixed(2)),
        increaseRatio: Number(increaseRatio.toFixed(2)),
        severity: increaseRatio >= 3 ? "elevated" : "watch",
        sampleOffices,
        windowLabel: "최근 24시간 vs 7일 평균",
      });
    }
  }
  return alerts.sort((a, b) => b.increaseRatio - a.increaseRatio);
}
