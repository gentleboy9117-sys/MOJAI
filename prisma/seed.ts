// =====================================================================
// seed.ts — 전체 분석 파이프라인을 실행해 데모 데이터를 적재한다.
//   offices → users → sources → articles(분류/엔티티/법령) → 클러스터링
//   → 스코어링/확산 → 타임라인 → 보도량 증가감지 → 브리핑런 → (보도자료 레퍼런스)
// =====================================================================
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { classifyArticle, contentHashOf } from "@/lib/classifiers";
import type { OfficeLite } from "@/lib/classifiers/types";
import { extractEntities } from "@/lib/entities/entityExtractor";
import { matchLegalKeywords } from "@/lib/legal/legalKeywordMatcher";
import { clusterArticles, type ClusterArticleInput } from "@/lib/clustering/issueClusterer";
import { scoreIssue } from "@/lib/scoring/issueScorer";
import { detectSpread } from "@/lib/scoring/spreadDetector";
import { buildTimeline } from "@/lib/timeline/timelineExtractor";
import { computeTrendAlerts } from "@/lib/dashboard/trendAlerts";
import { asArray } from "@/lib/utils";

const DAY = 86400000;
const HOUR = 3600000;
const now = new Date();

function readJson(rel: string): any {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), "utf-8"));
}

async function seedUsers() {
  const users = [
    { email: "admin@example.go.kr", name: "관리자(데모)", role: "ADMIN" },
    { email: "analyst@example.go.kr", name: "분석관(데모)", role: "ANALYST" },
    { email: "viewer@example.go.kr", name: "일반 사용자(데모)", role: "VIEWER" },
  ];
  for (const u of users) {
    await prisma.user.upsert({ where: { email: u.email }, update: { name: u.name, role: u.role }, create: u });
  }
  console.log(`  · 사용자 ${users.length}명`);
}

async function seedOffices(): Promise<OfficeLite[]> {
  const offices = readJson("data/seed-offices.json").offices as any[];
  for (const o of offices) {
    const data = {
      type: o.type, region: o.region,
      homepageUrl: o.homepageUrl ?? null,
      address: o.address ?? null, phone: o.phone ?? null,
      jurisdictionText: o.jurisdictionText ?? null,
      policeStations: o.policeStations ? JSON.stringify(o.policeStations) : null,
      searchKeywords: o.searchKeywords ? JSON.stringify(o.searchKeywords) : null,
    };
    await prisma.prosecutionOffice.upsert({ where: { name: o.name }, update: data, create: { name: o.name, ...data } });
  }
  const all = await prisma.prosecutionOffice.findMany();
  const idByName = new Map(all.map((o) => [o.name, o.id]));
  for (const o of offices) {
    if (o.parentName && idByName.has(o.parentName)) {
      await prisma.prosecutionOffice.update({ where: { name: o.name }, data: { parentId: idByName.get(o.parentName)! } });
    }
  }
  console.log(`  · 검찰청 ${offices.length}곳`);
  return all.map((o) => ({
    id: o.id, name: o.name, type: o.type, region: o.region,
    searchKeywords: asArray(o.searchKeywords), policeStations: asArray(o.policeStations),
  }));
}

async function seedSources() {
  if ((await prisma.sourceConfig.count()) > 0) return;
  await prisma.sourceConfig.createMany({
    data: [
      { name: "검찰청 공식 보도자료", providerType: "PUBLIC_PRESS_RELEASE", sourceType: "OFFICIAL_PRESS", baseUrl: "https://www.spo.go.kr", licenseType: "PUBLIC_PRESS", canStoreFullText: true, canDisplayFullText: true, isEnabled: true },
      { name: "법무부 보도자료", providerType: "PUBLIC_PRESS_RELEASE", sourceType: "OFFICIAL_PRESS", baseUrl: "https://www.moj.go.kr", licenseType: "PUBLIC_PRESS", canStoreFullText: true, canDisplayFullText: true, isEnabled: true },
      { name: "라이선스 뉴스 API(mock)", providerType: "LICENSED_NEWS", sourceType: "LICENSED_NEWS", licenseType: "LICENSED_API", canStoreFullText: false, canDisplayFullText: false, isEnabled: false, notes: "라이선스 키 연결 시 원문 표시 가능" },
      { name: "대검 검찰발표자료(Firecrawl 레퍼런스)", providerType: "FIRECRAWL_SPO", sourceType: "OFFICIAL_PRESS", baseUrl: "https://www.spo.go.kr/site/spo/ex/board/List.do?cbIdx=1403", licenseType: "PUBLIC_PRESS", canStoreFullText: true, canDisplayFullText: true, isEnabled: true, notes: "보도자료 초안 스타일 레퍼런스용" },
    ],
  });
  console.log("  · 수집원 설정 4건");
}

async function wipeDemo() {
  await prisma.issueTimelineEvent.deleteMany();
  await prisma.articleEntity.deleteMany();
  await prisma.legalKeywordMatch.deleteMany();
  await prisma.articleClassification.deleteMany();
  await prisma.article.deleteMany();
  await prisma.issueCluster.deleteMany();
  await prisma.trendAlert.deleteMany();
  await prisma.briefingRun.deleteMany();
}

async function seedArticles(offices: OfficeLite[]) {
  const articles = readJson("data/sample-articles.json").articles as any[];
  const clusterInputs: ClusterArticleInput[] = [];
  const meta = new Map<string, { highImpact: string[]; directMention: boolean }>();

  for (const a of articles) {
    const publishedAt = new Date(now.getTime() - (a.daysAgo ?? 0) * DAY - (a.hoursAgo ?? 0) * HOUR);
    const input = { title: a.title, fullText: a.fullText, summary: a.summary, sourceType: a.sourceType, sourceName: a.sourceName };
    const r = classifyArticle(input, offices);
    const primary = r.primaryOffice;

    const article = await prisma.article.create({
      data: {
        title: a.title, sourceName: a.sourceName, publishedAt, originalUrl: a.originalUrl,
        fullText: a.canStoreFullText ? a.fullText ?? null : null, // 저장 권한 없으면 본문 미저장
        summary: a.summary ?? null,
        licenseType: a.licenseType, sourceType: a.sourceType,
        canStoreFullText: a.canStoreFullText, canDisplayFullText: a.canDisplayFullText,
        copyrightNotice: a.copyrightNotice ?? null,
        primaryOfficeId: primary?.officeId ?? null, primaryRegion: r.region ?? null,
        crimeType: r.crime.crimeType, crimeSubtype: r.crime.crimeSubtype ?? null,
        classifyConfidence: r.crime.confidence, officeConfidence: primary?.confidence ?? null,
        officeMatchType: primary?.matchType ?? null,
        needsHumanReview: r.needsHumanReview, reviewReasons: JSON.stringify(r.reviewReasons),
        keywords: JSON.stringify(r.keywords), contentHash: contentHashOf(a.title, a.originalUrl),
      },
    });

    for (const [i, o] of r.offices.slice(0, 3).entries()) {
      await prisma.articleClassification.create({
        data: {
          articleId: article.id, prosecutionOfficeId: o.officeId,
          crimeType: r.crime.crimeType, crimeSubtype: r.crime.crimeSubtype ?? null,
          confidence: o.confidence, reason: o.reason, officeMatchType: o.matchType,
          evidenceKeywords: JSON.stringify(r.crime.evidenceKeywords),
          method: "keyword", isPrimary: i === 0,
          needsHumanReview: r.needsHumanReview, reviewReason: r.reviewReasons.join("; ") || null,
        },
      });
    }

    const text = `${a.canStoreFullText ? a.fullText ?? "" : ""} ${a.summary ?? ""} ${a.title}`;
    const ents = extractEntities(text);
    if (ents.length) {
      await prisma.articleEntity.createMany({
        data: ents.map((e) => ({ articleId: article.id, entityType: e.entityType, entityText: e.entityText, normalizedText: e.normalizedText ?? null, confidence: e.confidence })),
      });
    }
    const legals = matchLegalKeywords(text, r.crime.crimeType);
    if (legals.length) {
      await prisma.legalKeywordMatch.createMany({
        data: legals.map((l) => ({ articleId: article.id, keyword: l.keyword, category: l.category, confidence: l.confidence, evidenceText: l.evidenceText ?? null })),
      });
    }

    meta.set(article.id, { highImpact: r.highImpact, directMention: primary?.matchType === "DIRECT_MENTION" });
    clusterInputs.push({
      id: article.id, title: a.title, keywords: r.keywords,
      primaryOfficeId: primary?.officeId ?? null, primaryOfficeName: primary?.officeName ?? null,
      crimeType: r.crime.crimeType, region: r.region ?? null, entities: ents.map((e) => e.entityText),
      sourceName: a.sourceName, sourceType: a.sourceType, summary: a.summary ?? null, publishedAt,
    });
  }
  console.log(`  · 기사 ${articles.length}건 (분류·엔티티·법령 키워드 포함)`);
  return { clusterInputs, meta };
}

async function seedClusters(clusterInputs: ClusterArticleInput[], meta: Map<string, { highImpact: string[]; directMention: boolean }>) {
  const clusters = clusterArticles(clusterInputs, { threshold: 0.45, windowDays: 14, now });
  for (const c of clusters) {
    const members = c.articleIds;
    const highImpact = Array.from(new Set(members.flatMap((id) => meta.get(id)?.highImpact ?? [])));
    const directMention = members.some((id) => meta.get(id)?.directMention);
    const hoursSinceFirst = (now.getTime() - c.firstPublishedAt.getTime()) / HOUR;

    const score = scoreIssue({
      articleCount: c.articleCount, sourceCount: c.sourceCount, recent24hCount: c.recent24hCount,
      hasOfficialPress: c.hasOfficialPress, hasMediaCoverage: c.hasMediaCoverage,
      crossOffice: c.crossOffice, highImpactGroups: highImpact, directOfficeMention: directMention,
    });
    const spread = detectSpread({
      articleCount: c.articleCount, sourceCount: c.sourceCount, hoursSinceFirst,
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
        hasOfficialPress: c.hasOfficialPress, hasMediaCoverage: c.hasMediaCoverage, crossOffice: c.crossOffice,
        signature: c.signature,
      },
    });
    await prisma.article.updateMany({
      where: { id: { in: members } },
      data: { issueClusterId: cluster.id, issueScore: score.issueScore, issueLevel: score.issueLevel },
    });

    const memberInputs = clusterInputs.filter((x) => members.includes(x.id));
    const timeline = buildTimeline(memberInputs.map((m) => ({ id: m.id, title: m.title, summary: m.summary, publishedAt: m.publishedAt, sourceType: m.sourceType })));
    if (timeline.length) {
      await prisma.issueTimelineEvent.createMany({
        data: timeline.map((t) => ({ issueClusterId: cluster.id, articleId: t.articleId, eventDate: t.eventDate, eventTitle: t.eventTitle, eventSummary: t.eventSummary, sourceType: t.sourceType, confidence: t.confidence })),
      });
    }
  }
  console.log(`  · 이슈 클러스터 ${clusters.length}건 (스코어링·확산·타임라인 포함)`);
  return clusters.length;
}

async function seedTrendAndBriefing(articleCount: number, issueCount: number) {
  const alerts = await computeTrendAlerts({ now });
  for (const a of alerts) {
    await prisma.trendAlert.create({
      data: { crimeType: a.crimeType, recentCount: a.recentCount, baselineAvg: a.baselineAvg, increaseRatio: a.increaseRatio, severity: a.severity, sampleOffices: JSON.stringify(a.sampleOffices), windowLabel: a.windowLabel },
    });
  }
  const reviewNeeded = await prisma.article.count({ where: { needsHumanReview: true } });
  const topIds = (await prisma.issueCluster.findMany({ orderBy: { issueScore: "desc" }, take: 5, select: { id: true } })).map((x) => x.id);
  await prisma.briefingRun.create({
    data: { status: "SUCCESS", articleCount, issueCount, reviewNeededCount: reviewNeeded, topIssueIds: JSON.stringify(topIds), message: "초기 seed 브리핑(데모)" },
  });
  console.log(`  · 보도량 증가감지 ${alerts.length}건, 브리핑런 1건(검토필요 ${reviewNeeded}건)`);
}

async function seedPressReferences() {
  const rel = "data/sample-press-release-references.json";
  if (!fs.existsSync(path.join(process.cwd(), rel))) {
    console.log("  · (보도자료 레퍼런스 샘플 파일 없음 — 생성 후 재시드 가능)");
    return;
  }
  const refs = readJson(rel).references as any[];
  for (const r of refs) {
    await prisma.pressReleaseReference.upsert({
      where: { contentHash: r.contentHash },
      update: {},
      create: {
        title: r.title, officeName: r.officeName ?? null,
        publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
        sourceUrl: r.sourceUrl, plainText: r.plainText ?? null,
        markdownContent: r.markdownContent ?? null,
        attachmentTypes: r.attachmentTypes ? JSON.stringify(r.attachmentTypes) : null,
        contentHash: r.contentHash, titlePatternType: r.titlePatternType ?? null,
      },
    });
  }
  console.log(`  · 검찰발표자료 레퍼런스 ${refs.length}건`);
}

async function main() {
  console.log("▶ seed 시작");
  await seedUsers();
  const offices = await seedOffices();
  await seedSources();
  await wipeDemo();
  const { clusterInputs, meta } = await seedArticles(offices);
  const issueCount = await seedClusters(clusterInputs, meta);
  await seedTrendAndBriefing(clusterInputs.length, issueCount);
  await seedPressReferences();
  console.log("✔ seed 완료");
}

main()
  .catch((e) => {
    console.error("seed 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
