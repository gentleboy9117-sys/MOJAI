// =====================================================================
// 통합 자동 수집 엔트리포인트 (언론기사 + 공안 집회 + 트렌드/브리핑)
//  * 지금: 로컬에서 Windows 작업 스케줄러가 `tsx scripts/auto-collect.ts` 로 주기 실행.
//  * 나중(Netlify): netlify/functions 의 Scheduled Function 이 아래 runAutoCollect()
//    와 동일한 lib 로직을 호출(단, DB를 PostgreSQL 로 전환해야 함 — NETLIFY_DEPLOY.md 참고).
//  * 모든 결과는 '공개 보도 기준 참고용' 이며 담당자 검토가 필요합니다.
// =====================================================================
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { getNewsProviders } from "@/lib/providers/news";
import { NaverNewsProvider } from "@/lib/providers/news/NaverNewsProvider";
import { isPhotoOnlyTitle, isForeignTopic, isOpinionColumn, isCelebGossip, isNonLegalNoise, isPromoNoise, isElectionPolitics, isCivilCase, isDisplayNoise, isBrokenArticleUrl, isCorporateBiz, isPolicyPr, isCouncilActivity, isNonCriminalNews } from "@/lib/collect/filters";
import { classifyArticle, contentHashOf } from "@/lib/classifiers";
import { getOfficeLites, rebuildClusters, persistTrendAlerts } from "@/lib/pipeline/runPipeline";
import {
  crawlRegionalAssembliesAndClassify,
  matchAllAssembliesToArticles,
} from "@/lib/publicSafety/runAssemblyPipeline";
import { enrichAssemblyNewsBodies } from "@/lib/publicSafety/assemblyNewsEnricher";
import { crawlDetailedAssemblies } from "@/lib/publicSafety/assemblyDetailCrawler";
import { buildReportData } from "@/lib/report/buildReportData";
import { generateReportMarkdown } from "@/lib/report/reportGenerator";
import { checkText } from "@/lib/report/riskChecker";

const DAY = 86400000;

// 수집 대상 RSS — env(NEWS_RSS_URLS, 쉼표구분)로 덮어쓰기 가능.
// 기본값: 구글뉴스 '검찰'/'검찰청' 한국어 피드(키 불필요, allowlist 에 news.google.com 포함).
const NEWS_RSS_URLS = (
  process.env.NEWS_RSS_URLS ||
  [
    // 전 매체 폭넓게 수집(구글뉴스는 모든 주요 언론사 포함). 토픽별 다중 쿼리로 커버리지 확대.
    "검찰", "검찰청", "검찰 수사", "검찰 기소", "검찰 구속", "검찰 송치", "특검", "공수처",
    "집회 시위", "집회 경찰", "선거범죄", "부정선거",
    "법원 선고", "법원 판결", "징역 선고", "구속 기소",
    "마약 수사", "보이스피싱", "전세사기", "뇌물", "횡령 배임", "공정거래위원회",
    "노동조합 파업", "중대재해", "임금체불",
  ].map((q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`).join(",")
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// 네이버 뉴스 검색 키워드(원문 URL 제공 → 링크 정상). NEWS_RSS_URLS 와 동일 토픽군.
const NAVER_KEYWORDS = [
  "검찰", "검찰 수사", "검찰 기소", "검찰 구속", "특검", "공수처",
  "집회 시위", "선거범죄", "부정선거", "법원 선고", "징역 선고",
  "마약 수사", "보이스피싱", "전세사기", "뇌물", "공정거래위원회",
  "노동조합 파업", "중대재해", "임금체불",
];

async function saveRaw(a: any, offices: any[]): Promise<boolean> {
  if (isPhotoOnlyTitle(a.title)) return false; // 사진/화보 기사 제외
  if (isOpinionColumn(a.title, a.originalUrl)) return false; // 칼럼·오피니언·사설 제외(제목·URL)
  if (isPromoNoise(a.title)) return false; // 홍보·행사성 기사 제외
  if (isCelebGossip(a.title, a.summary)) return false; // 연예 가십(법률 맥락 없음) 제외
  if (isNonLegalNoise(a.title, a.summary)) return false; // 형사사법 무관(정치·경제·스포츠) 제외
  if (isForeignTopic(a.title, a.summary)) return false; // 해외토픽(외국인·외국 사건) 제외
  if (isElectionPolitics(a.title, a.summary)) return false; // 선거 일반 정치기사(수사·기소·재판 없음) 제외
  if (isCivilCase(a.title, a.summary)) return false; // 민사·가사 사건(형사 무관) 제외
  if (isDisplayNoise(a.title, a.summary)) return false; // 시황·편집물·연예 등 노출 부적합 제외
  if (isBrokenArticleUrl(a.originalUrl)) return false; // 원문 링크가 깨진 기사 제외(클릭 시 '잘못된 접근')
  if (isCorporateBiz(a.title, a.summary)) return false; // 기업 경영·M&A·실적 기사 제외(형사 무관)
  if (isPolicyPr(a.title, a.summary)) return false; // 지자체·기관 정책 홍보·교육 기사 제외(형사 무관)
  if (isCouncilActivity(a.title, a.summary)) return false; // 지방의회 의정활동 기사 제외(형사 무관)
  if (isNonCriminalNews(a.title, a.summary)) return false; // 형사사건 무관(홍보·행정·기업·부고) 전면 제외
  const hash = contentHashOf(a.title, a.originalUrl);
  if (await prisma.article.findUnique({ where: { contentHash: hash }, select: { id: true } })) return false;
  const r = classifyArticle(
    { title: a.title, fullText: a.fullText, summary: a.summary, sourceType: a.sourceType, sourceName: a.sourceName },
    offices,
  );
  if (!r.primaryOffice?.officeId) return false; // 관할 분류 불가 기사는 저장하지 않음(관할 미상 0 정책)
  if (!r.crime?.crimeType) return false; // 범죄유형 분류 불가 기사도 저장하지 않음(미분류 0 정책, 2026-07-27)
  // 정확도 우선 원칙(2026-07-27): 헷갈리면 수집하지 않는다 — 오분류 방지가 기사 수보다 중요
  if ((r.primaryOffice?.confidence ?? 0) < 0.6) return false; // 관할 추정 신뢰도 낮음(약한 지역/경찰서 추정) → 제외
  const isAssemblyNews = /집회|시위/.test(a.title) || /집회|시위/.test(a.summary ?? "");
  if (r.crime.crimeType === "기타" && !isAssemblyNews) return false; // 유형 특정 불가('기타')는 집회·시위 보도만 유지
  await prisma.article.create({
    data: {
      title: a.title, sourceName: a.sourceName, publishedAt: a.publishedAt, originalUrl: a.originalUrl,
      fullText: a.canStoreFullText ? a.fullText ?? null : null, summary: a.summary ?? null,
      licenseType: a.licenseType, sourceType: a.sourceType, canStoreFullText: a.canStoreFullText, canDisplayFullText: a.canDisplayFullText,
      copyrightNotice: a.copyrightNotice ?? null, primaryOfficeId: r.primaryOffice?.officeId ?? null, primaryRegion: r.region ?? null,
      crimeType: r.crime.crimeType, crimeSubtype: r.crime.crimeSubtype ?? null, classifyConfidence: r.crime.confidence,
      officeConfidence: r.primaryOffice?.confidence ?? null, officeMatchType: r.primaryOffice?.matchType ?? null,
      // 네이버 등 원문 URL을 직접 주는 공급원은 링크가 바로 동작 → resolvedUrl 로도 저장
      resolvedUrl: a.originalUrl?.includes("news.google.com") ? null : a.originalUrl,
      needsHumanReview: r.needsHumanReview, reviewReasons: JSON.stringify(r.reviewReasons), keywords: JSON.stringify(r.keywords), contentHash: hash,
    },
  });
  return true;
}

// --- 1) 언론기사 수집·분류 (구글뉴스 RSS + 네이버 뉴스 API) ---
async function collectNews(): Promise<number> {
  const offices = await getOfficeLites();
  let saved = 0;
  // 구글뉴스 RSS(다건)
  for (const rssUrl of NEWS_RSS_URLS) {
    for (const p of getNewsProviders()) {
      const raws = await p.collect({ rssUrl, limit: 60 }).catch(() => []);
      for (const a of raws) if (await saveRaw(a, offices)) saved++;
    }
  }
  // 네이버 뉴스 검색 API(원문 URL·요약 제공). 키 없으면 [] 반환.
  const naver = new NaverNewsProvider();
  const naverRaws = await naver.collect({ keywords: NAVER_KEYWORDS, limit: 100 }).catch(() => []);
  for (const a of naverRaws) if (await saveRaw(a, offices)) saved++;
  return saved;
}

/** 전체 자동 수집 파이프라인. 로컬 CLI/Netlify Scheduled Function 공용. */
export async function runAutoCollect(now = new Date()) {
  // 1) 언론기사
  const savedNews = await collectNews();
  // 1-2) 집회·시위 보도 본문 기반 발생지 관할 분류(신규분 일부씩)
  const enrich = await enrichAssemblyNewsBodies(prisma, { limit: 50, delayMs: 300 }).catch(() => ({ processed: 0, classified: 0, failed: 0 }));
  // 2) 공안 집회 — 전국 지방경찰청 게시판 실크롤(글 단위) + 관할 분류 + 관련 보도 매칭
  const asm = await crawlRegionalAssembliesAndClassify(prisma, now);
  // 2-2) 상세 본문 파싱 가능 사이트(서울 등)는 개별 집회 단위로 정밀 교체
  const detailed = await crawlDetailedAssemblies(prisma, now, { maxPosts: 8 }).catch(() => []);
  const detailedAssemblies = detailed.reduce((s, d) => s + d.assemblies, 0);
  if (detailedAssemblies) await matchAllAssembliesToArticles(prisma, now); // 개별 집회 재매칭
  // 3) 이슈 클러스터 재구성 + 공개 보도량 증가감지
  const clusters = await rebuildClusters(now);
  const trends = await persistTrendAlerts(now);
  // 4) 기관장용 브리핑(EXEC_SUMMARY) 생성 + BriefingRun 기록
  const start = new Date(now.getTime() - 7 * DAY);
  const data = await buildReportData({ start, end: now, generatedBy: "자동 수집(시스템)", now });
  const { title, markdown } = generateReportMarkdown(data, "EXEC_SUMMARY");
  const safety = checkText(markdown);
  const report = await prisma.report.create({
    data: {
      title, reportType: "EXEC_SUMMARY", periodStart: start, periodEnd: now,
      markdownContent: markdown, safetyCheckJson: JSON.stringify(safety),
      sourceCount: data.sources.length, issueCount: data.issueCount,
    },
  });
  const reviewNeeded = await prisma.article.count({ where: { needsHumanReview: true } });
  const topIds = (
    await prisma.issueCluster.findMany({ orderBy: { issueScore: "desc" }, take: 5, select: { id: true } })
  ).map((x) => x.id);
  await prisma.briefingRun.create({
    data: {
      status: "SUCCESS", articleCount: data.articleCount, issueCount: data.issueCount,
      reviewNeededCount: reviewNeeded, topIssueIds: JSON.stringify(topIds), reportId: report.id,
      message: "자동 수집 브리핑",
    },
  });

  return {
    savedNews, newsBodyClassified: enrich.classified,
    assemblySources: asm.sources, assemblyOkSources: asm.okSources,
    assembliesCollected: asm.collected, assembliesSaved: asm.savedAssemblies, assemblyLinks: asm.createdLinks,
    detailedAssemblies,
    clusters, trends, reportId: report.id, articleCount: data.articleCount, issueCount: data.issueCount,
  };
}

// --- 로컬/스케줄러 직접 실행(CLI 전용) ---
//  Netlify Scheduled Function 등에서 import 할 때는 자동 실행되지 않도록 가드.
if (process.argv[1] && process.argv[1].includes("auto-collect")) {
  runAutoCollect()
    .then((r) => console.log(`✔ 자동수집 완료 — ${JSON.stringify(r)}`))
    .catch((e) => {
      console.error("[X] 자동수집 실패:", e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
