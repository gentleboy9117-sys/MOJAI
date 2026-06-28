// =====================================================================
// [공안] 전국 지방경찰청 집회·시위 공개 게시판 실크롤러
//  * 각 지방청 공개 게시판의 '오늘의 주요집회' 공지 목록을 수집한다.
//  * 게시판은 날짜별 '공지 게시물' 단위이며, 개별 집회의 정확한 장소/단체/시간은
//    게시물 본문·첨부(HWP/PDF)에 있으므로 여기서는 '날짜별 공지(공개·링크)' 만 정규화한다.
//  * 집회·시위는 헌법상 기본권 행사일 수 있으므로 범죄로 단정하지 않는다.
//    참가자 식별/성향/배후 추론은 일절 하지 않는다.
// =====================================================================
import * as cheerio from "cheerio";
import {
  type AssemblyScheduleProvider,
  type RawAssembly,
  assemblyContentHash,
} from "./AssemblyScheduleProvider";

const USER_AGENT =
  process.env.COLLECT_USER_AGENT ||
  "ProsecutionPlanningAIWorkbench/0.1 (public-assembly-schedule)";

export interface AssemblySite {
  key: string;
  region: string;
  sourceName: string;
  listUrl: string;
  encoding?: string; // "euc-kr" 등 (기본 utf-8)
  supported: boolean; // 정적 표 크롤 지원 여부
  note?: string;
}

// 18개 지방경찰청. supported=false 는 표 구조가 아니거나(JS/프레임) 별도 구현 필요.
export const ASSEMBLY_SITES: AssemblySite[] = [
  { key: "seoul", region: "서울", sourceName: "서울경찰청", listUrl: "https://www.smpa.go.kr/user/nd54882.do", supported: true },
  { key: "busan", region: "부산", sourceName: "부산경찰청", listUrl: "https://www.bspolice.go.kr/view.do?no=72", supported: true },
  { key: "daegu", region: "대구", sourceName: "대구경찰청", listUrl: "https://www.dgpolice.go.kr/dgpo/bbs/List.do?bbsId=d495f174", supported: true },
  { key: "incheon", region: "인천", sourceName: "인천경찰청", listUrl: "https://icpolice.go.kr/board/rg4_board/list.php?bbs_code=ic015", encoding: "euc-kr", supported: true },
  { key: "gwangju", region: "광주", sourceName: "광주경찰청", listUrl: "https://gjpolice.go.kr/sub.do?r=gjpolice&mid=7021058", supported: false, note: "표 구조 아님(목록 렌더링 방식 상이) — 별도 파서 필요" },
  { key: "daejeon", region: "대전", sourceName: "대전경찰청", listUrl: "https://www.djpolice.go.kr/main.htm?mxRc=x2_1_2", supported: false, note: "프레임/리다이렉트 페이지 — 실제 게시판 URL 별도 확인 필요" },
  { key: "ulsan", region: "울산", sourceName: "울산경찰청", listUrl: "https://www.uspolice.go.kr/m/board.jsp?tab=bo20141217142954", supported: true },
  { key: "sejong", region: "세종", sourceName: "세종경찰청", listUrl: "https://www.sjpolice.go.kr/site/main.php?mxPn=02_02", supported: true },
  { key: "gyeongginam", region: "경기남부", sourceName: "경기남부경찰청", listUrl: "https://www.ggpolice.go.kr/main/bbslist.do?bbsId=FD2", supported: true },
  { key: "gyeonggibuk", region: "경기북부", sourceName: "경기북부경찰청", listUrl: "https://www.ggbpolice.go.kr/PageLink.do", supported: false, note: "표 구조 아님(JS/링크 페이지) — 별도 파서 필요" },
  { key: "gangwon", region: "강원", sourceName: "강원경찰청", listUrl: "https://www.gwpolice.go.kr/gw/sub02/sub02_05.jsp", supported: true },
  { key: "chungbuk", region: "충북", sourceName: "충북경찰청", listUrl: "https://www.cbpolice.go.kr/main_sub/sub.php?folder_idx=2&folder_page_idx=18", supported: true },
  { key: "chungnam", region: "충남", sourceName: "충남경찰청", listUrl: "https://www.cnpolice.go.kr/2014/main.php?mxPn=3_1_1", encoding: "euc-kr", supported: true },
  { key: "jeonbuk", region: "전북", sourceName: "전북경찰청", listUrl: "https://www.jbpolice.go.kr/board/list.police?boardId=BBS_0000013&menuCd=DOM_000000202008000000&contentsSid=67&cpath=", supported: true },
  { key: "jeonnam", region: "전남", sourceName: "전남경찰청", listUrl: "https://www.jnpolice.go.kr/?pid=AP0306", supported: true },
  { key: "gyeongbuk", region: "경북", sourceName: "경북경찰청", listUrl: "https://www.gbpolice.go.kr/bbs/List.do?bbsId=8&sid=gbpolice", supported: true },
  { key: "gyeongnam", region: "경남", sourceName: "경남경찰청", listUrl: "https://www.gnpolice.go.kr/gnpolice/page.do?MENU_ID=NF05", supported: true },
  { key: "jeju", region: "제주", sourceName: "제주경찰청", listUrl: "https://www.jjpolice.go.kr/jjpolice/notice/assembly.htm", supported: true },
];

/** allowlist(SSRF) 용 도메인 목록 */
export const POLICE_ASSEMBLY_DOMAINS = Array.from(
  new Set(ASSEMBLY_SITES.map((s) => new URL(s.listUrl).hostname)),
);

// ---------------------------------------------------------------------
// 날짜 파싱 — 게시물 제목에서 '집회 예정일' 추출 (없으면 null → 해당 행 건너뜀)
// ---------------------------------------------------------------------
function valid(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function parseEventDateFromTitle(title: string, fallbackYear: number): Date | null {
  const t = title.replace(/[（）]/g, (c) => (c === "（" ? "(" : ")"));
  // 1) YYYY.M.D  (예: 2026.6.27 / 2026. 6. 26.)
  let m = t.match(/(20\d{2})\s*[.\-]\s*(\d{1,2})\s*[.\-]\s*(\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  // 2) 'YY.M.D 또는 YY.M.D  (예: '26.6.29 / 26.06.27 / 26.04.01)
  m = t.match(/'?(\d{2})\s*[.\-]\s*(\d{1,2})\s*[.\-]\s*(\d{1,2})/);
  if (m) return valid(2000 + +m[1], +m[2], +m[3]);
  // 3) YYMMDD 6연속 숫자 (예: 260629)
  m = t.match(/(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)/);
  if (m) {
    const dt = valid(2000 + +m[1], +m[2], +m[3]);
    if (dt) return dt;
  }
  // 4) YY년 M월 D일 / M월 D일 (예: 26년 6월 27일)
  m = t.match(/(?:(\d{2,4})\s*년)?\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) return valid(m[1] ? (m[1].length === 2 ? 2000 + +m[1] : +m[1]) : fallbackYear, +m[2], +m[3]);
  // 5) MMDD(요일) (예: 0627(토))
  m = t.match(/(?<!\d)(\d{2})(\d{2})(?!\d)\s*[\(~]/);
  if (m) return valid(fallbackYear, +m[1], +m[2]);
  // 6) M.D(요일/.) (예: 6.18.목 / 6.27.(토) / 6.24.)
  m = t.match(/(?<!\d)(\d{1,2})\s*[.]\s*(\d{1,2})\s*[.\(~월]/);
  if (m) return valid(fallbackYear, +m[1], +m[2]);
  return null;
}

function parsePostDate(text: string): Date | null {
  const t = (text || "").trim();
  let m = t.match(/(20\d{2})\s*[.\-]\s*(\d{1,2})\s*[.\-]\s*(\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = t.match(/(\d{2})\s*[.\-]\s*(\d{1,2})\s*[.\-]\s*(\d{1,2})/);
  if (m) return valid(2000 + +m[1], +m[2], +m[3]);
  return null;
}

// ---------------------------------------------------------------------
// fetch (인코딩 처리 + SSRF: 경찰청 도메인 화이트리스트만 허용)
// ---------------------------------------------------------------------
async function fetchHtml(url: string, encoding?: string): Promise<string> {
  const host = new URL(url).hostname;
  if (!POLICE_ASSEMBLY_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    throw new Error(`허용되지 않은 도메인: ${host}`);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return new TextDecoder(encoding || "utf-8").decode(buf);
  } finally {
    clearTimeout(timer);
  }
}

export interface SourceCrawlResult {
  site: AssemblySite;
  ok: boolean;
  raws: RawAssembly[];
  latestPostDate?: Date;
  latestEventDate?: Date;
  message?: string;
}

const MAX_ROWS = 15;

/** 단일 지방청 게시판 표 파싱 */
async function crawlSite(site: AssemblySite, now: Date): Promise<SourceCrawlResult> {
  if (!site.supported) {
    return { site, ok: false, raws: [], message: site.note || "미지원(정적 크롤 불가)" };
  }
  try {
    const html = await fetchHtml(site.listUrl, site.encoding);
    const $ = cheerio.load(html);
    $("script,style").remove();

    // 가장 행이 많은 표 = 목록 표
    let best: any = null;
    let bestRows = 0;
    $("table").each((_, t) => {
      const r = $(t).find("tr").length;
      if (r > bestRows) { bestRows = r; best = $(t); }
    });
    if (!best || bestRows < 2) {
      return { site, ok: false, raws: [], message: "목록 표를 찾지 못함" };
    }

    // 헤더로 '제목/작성일' 열 인덱스 추정
    const headers: string[] = best.find("th").map((_: number, e: any) => $(e).text().trim()).get();
    const titleCol = headers.findIndex((h: string) => /제\s*목|제목/.test(h));
    const dateCol = headers.findIndex((h: string) => /작성일|등록일|작성일자|일자/.test(h));

    const raws: RawAssembly[] = [];
    let latestPostDate: Date | undefined;
    let latestEventDate: Date | undefined;

    const rows = best.find("tr").toArray();
    for (const tr of rows) {
      const tds = $(tr).find("td").toArray();
      if (tds.length < 2) continue; // 헤더/빈 행
      const cellText = (i: number) => (i >= 0 && i < tds.length ? $(tds[i]).text().replace(/\s+/g, " ").trim() : "");

      // 제목/링크: 헤더 추정 실패 시 a 태그가 있는 셀에서 추출
      let titleIdx = titleCol;
      if (titleIdx < 0 || titleIdx >= tds.length || !$(tds[titleIdx]).text().trim()) {
        titleIdx = tds.findIndex((td) => $(td).find("a").length > 0);
      }
      if (titleIdx < 0) titleIdx = Math.min(1, tds.length - 1);
      const titleCell = $(tds[titleIdx]);
      const title = titleCell.text().replace(/\s+/g, " ").trim();
      if (!title || !/집회|시위|집호/.test(title)) continue;

      const postDate =
        parsePostDate(cellText(dateCol)) ||
        parsePostDate(tds.map((_, i) => cellText(i)).filter(Boolean).join(" "));
      const fallbackYear = (postDate ?? now).getFullYear();
      const eventDate = parseEventDateFromTitle(title, fallbackYear);
      if (!eventDate) continue; // 제목에 집회 날짜가 없으면(공지/안내문) 건너뜀

      const href = titleCell.find("a").attr("href");
      let sourceUrl = site.listUrl;
      if (href && !/^(javascript:|#)/i.test(href)) {
        try { sourceUrl = new URL(href, site.listUrl).href; } catch { /* keep listUrl */ }
      }

      const locationName = `${site.region} 일원 (게시물 본문·첨부 참조)`;
      const contentHash = assemblyContentHash({
        eventDate, locationName, organizerName: undefined, sourceUrl: `${site.key}|${title}`,
      });

      raws.push({
        eventDate,
        title,
        locationName,
        district: site.region,
        topicSummary: title,
        sourceName: site.sourceName,
        sourceUrl,
        sourcePostTitle: title,
        sourcePublishedAt: postDate ?? undefined,
        attachmentUrls: [],
        contentHash,
      });
      if (!latestPostDate || (postDate && postDate > latestPostDate)) latestPostDate = postDate ?? latestPostDate;
      if (!latestEventDate || eventDate > latestEventDate) latestEventDate = eventDate;
      if (raws.length >= MAX_ROWS) break;
    }

    if (raws.length === 0) {
      return { site, ok: false, raws: [], message: "표는 찾았으나 집회 게시물 추출 0건(구조 변경 가능)" };
    }
    return { site, ok: true, raws, latestPostDate, latestEventDate };
  } catch (e) {
    return { site, ok: false, raws: [], message: (e as Error)?.message || "수집 실패" };
  }
}

/** 전국 지방청 게시판 수집 — 출처별 결과 포함 */
export async function crawlAllRegionalAssemblies(now: Date = new Date()): Promise<SourceCrawlResult[]> {
  const results: SourceCrawlResult[] = [];
  for (const site of ASSEMBLY_SITES) {
    results.push(await crawlSite(site, now));
    await new Promise((r) => setTimeout(r, 300)); // 과도한 요청 방지
  }
  return results;
}

/** AssemblyScheduleProvider 호환 — collect() 는 전체 raws 평탄화 반환 */
export class RegionalAssemblyBoardsProvider implements AssemblyScheduleProvider {
  readonly name = "RegionalAssemblyBoardsProvider";
  private lastResults: SourceCrawlResult[] = [];

  async collect(): Promise<RawAssembly[]> {
    this.lastResults = await crawlAllRegionalAssemblies();
    return this.lastResults.flatMap((r) => r.raws);
  }

  getResults(): SourceCrawlResult[] {
    return this.lastResults;
  }
}
