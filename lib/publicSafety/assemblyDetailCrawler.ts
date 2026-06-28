// =====================================================================
// [공안] 집회 게시판 '상세 본문' 파싱 → 개별 집회 단위 정밀 관할 분류
//  * 게시판 목록의 '오늘의 집회' 글을 열어 본문의 개별 집회(장소·동·관할서)를 추출.
//  * 관할서(경찰서)·행정동 기준으로 검찰청 관할을 정밀 분류한다.
//  * 본문이 HTML 텍스트인 사이트 대상(서울 등). HWP 첨부 사이트는 별도(LibreOffice).
// =====================================================================
import * as cheerio from "cheerio";
import type { PrismaClient } from "@prisma/client";
import { assemblyContentHash } from "@/lib/providers/assembly/AssemblyScheduleProvider";
import { parseEventDateFromTitle } from "@/lib/providers/assembly/regionalAssemblyBoards";
import { getJurisdictionOffices } from "./runAssemblyPipeline";
import { classifyAssemblyJurisdiction } from "./assemblyJurisdictionClassifier";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

async function fetchText(url: string, enc?: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: ctrl.signal });
    return new TextDecoder(enc || "utf-8").decode(Buffer.from(await r.arrayBuffer()));
  } finally { clearTimeout(t); }
}

export interface ParsedAssembly {
  location: string;       // 집회 장소(예: 마포구청 앞)
  dong?: string;          // 행정동(예: 성산1동)
  policeStation?: string; // 관할서(예: 마포)
  startTime?: string;
  endTime?: string;
  participants?: string;
}

export interface DetailSiteConfig {
  key: string;
  region: string;
  sourceName: string;
  listUrl: string;
  encoding?: string;
  /** 목록에서 게시글 (id, 제목) 추출 */
  listRows: (html: string) => { id: string; title: string }[];
  /** 게시글 id → 상세 URL */
  detailUrl: (id: string) => string;
  /** 상세 본문 → 개별 집회 목록 */
  parseDetail: (html: string) => ParsedAssembly[];
}

// 서울: "집회 일시 : HH:MM~HH:MM 집회 장소 : <장소> <동> 신고 인원 : N명 관할서 : <서>"
function parseSeoulDetail(html: string): ParsedAssembly[] {
  const $ = cheerio.load(html);
  $("script,style").remove();
  const text = $("body").text().replace(/ /g, " ").replace(/[ \t]+/g, " ");
  const out: ParsedAssembly[] = [];
  // 각 항목: 집회 장소 : ... (<동>) ... 관할서 : XX
  const re = /집회\s*장소\s*[:：]\s*([^<\n]+?)(?:\s*<([^>]+)>)?\s*(?:신고\s*인원\s*[:：]\s*([0-9,]+\s*명))?\s*관할서\s*[:：]\s*([가-힣]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({
      location: m[1].trim().replace(/\s+/g, " "),
      dong: m[2]?.trim(),
      participants: m[3]?.trim(),
      policeStation: m[4]?.trim(),
    });
  }
  return out;
}

export const DETAIL_SITES: DetailSiteConfig[] = [
  {
    key: "seoul",
    region: "서울",
    sourceName: "서울경찰청",
    listUrl: "https://www.smpa.go.kr/user/nd54882.do",
    listRows: (html) => {
      const $ = cheerio.load(html);
      const rows: { id: string; title: string }[] = [];
      $("table [onclick*='goBoardView'], table a[href*='goBoardView']").each((_, e) => {
        const raw = $(e).attr("href") || $(e).attr("onclick") || "";
        const id = raw.match(/View'?\s*,\s*'?([0-9]+)'?\)/)?.[1];
        const title = $(e).text().replace(/\s+/g, " ").trim();
        if (id && /집회|시위/.test(title)) rows.push({ id, title });
      });
      return rows;
    },
    detailUrl: (id) =>
      `https://www.smpa.go.kr/user/nd54882.do?View&uQ=&pageST=&pageSV=&imsi=imsi&page=1&pageSC=SORT_ORDER&pageSO=DESC&dmlType=&boardNo=${id}&returnUrl=${encodeURIComponent("https://www.smpa.go.kr:443/user/nd54882.do")}`,
    parseDetail: parseSeoulDetail,
  },
];

export interface DetailCrawlResult {
  site: string;
  posts: number;
  assemblies: number;
  classified: number;
}

/** 상세 본문 파싱 기반 개별 집회 정밀 수집 (해당 출처의 기존 이벤트는 교체) */
export async function crawlDetailedAssemblies(
  prisma: PrismaClient,
  now: Date = new Date(),
  opts: { maxPosts?: number } = {},
): Promise<DetailCrawlResult[]> {
  const maxPosts = opts.maxPosts ?? 6;
  const offices = await getJurisdictionOffices(prisma);
  const results: DetailCrawlResult[] = [];

  for (const site of DETAIL_SITES) {
    let posts = 0, assemblies = 0, classified = 0;
    try {
      const listHtml = await fetchText(site.listUrl, site.encoding);
      const rows = site.listRows(listHtml).slice(0, maxPosts);

      // 이 출처의 기존 집회 이벤트 삭제(개별 단위로 새로 교체)
      const old = await prisma.assemblyEvent.findMany({ where: { sourceName: site.sourceName }, select: { id: true } });
      const oldIds = old.map((o) => o.id);
      for (let i = 0; i < oldIds.length; i += 400) {
        await prisma.assemblyArticleLink.deleteMany({ where: { assemblyEventId: { in: oldIds.slice(i, i + 400) } } });
      }
      await prisma.assemblyEvent.deleteMany({ where: { sourceName: site.sourceName } });

      for (const row of rows) {
        const eventDate = parseEventDateFromTitle(row.title, now.getFullYear());
        if (!eventDate) continue;
        posts++;
        const detailHtml = await fetchText(site.detailUrl(row.id), site.encoding);
        const items = site.parseDetail(detailHtml);
        for (const it of items) {
          assemblies++;
          const j = classifyAssemblyJurisdiction(
            { locationName: it.location, district: it.dong, policeStationName: it.policeStation ? `${it.policeStation}경찰서` : undefined, region: site.region },
            offices,
          );
          if (j.officeId) classified++;
          const sourceUrlKey = `${site.key}|${eventDate.toISOString().slice(0, 10)}|${it.location}|${it.policeStation ?? ""}`;
          const hash = assemblyContentHash({ eventDate, locationName: it.location, organizerName: it.policeStation, sourceUrl: sourceUrlKey });
          const data = {
            eventDate, startTime: it.startTime ?? null, endTime: it.endTime ?? null,
            title: `${it.location}${it.dong ? ` (${it.dong})` : ""}`,
            locationName: it.location, district: it.dong ?? null,
            policeStationName: it.policeStation ? `${it.policeStation}경찰서` : null,
            expectedParticipants: it.participants ?? null, topicSummary: row.title,
            sourceName: site.sourceName, sourceUrl: site.detailUrl(row.id), sourcePostTitle: row.title,
            attachmentUrls: JSON.stringify([]),
            prosecutionOfficeId: j.officeId ?? null, prosecutionOfficeName: j.officeName ?? null,
            jurisdictionConfidence: j.confidence, jurisdictionReason: j.reason, jurisdictionMethod: j.method,
            needsHumanReview: j.needsHumanReview, reviewReason: j.needsHumanReview ? j.reason : null,
          };
          await prisma.assemblyEvent.upsert({ where: { contentHash: hash }, update: data, create: { ...data, contentHash: hash } });
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (e) {
      console.warn(`[detailCrawler] ${site.sourceName} 실패:`, (e as Error)?.message);
    }
    results.push({ site: site.sourceName, posts, assemblies, classified });
  }
  return results;
}
