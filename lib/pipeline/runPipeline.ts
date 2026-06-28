// =====================================================================
// 재사용 파이프라인 — API 라우트/스크립트/일일 브리핑 공용
//   reclassifyArticle / rebuildClusters / persistTrendAlerts
// =====================================================================
import { prisma } from "@/lib/db/prisma";
import { asArray } from "@/lib/utils";
import { classifyArticle, classifyArticleWithLlm } from "@/lib/classifiers";
import type { OfficeLite, ClassifyInput } from "@/lib/classifiers/types";
import { detectHighImpact } from "@/lib/classifiers/keyword-rules";
import { getLlmProvider } from "@/lib/providers/llm";
import { clusterArticles, type ClusterArticleInput } from "@/lib/clustering/issueClusterer";
import { scoreIssue } from "@/lib/scoring/issueScorer";
import { detectSpread } from "@/lib/scoring/spreadDetector";
import { buildTimeline } from "@/lib/timeline/timelineExtractor";
import { computeTrendAlerts } from "@/lib/dashboard/trendAlerts";

const HOUR = 3600000;

export async function getOfficeLites(): Promise<OfficeLite[]> {
  const offices = await prisma.prosecutionOffice.findMany();
  return offices.map((o) => ({
    id: o.id, name: o.name, type: o.type, region: o.region,
    searchKeywords: asArray(o.searchKeywords), policeStations: asArray(o.policeStations),
  }));
}

/** 단건 재분류(키워드 + 선택 LLM). 분류 결과/근거를 갱신한다. */
export async function reclassifyArticle(articleId: string, offices?: OfficeLite[], useLlm = false) {
  const a = await prisma.article.findUnique({ where: { id: articleId } });
  if (!a) throw new Error("기사를 찾을 수 없습니다.");
  const off = offices ?? (await getOfficeLites());
  const input: ClassifyInput = { title: a.title, fullText: a.fullText, summary: a.summary, sourceType: a.sourceType, sourceName: a.sourceName };
  const r = useLlm ? await classifyArticleWithLlm(input, off, getLlmProvider()) : classifyArticle(input, off);
  const primary = r.primaryOffice;

  await prisma.articleClassification.deleteMany({ where: { articleId, method: { not: "human" } } });
  await prisma.article.update({
    where: { id: articleId },
    data: {
      primaryOfficeId: primary?.officeId ?? null, primaryRegion: r.region ?? null,
      crimeType: r.crime.crimeType, crimeSubtype: r.crime.crimeSubtype ?? null,
      classifyConfidence: r.crime.confidence, officeConfidence: primary?.confidence ?? null,
      officeMatchType: primary?.matchType ?? null,
      needsHumanReview: r.needsHumanReview, reviewReasons: JSON.stringify(r.reviewReasons),
      keywords: JSON.stringify(r.keywords),
    },
  });
  for (const [i, o] of r.offices.slice(0, 3).entries()) {
    await prisma.articleClassification.create({
      data: {
        articleId, prosecutionOfficeId: o.officeId, crimeType: r.crime.crimeType, crimeSubtype: r.crime.crimeSubtype ?? null,
        confidence: o.confidence, reason: o.reason, officeMatchType: o.matchType,
        evidenceKeywords: JSON.stringify(r.crime.evidenceKeywords), method: useLlm ? "llm" : "keyword", isPrimary: i === 0,
        needsHumanReview: r.needsHumanReview, reviewReason: r.reviewReasons.join("; ") || null,
      },
    });
  }
  return r;
}

/** 전체 기사 기준 이슈 클러스터 재구성(스코어링/확산/타임라인 포함) */
export async function rebuildClusters(now = new Date()): Promise<number> {
  const articles = await prisma.article.findMany({ include: { entities: { select: { entityText: true } } } });
  const offices = await prisma.prosecutionOffice.findMany({ select: { id: true, name: true } });
  const nameById = new Map(offices.map((o) => [o.id, o.name]));

  const inputs: ClusterArticleInput[] = articles.map((a) => ({
    id: a.id, title: a.title, keywords: asArray(a.keywords),
    primaryOfficeId: a.primaryOfficeId, primaryOfficeName: a.primaryOfficeId ? nameById.get(a.primaryOfficeId) ?? null : null,
    crimeType: a.crimeType, region: a.primaryRegion, entities: a.entities.map((e) => e.entityText),
    sourceName: a.sourceName, sourceType: a.sourceType, summary: a.summary, publishedAt: a.publishedAt,
  }));
  const metaById = new Map(articles.map((a) => [a.id, {
    highImpact: detectHighImpact({ title: a.title, fullText: a.fullText, summary: a.summary }),
    directMention: a.officeMatchType === "DIRECT_MENTION",
  }]));

  await prisma.issueTimelineEvent.deleteMany();
  await prisma.issueCluster.deleteMany();

  // 범죄유형별로 분리해 클러스터링 → 한 클러스터에 여러 범죄유형이 섞이지 않음
  //  (이슈 모니터링 '범죄유형별 보기'의 기사 집합 = 공안 모니터링 보도 탭의 기사 집합 일치)
  const byCrime = new Map<string, ClusterArticleInput[]>();
  for (const inp of inputs) {
    const k = inp.crimeType || "기타";
    if (!byCrime.has(k)) byCrime.set(k, []);
    byCrime.get(k)!.push(inp);
  }
  const clusters = [...byCrime.values()].flatMap((group) =>
    clusterArticles(group, { threshold: 0.45, windowDays: 14, now }),
  );
  for (const c of clusters) {
    const highImpact = Array.from(new Set(c.articleIds.flatMap((id) => metaById.get(id)?.highImpact ?? [])));
    const directMention = c.articleIds.some((id) => metaById.get(id)?.directMention);
    const score = scoreIssue({
      articleCount: c.articleCount, sourceCount: c.sourceCount, recent24hCount: c.recent24hCount,
      hasOfficialPress: c.hasOfficialPress, hasMediaCoverage: c.hasMediaCoverage, crossOffice: c.crossOffice,
      highImpactGroups: highImpact, directOfficeMention: directMention,
    });
    const spread = detectSpread({
      articleCount: c.articleCount, sourceCount: c.sourceCount,
      hoursSinceFirst: (now.getTime() - c.firstPublishedAt.getTime()) / HOUR,
      recent24hCount: c.recent24hCount, hasOfficialPress: c.hasOfficialPress,
    });
    const cluster = await prisma.issueCluster.create({
      data: {
        title: c.title, representativeArticleId: c.representativeArticleId, summary: c.summary ?? null,
        mainOfficeId: c.mainOfficeId ?? null, mainOfficeName: c.mainOfficeName ?? null,
        mainCrimeType: c.mainCrimeType ?? null, mainRegion: c.mainRegion ?? null,
        issueScore: score.issueScore, issueLevel: score.issueLevel, scoreReasons: JSON.stringify(score.scoreReasons),
        spreadStatus: spread, firstPublishedAt: c.firstPublishedAt, lastPublishedAt: c.lastPublishedAt,
        articleCount: c.articleCount, sourceCount: c.sourceCount, recent24hCount: c.recent24hCount,
        hasOfficialPress: c.hasOfficialPress, hasMediaCoverage: c.hasMediaCoverage, crossOffice: c.crossOffice, signature: c.signature,
      },
    });
    await prisma.article.updateMany({ where: { id: { in: c.articleIds } }, data: { issueClusterId: cluster.id, issueScore: score.issueScore, issueLevel: score.issueLevel } });
    const members = inputs.filter((x) => c.articleIds.includes(x.id));
    const timeline = buildTimeline(members.map((m) => ({ id: m.id, title: m.title, summary: m.summary, publishedAt: m.publishedAt, sourceType: m.sourceType })));
    if (timeline.length) {
      await prisma.issueTimelineEvent.createMany({ data: timeline.map((t) => ({ issueClusterId: cluster.id, articleId: t.articleId, eventDate: t.eventDate, eventTitle: t.eventTitle, eventSummary: t.eventSummary, sourceType: t.sourceType, confidence: t.confidence })) });
    }
  }
  return clusters.length;
}

export async function persistTrendAlerts(now = new Date()): Promise<number> {
  const alerts = await computeTrendAlerts({ now });
  await prisma.trendAlert.deleteMany();
  for (const a of alerts) {
    await prisma.trendAlert.create({ data: { crimeType: a.crimeType, recentCount: a.recentCount, baselineAvg: a.baselineAvg, increaseRatio: a.increaseRatio, severity: a.severity, sampleOffices: JSON.stringify(a.sampleOffices), windowLabel: a.windowLabel } });
  }
  return alerts.length;
}
