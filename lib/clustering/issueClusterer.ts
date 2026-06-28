// =====================================================================
// 이슈 클러스터러 — 유사 기사들을 하나의 IssueCluster 로 묶는다(순수 함수).
//   DB 영속화는 호출측(스크립트/API)에서 수행한다.
// =====================================================================
import { articleSimilarity, titleSimilarity, type SimArticle } from "./similarity";

export interface ClusterArticleInput extends SimArticle {
  primaryOfficeName?: string | null;
  sourceName: string;
  sourceType: string;
  summary?: string | null;
}

export interface ClusterResult {
  signature: string;
  title: string;
  summary?: string;
  representativeArticleId: string;
  articleIds: string[];
  mainOfficeId?: string;
  mainOfficeName?: string;
  mainCrimeType?: string;
  mainRegion?: string;
  firstPublishedAt: Date;
  lastPublishedAt: Date;
  articleCount: number;
  sourceCount: number;
  recent24hCount: number;
  hasOfficialPress: boolean;
  hasMediaCoverage: boolean;
  crossOffice: boolean;
}

export interface ClusterOptions {
  threshold?: number;   // 병합 임계치(기본 0.5)
  windowDays?: number;  // 같은 사건으로 볼 최대 기간(기본 14일)
  now?: Date;
}

function majority<T>(values: (T | null | undefined)[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) {
    if (v == null) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: T | undefined;
  let bestN = 0;
  for (const [k, n] of counts) if (n > bestN) ((best = k), (bestN = n));
  return best;
}

const OFFICIAL_TYPES = ["OFFICIAL_PRESS", "MOJ_SPO_OFFICIAL"];

export function clusterArticles(items: ClusterArticleInput[], opts: ClusterOptions = {}): ClusterResult[] {
  const threshold = opts.threshold ?? 0.5;
  const windowMs = (opts.windowDays ?? 14) * 86400000;
  const now = opts.now ?? new Date();

  const sorted = [...items].sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
  const clusters: ClusterArticleInput[][] = [];

  for (const item of sorted) {
    let bestIdx = -1;
    let bestSim = 0;
    for (let i = 0; i < clusters.length; i++) {
      const members = clusters[i];
      // 기간 윈도우 체크(대표=최근 멤버 기준)
      const last = members[members.length - 1];
      if (Math.abs(item.publishedAt.getTime() - last.publishedAt.getTime()) > windowMs) continue;
      // 멤버 평균 유사도
      const avg = members.reduce((s, m) => s + articleSimilarity(item, m), 0) / members.length;
      if (avg > bestSim) ((bestSim = avg), (bestIdx = i));
    }
    if (bestIdx >= 0 && bestSim >= threshold) clusters[bestIdx].push(item);
    else clusters.push([item]);
  }

  return clusters.map((members) => finalize(members, now));
}

function finalize(members: ClusterArticleInput[], now: Date): ClusterResult {
  // 대표 기사 = 제목 medoid(다른 멤버와 제목 유사도 합이 최대)
  let rep = members[0];
  let repScore = -1;
  for (const m of members) {
    const s = members.reduce((acc, o) => (o === m ? acc : acc + titleSimilarity(m.title, o.title)), 0);
    if (s > repScore) ((repScore = s), (rep = m));
  }

  const dates = members.map((m) => m.publishedAt.getTime());
  const firstPublishedAt = new Date(Math.min(...dates));
  const lastPublishedAt = new Date(Math.max(...dates));
  const sources = new Set(members.map((m) => m.sourceName));
  const offices = new Set(members.map((m) => m.primaryOfficeId).filter(Boolean) as string[]);
  const recent24hCount = members.filter((m) => now.getTime() - m.publishedAt.getTime() <= 86400000).length;

  const mainOfficeId = majority(members.map((m) => m.primaryOfficeId));
  const repOffice = members.find((m) => m.primaryOfficeId === mainOfficeId);

  return {
    signature: `cl_${rep.id}`,
    title: rep.title,
    summary: rep.summary ?? undefined,
    representativeArticleId: rep.id,
    articleIds: members.map((m) => m.id),
    mainOfficeId: mainOfficeId ?? undefined,
    mainOfficeName: repOffice?.primaryOfficeName ?? undefined,
    mainCrimeType: majority(members.map((m) => m.crimeType)) ?? undefined,
    mainRegion: majority(members.map((m) => m.region)) ?? undefined,
    firstPublishedAt,
    lastPublishedAt,
    articleCount: members.length,
    sourceCount: sources.size,
    recent24hCount,
    hasOfficialPress: members.some((m) => OFFICIAL_TYPES.includes(m.sourceType)),
    hasMediaCoverage: members.some((m) => !OFFICIAL_TYPES.includes(m.sourceType)),
    crossOffice: offices.size >= 2,
  };
}
