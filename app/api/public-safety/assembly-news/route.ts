import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ok, handle } from "@/lib/api/response";
import { getJurisdictionOffices } from "@/lib/publicSafety/runAssemblyPipeline";
import {
  classifyAllOffices,
  OFFICE_ORDER,
  OFFICE_TO_HIGH,
} from "@/lib/publicSafety/assemblyJurisdictionClassifier";
import { appToday } from "@/lib/appToday";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY = 86400000;
const WINDOW_DAYS = 120; // 날짜 선택용 후보 범위

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

// [공안] 집회·시위 관련 보도 — 발생 지역 기준 검찰청 관할별(고검-지검-지청 순) + 날짜별
//  * 관할은 기사 제목·요약의 '발생 지역'으로 판단(인물·직함 제외). 검찰청 관할표 키워드 매칭은 생략.
//  * 기본은 오늘 기사, date=YYYY-MM-DD 로 특정 날짜 선택.
export async function GET(req: NextRequest) {
  return handle(async () => {
    const dateParam = req.nextUrl.searchParams.get("date");
    const kind = (req.nextUrl.searchParams.get("kind") || "assembly") as "assembly" | "election" | "labor";
    // 임의 범죄유형/기저유형 보도 보기(이슈·공판 모니터링 '범죄유형별 보기 → 목록'에서 사용)
    const crimeType = req.nextUrl.searchParams.get("crimeType");
    const crimeSubtype = req.nextUrl.searchParams.get("crimeSubtype");
    const since = new Date(Date.now() - WINDOW_DAYS * DAY);
    // 관할 그룹핑을 primaryOffice 기준으로 할지(임의 crimeType·선거·노동) / 발생장소 기준(집회)
    const byPrimaryOffice = !!crimeType || kind === "election" || kind === "labor";

    // 필터: crimeType 지정 시 그 유형(+기저유형), 아니면 종류별(집회/선거/노동)
    const kindFilter = crimeType
      ? (crimeSubtype ? { crimeType, crimeSubtype } : { crimeType })
      : kind === "election"
        ? { crimeType: "선거범죄" }
        : kind === "labor"
          ? { crimeType: "노동/중대재해범죄" }
          : {
              OR: [
                { title: { contains: "집회" } },
                { title: { contains: "시위" } },
                { summary: { contains: "집회" } },
                { summary: { contains: "시위" } },
              ],
            };

    const articles = await prisma.article.findMany({
      where: { AND: [kindFilter, { publishedAt: { gte: since } }] },
      orderBy: { publishedAt: "desc" },
      take: 1500,
      select: {
        id: true, title: true, sourceName: true, publishedAt: true, originalUrl: true, resolvedUrl: true, primaryRegion: true, summary: true,
        primaryOfficeId: true, assemblyOfficeName: true, assemblyOffices: true, assemblyLocationHint: true, bodyEnrichedAt: true,
      },
    });

    // 집회 탭 정제: '집회시설'(건물)·스포츠·문화·오피니언 등 단순 언급 오매칭 제거
    const IRRELEVANT_RE =
      /핀수영|수영|선수권|메달|금\s*\d+\s*개|은\s*\d+\s*개|동\s*\d+\s*개|종합\s*\d+\s*위|올림픽|월드컵|아시안게임|아시안컵|프로야구|프로축구|야구|축구|배구|농구|골프|테니스|마라톤|육상|리그|우승|준우승|질주|예선|결승|[48]강|국가대표|선수단|체전|구단|감독|\[시선\]|\[칼럼\]|\[사설\]|\[기고\]|\[리뷰\]|\[인터뷰\]|\[포토\]|\[화보\]|영화|드라마|콘서트|공연|앨범|음반|배우|가수|아이돌|예능/;
    const isRealAssembly = (a: { title: string; summary: string | null }) => {
      const full = `${a.title} ${a.summary ?? ""}`;
      if (IRRELEVANT_RE.test(full)) return false; // 스포츠·문화·오피니언 기사 제외
      // 건물/시설 의미('문화·집회시설' 등) 제거 후 실제 집회·시위 언급만 인정
      const s = full.replace(/문화[·\s]*집회\s*시설|집회\s*시설|집회장|집회공간|집회실/g, " ");
      return /집회|시위/.test(s);
    };
    const arts = !byPrimaryOffice ? articles.filter(isRealAssembly) : articles;

    // 날짜별 후보(내림차순) + 건수
    const dateCounts = new Map<string, number>();
    for (const a of arts) {
      const k = dayKey(a.publishedAt);
      dateCounts.set(k, (dateCounts.get(k) ?? 0) + 1);
    }
    const availableDates = [...dateCounts.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((x, y) => (x.date < y.date ? 1 : -1));

    // 선택 날짜: 지정값 > 오늘 > 가장 최근 보유일
    const today = dayKey(appToday());
    let selectedDate = dateParam || today;
    if (!dateCounts.has(selectedDate)) {
      // 오늘 기사가 없으면 빈 결과를 주되, 선택값은 유지(프론트에서 안내)
      selectedDate = dateParam || today;
    }

    const dayArticles = articles.filter((a) => dayKey(a.publishedAt) === selectedDate);

    // 중복 기사(같은 내용, 다른 매체/쿼리) 1개로 합치기 — 제목 정규화 키
    const normTitle = (t: string) =>
      t.split(" - ")[0].replace(/\[[^\]]*\]/g, "").replace(/[\s·.,'"“”()…\-]/g, "").toLowerCase();
    // 제목 끝 " - 매체" 에서 발행사 추출(없으면 sourceName)
    const publisherOf = (a: any): string =>
      a.title.includes(" - ") ? a.title.split(" - ").slice(1).join(" - ").trim() : a.sourceName;
    const uniq = new Map<string, { a: any; sources: { sourceName: string; url: string }[] }>();
    for (const a of dayArticles) {
      const k = normTitle(a.title) || a.id;
      if (!uniq.has(k)) uniq.set(k, { a, sources: [] });
      const u = uniq.get(k)!;
      const pub = publisherOf(a);
      if (!u.sources.some((s) => s.sourceName === pub)) u.sources.push({ sourceName: pub, url: a.resolvedUrl ?? a.originalUrl });
    }

    // 발생 지역 기준 관할 분류(인물·직함 제외 위해 경계검사 + 관할표 키워드 생략)
    const offices = await getJurisdictionOffices(prisma);
    const officeById = new Map(offices.map((o) => [o.id, o.name]));
    const groupsMap = new Map<string, any>();
    const addToGroup = (officeId: string | null, officeName: string, item: any) => {
      const key = officeId ?? "__none__";
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          officeId, officeName,
          highOffice: officeId ? OFFICE_TO_HIGH[officeName] ?? null : null,
          order: officeId ? OFFICE_ORDER[officeName] ?? 9998 : 9999,
          count: 0, articles: [],
        });
      }
      const g = groupsMap.get(key);
      g.count++;
      g.articles.push(item);
    };

    for (const { a, sources } of uniq.values()) {
      let offs: { officeId: string; officeName: string; hint: string }[] = [];
      if (!byPrimaryOffice) {
        // 집회: 본문 기반 복수 관할(발생장소 여러 곳이면 모든 관할에 중복)
        if (a.bodyEnrichedAt) {
          try { offs = a.assemblyOffices ? JSON.parse(a.assemblyOffices) : []; } catch { offs = []; }
        } else {
          offs = classifyAllOffices(`${a.title} ${a.summary ?? ""}`, offices);
        }
      } else {
        // 선거·노동: 기사 분류 관할(primaryOffice) 기준
        const name = a.primaryOfficeId ? officeById.get(a.primaryOfficeId) : undefined;
        offs = name && a.primaryOfficeId ? [{ officeId: a.primaryOfficeId, officeName: name, hint: "" }] : [];
      }
      const makeItem = (hint: string | null) => ({
        id: a.id, title: a.title.split(" - ")[0].trim(), sourceName: publisherOf(a),
        publishedAt: a.publishedAt, url: a.resolvedUrl ?? a.originalUrl, region: a.primaryRegion,
        jurisdictionReason: hint,
        sources, // 동일 기사를 보도한 매체 링크(중복 통합)
      });
      if (offs.length === 0) addToGroup(null, "미분류 (관할 미상)", makeItem(null));
      else for (const o of offs) addToGroup(o.officeId, o.officeName, makeItem(o.hint));
    }

    // 고검-지검-지청 순 정렬(미분류 맨 뒤)
    const groups = [...groupsMap.values()].sort((x, y) => x.order - y.order);

    return ok({
      selectedDate,
      today,
      availableDates,
      total: uniq.size,
      officeCount: groups.filter((g) => g.officeId).length,
      groups,
    });
  });
}
