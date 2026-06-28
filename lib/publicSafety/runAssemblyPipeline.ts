// =====================================================================
// [공안] 수집·분류·매칭 재사용 파이프라인 (API 라우트 / 스크립트 공용)
//  * provider.collect → 관할(추정) 분류 → contentHash upsert
//  * 샘플 _relatedArticles 를 Article 로 삽입 후 매칭 실행
//  * 집회·시위는 범죄로 단정하지 않으며, 관련 보도는 '공개 보도' 로만 다룬다.
// =====================================================================
import { promises as fs } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { asArray } from "@/lib/utils";
import { getAssemblyProvider } from "@/lib/providers/assembly/SeoulPoliceAssemblyProvider";
import {
  classifyAssemblyJurisdiction,
  type JurisdictionOfficeLite,
} from "./assemblyJurisdictionClassifier";
import {
  matchAssemblyToArticles,
  type MatchArticleInput,
} from "./assemblyArticleMatcher";
import {
  crawlAllRegionalAssemblies,
  ASSEMBLY_SITES,
} from "@/lib/providers/assembly/regionalAssemblyBoards";

const SAMPLE_PATH = path.join(process.cwd(), "data", "sample-assemblies.json");
const DAY = 86400000;

function simpleHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return `asma_${(h >>> 0).toString(36)}`;
}

/** 관할 분류용 office lite 목록 로드 */
export async function getJurisdictionOffices(
  prisma: PrismaClient,
): Promise<JurisdictionOfficeLite[]> {
  const offices = await prisma.prosecutionOffice.findMany({
    select: {
      id: true,
      name: true,
      searchKeywords: true,
      policeStations: true,
      jurisdictionText: true,
    },
  });
  return offices.map((o) => ({
    id: o.id,
    name: o.name,
    searchKeywords: asArray<string>(o.searchKeywords),
    policeStations: asArray<string>(o.policeStations),
    jurisdictionText: o.jurisdictionText ?? undefined,
  }));
}

export interface CollectResult {
  collected: number;
  savedAssemblies: number;
  insertedArticles: number;
  createdLinks: number;
}

/** 공개 일정 수집 → 관할 분류 → upsert → 관련 보도 삽입·매칭 */
export async function collectAndClassifyAssemblies(
  prisma: PrismaClient,
  now: Date = new Date(),
): Promise<CollectResult> {
  const offices = await getJurisdictionOffices(prisma);
  const provider = getAssemblyProvider();
  const raws = await provider.collect().catch(() => []);

  let savedAssemblies = 0;
  for (const a of raws) {
    const j = classifyAssemblyJurisdiction(
      {
        locationName: a.locationName,
        address: a.address,
        district: a.district,
        policeStationName: a.policeStationName,
      },
      offices,
    );
    const data = {
      eventDate: a.eventDate,
      startTime: a.startTime ?? null,
      endTime: a.endTime ?? null,
      title: a.title,
      locationName: a.locationName,
      address: a.address ?? null,
      district: a.district ?? null,
      policeStationName: a.policeStationName ?? null,
      organizerName: a.organizerName ?? null,
      expectedParticipants: a.expectedParticipants ?? null,
      marchRoute: a.marchRoute ?? null,
      topicSummary: a.topicSummary ?? null,
      sourceName: a.sourceName,
      sourceUrl: a.sourceUrl ?? null,
      sourcePostTitle: a.sourcePostTitle ?? null,
      sourcePublishedAt: a.sourcePublishedAt ?? null,
      rawText: a.rawText ?? null,
      attachmentUrls: JSON.stringify(a.attachmentUrls ?? []),
      prosecutionOfficeId: j.officeId ?? null,
      prosecutionOfficeName: j.officeName ?? null,
      jurisdictionConfidence: j.confidence,
      jurisdictionReason: j.reason,
      jurisdictionMethod: j.method,
      needsHumanReview: j.needsHumanReview,
      reviewReason: j.needsHumanReview ? j.reason : null,
    };
    await prisma.assemblyEvent.upsert({
      where: { contentHash: a.contentHash },
      // 재수집 시 관할(추정)/공개 일정 정보는 최신화하되, 수동 검토 완료(needsHumanReview=false)는 보존하지 않음 — 단순 최신화
      update: data,
      create: { ...data, contentHash: a.contentHash },
    });
    savedAssemblies++;
  }

  // 샘플 관련 기사 삽입 → 매칭
  const { insertedArticles, createdLinks } = await insertRelatedArticlesAndMatch(prisma, now);

  return { collected: raws.length, savedAssemblies, insertedArticles, createdLinks };
}

export interface RegionalCrawlResult {
  sources: number;
  okSources: number;
  collected: number;
  savedAssemblies: number;
  createdLinks: number;
}

/**
 * 전국 지방경찰청 게시판 실크롤 → 관할(추정) 분류 → upsert → 출처별 현황 기록 → 관련 보도 매칭.
 *  * 샘플이 아니라 공개 게시판의 실제 '오늘의 주요집회' 공지를 수집한다.
 *  * 출처별 '정보 반영 시각'은 AssemblySourceStatus 에 기록된다.
 */
export async function crawlRegionalAssembliesAndClassify(
  prisma: PrismaClient,
  now: Date = new Date(),
): Promise<RegionalCrawlResult> {
  const offices = await getJurisdictionOffices(prisma);
  const results = await crawlAllRegionalAssemblies(now);

  let collected = 0;
  let savedAssemblies = 0;
  let okSources = 0;

  for (const result of results) {
    if (result.ok) okSources++;
    collected += result.raws.length;

    for (const a of result.raws) {
      const j = classifyAssemblyJurisdiction(
        { locationName: a.locationName, address: a.address, district: a.district, policeStationName: a.policeStationName, region: result.site.region },
        offices,
      );
      const data = {
        eventDate: a.eventDate,
        startTime: a.startTime ?? null,
        endTime: a.endTime ?? null,
        title: a.title,
        locationName: a.locationName,
        address: a.address ?? null,
        district: a.district ?? null,
        policeStationName: a.policeStationName ?? null,
        organizerName: a.organizerName ?? null,
        expectedParticipants: a.expectedParticipants ?? null,
        marchRoute: a.marchRoute ?? null,
        topicSummary: a.topicSummary ?? null,
        sourceName: a.sourceName,
        sourceUrl: a.sourceUrl ?? null,
        sourcePostTitle: a.sourcePostTitle ?? null,
        sourcePublishedAt: a.sourcePublishedAt ?? null,
        rawText: a.rawText ?? null,
        attachmentUrls: JSON.stringify(a.attachmentUrls ?? []),
        prosecutionOfficeId: j.officeId ?? null,
        prosecutionOfficeName: j.officeName ?? null,
        jurisdictionConfidence: j.confidence,
        jurisdictionReason: j.reason,
        jurisdictionMethod: j.method,
        needsHumanReview: j.needsHumanReview,
        reviewReason: j.needsHumanReview ? j.reason : null,
      };
      await prisma.assemblyEvent.upsert({
        where: { contentHash: a.contentHash },
        update: data,
        create: { ...data, contentHash: a.contentHash },
      });
      savedAssemblies++;
    }

    // 출처별 수집 현황(정보 반영 시각) 기록
    const site = result.site;
    const status = {
      sourceName: site.sourceName,
      region: site.region,
      listUrl: site.listUrl,
      supported: site.supported,
      lastCollectedAt: now,
      lastSuccess: result.ok,
      collectedCount: result.raws.length,
      latestPostDate: result.latestPostDate ?? null,
      latestEventDate: result.latestEventDate ?? null,
      message: result.message ?? (result.ok ? null : "수집 실패"),
    };
    await prisma.assemblySourceStatus.upsert({
      where: { sourceKey: site.key },
      update: status,
      create: { sourceKey: site.key, ...status },
    });
  }

  const createdLinks = await matchAllAssembliesToArticles(prisma, now);
  return { sources: results.length, okSources, collected, savedAssemblies, createdLinks };
}

/** 샘플 _relatedArticles 를 Article(WEB_NEWS/MANUAL/canDisplay=true)로 삽입 후 매칭 */
async function insertRelatedArticlesAndMatch(
  prisma: PrismaClient,
  now: Date,
): Promise<{ insertedArticles: number; createdLinks: number }> {
  let insertedArticles = 0;
  try {
    const raw = await fs.readFile(SAMPLE_PATH, "utf-8");
    const json = JSON.parse(raw);
    const related: any[] = Array.isArray(json?._relatedArticles) ? json._relatedArticles : [];
    for (const r of related) {
      const offset = typeof r.daysFromAssembly === "number" ? r.daysFromAssembly : 0;
      const publishedAt = new Date(now.getTime() + offset * DAY);
      const title = String(r.title || "집회 관련 보도");
      const contentHash = simpleHash(`${title}|sample-assembly-news`);
      const exists = await prisma.article.findUnique({
        where: { contentHash },
        select: { id: true },
      });
      if (exists) continue;
      await prisma.article.create({
        data: {
          title,
          sourceName: r.sourceName ? String(r.sourceName) : "샘플뉴스",
          publishedAt,
          originalUrl: `https://example.go.kr/sample-assembly-news/${contentHash}`,
          summary: r.summary ? String(r.summary) : null,
          fullText: null,
          sourceType: "WEB_NEWS",
          licenseType: "MANUAL",
          canStoreFullText: true,
          canDisplayFullText: true,
          needsHumanReview: false,
          contentHash,
          keywords: JSON.stringify(
            [r.locationHint, r.organizerHint].filter(Boolean).map(String),
          ),
        },
      });
      insertedArticles++;
    }
  } catch (e) {
    console.warn("[runAssemblyPipeline] 샘플 관련 기사 삽입 실패(무시):", (e as Error)?.message);
  }

  const createdLinks = await matchAllAssembliesToArticles(prisma, now);
  return { insertedArticles, createdLinks };
}

/**
 * 모든 집회 × 최근 기사 매칭(재실행 안전: upsert).
 *  windowDays 범위의 Article 만 평가한다.
 */
export async function matchAllAssembliesToArticles(
  prisma: PrismaClient,
  now: Date = new Date(),
  opts: { windowDays?: number; lookbackDays?: number } = {},
): Promise<number> {
  const windowDays = opts.windowDays ?? 2;
  const lookbackDays = opts.lookbackDays ?? 30;

  const assemblies = await prisma.assemblyEvent.findMany({
    select: {
      id: true,
      eventDate: true,
      title: true,
      locationName: true,
      district: true,
      organizerName: true,
      topicSummary: true,
    },
  });
  if (assemblies.length === 0) return 0;

  const since = new Date(now.getTime() - lookbackDays * DAY);
  const articles = await prisma.article.findMany({
    where: { publishedAt: { gte: since } },
    select: { id: true, title: true, summary: true, fullText: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 500,
  });
  const articleInputs: MatchArticleInput[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    fullText: a.fullText,
    publishedAt: a.publishedAt,
  }));

  let createdLinks = 0;
  for (const asm of assemblies) {
    const matches = matchAssemblyToArticles(
      {
        eventDate: asm.eventDate,
        title: asm.title,
        locationName: asm.locationName,
        district: asm.district ?? undefined,
        organizerName: asm.organizerName ?? undefined,
        topicSummary: asm.topicSummary ?? undefined,
      },
      articleInputs,
      { windowDays },
    );
    for (const { article, match } of matches) {
      const existing = await prisma.assemblyArticleLink.findFirst({
        where: { assemblyEventId: asm.id, articleId: article.id },
        select: { id: true },
      });
      const linkData = {
        assemblyEventId: asm.id,
        articleId: article.id,
        relationType: match.relationType,
        relationConfidence: match.relationConfidence,
        relationReason: match.relationReason,
        matchedKeywords: JSON.stringify(match.matchedKeywords),
        matchedLocation: match.matchedLocation,
        matchedDate: match.matchedDate,
        hasLegalIssueMention: match.hasLegalIssueMention,
        legalIssueKeywords: JSON.stringify(match.legalIssueKeywords),
        needsHumanReview: match.hasLegalIssueMention || match.relationConfidence < 0.6,
      };
      if (existing) {
        await prisma.assemblyArticleLink.update({ where: { id: existing.id }, data: linkData });
      } else {
        await prisma.assemblyArticleLink.create({ data: linkData });
        createdLinks++;
      }
    }
  }
  return createdLinks;
}
