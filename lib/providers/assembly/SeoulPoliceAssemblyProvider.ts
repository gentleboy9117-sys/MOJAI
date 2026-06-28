// =====================================================================
// 서울경찰청 집회·시위 공개일정 Provider
//  * 운영: 서울경찰청 공개 게시판(집회·시위 일정)의 '공개 일정' 만 수집.
//  * 본 MVP: 외부 수집(crawl)은 stub 이며, 오프라인 데모용 샘플 JSON 을 사용한다.
//  * 집회·시위는 헌법상 기본권 행사일 수 있으므로 범죄로 단정하지 않는다.
//    참가자 식별/성향/배후 추론은 일절 하지 않는다.
// =====================================================================
import { promises as fs } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { safeFetch } from "@/lib/security/ssrfGuard";
import {
  type AssemblyScheduleProvider,
  type RawAssembly,
  assemblyContentHash,
} from "./AssemblyScheduleProvider";

const SAMPLE_PATH = path.join(process.cwd(), "data", "sample-assemblies.json");

const LIST_URL =
  process.env.SEOUL_ASSEMBLY_LIST_URL || "https://smpa.go.kr/user/nd54882.do";

const USER_AGENT =
  process.env.COLLECT_USER_AGENT ||
  "ProsecutionPlanningAIWorkbench/0.1 (public-assembly-schedule)";

const DAY = 86400000;

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** 자정 기준 날짜 + N일 */
function dayOffset(days: number, base: Date): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  return new Date(d.getTime() + days * DAY);
}

export class SeoulPoliceAssemblyProvider implements AssemblyScheduleProvider {
  readonly name = "SeoulPoliceAssemblyProvider";

  async collect(): Promise<RawAssembly[]> {
    // 1) 실 수집(crawl) 시도 — 현재는 stub 이라 보통 [] 를 돌려준다.
    const crawled = await this.crawl().catch(() => []);
    if (crawled.length > 0) return crawled;
    // 2) 폴백: 오프라인 데모용 샘플 로드
    return this.loadSample();
  }

  /** 오프라인 데모용 샘플 로드 (실패 시 []) */
  private async loadSample(): Promise<RawAssembly[]> {
    try {
      const raw = await fs.readFile(SAMPLE_PATH, "utf-8");
      const json = JSON.parse(raw);
      const arr: any[] = Array.isArray(json) ? json : json?.assemblies;
      if (!Array.isArray(arr)) return [];
      const now = new Date();
      return arr.map((r: any): RawAssembly => {
        const eventDate = dayOffset(
          typeof r.daysFromNow === "number" ? r.daysFromNow : 0,
          now,
        );
        const sourceUrl = r.sourceUrl ? String(r.sourceUrl) : LIST_URL;
        return {
          eventDate,
          startTime: r.startTime ? String(r.startTime) : undefined,
          endTime: r.endTime ? String(r.endTime) : undefined,
          title: String(r.title || "공개 집회·시위 일정"),
          locationName: String(r.locationName || ""),
          address: r.address ? String(r.address) : undefined,
          district: r.district ? String(r.district) : undefined,
          policeStationName: r.policeStationName ? String(r.policeStationName) : undefined,
          organizerName: r.organizerName ? String(r.organizerName) : undefined,
          expectedParticipants: r.expectedParticipants
            ? String(r.expectedParticipants)
            : undefined,
          marchRoute: r.marchRoute ? String(r.marchRoute) : undefined,
          topicSummary: r.topicSummary ? String(r.topicSummary) : undefined,
          sourceName: r.sourceName ? String(r.sourceName) : "서울경찰청",
          sourceUrl,
          sourcePostTitle: r.sourcePostTitle ? String(r.sourcePostTitle) : "오늘의 집회·시위 일정",
          sourcePublishedAt: toDate(r.sourcePublishedAt) ?? now,
          rawText: r.rawText ? String(r.rawText) : undefined,
          attachmentUrls: Array.isArray(r.attachmentUrls)
            ? r.attachmentUrls.map(String)
            : [],
          contentHash: assemblyContentHash({
            eventDate,
            startTime: r.startTime ? String(r.startTime) : undefined,
            locationName: String(r.locationName || ""),
            organizerName: r.organizerName ? String(r.organizerName) : undefined,
            sourceUrl,
          }),
        };
      });
    } catch (e) {
      console.warn(
        "[SeoulPoliceAssemblyProvider] loadSample failed:",
        (e as Error)?.message,
      );
      return [];
    }
  }

  /**
   * 실 수집 stub (MVP).
   *  * 서울경찰청 공개 게시판에서 '집회·시위 공개 일정' 만 수집하기 위한 자리표시.
   *  * 게시판 구조(HWP/PDF 첨부 중심)는 기관별로 상이하므로, 본 MVP 에서는
   *    safeFetch + cheerio 로 목록 접근만 시도하고 파싱이 불확실하면 [] 를 반환한다.
   *  * 절대 throw 하지 않는다(앱 안정성). 운영 확장 시 첨부 파서와 연동한다.
   */
  async crawl(): Promise<RawAssembly[]> {
    try {
      const res = await safeFetch(LIST_URL, {
        timeoutMs: 15000,
        init: { headers: { "User-Agent": USER_AGENT } },
      });
      if (!res.ok) {
        console.warn(`[SeoulPoliceAssemblyProvider] crawl ${res.status} for ${LIST_URL}`);
        return [];
      }
      const html = await res.text();
      // 구조 파싱은 MVP 범위 밖. 목록 접근 가능 여부만 확인하고 [] 반환.
      try {
        cheerio.load(html);
      } catch {
        /* noop */
      }
      console.warn(
        "[SeoulPoliceAssemblyProvider] crawl 은 MVP stub 입니다 — 첨부(HWP/PDF) 파싱 미구현, [] 반환.",
      );
      return [];
    } catch (e) {
      // allowlist 차단/오프라인 등 — 절대 throw 하지 않는다.
      console.warn("[SeoulPoliceAssemblyProvider] crawl 실패(무시):", (e as Error)?.message);
      return [];
    }
  }
}

let cached: AssemblyScheduleProvider | null = null;

/** Provider 팩토리 (현재 서울경찰청 단일) */
export function getAssemblyProvider(): AssemblyScheduleProvider {
  if (cached) return cached;
  cached = new SeoulPoliceAssemblyProvider();
  return cached;
}
