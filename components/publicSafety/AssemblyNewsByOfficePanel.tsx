"use client";
import { Fragment, useMemo, useState } from "react";
import { Newspaper, ExternalLink, Building2, CalendarDays, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { cn, formatDate } from "@/lib/utils";

interface NewsArticle {
  id: string;
  title: string;
  sourceName: string;
  publishedAt: string | null;
  url: string;
  region: string | null;
  sources?: { sourceName: string; url: string }[];
}
interface OfficeGroup {
  officeId: string | null;
  officeName: string;
  highOffice: string | null;
  count: number;
  articles: NewsArticle[];
}
interface Resp {
  selectedDate: string;
  today: string;
  availableDates: { date: string; count: number }[];
  total: number;
  officeCount: number;
  groups: OfficeGroup[];
}

/** [공안] 관할별 보도 패널 — 집회·시위/선거/노동 공용. 발생 지역 기준 관할별(고검-지검-지청) · 날짜별 */
export function AssemblyNewsByOfficePanel({
  kind = "assembly",
  title = "집회·시위 보도",
  crimeType,
  crimeSubtype,
}: {
  kind?: "assembly" | "election" | "labor";
  title?: string;
  crimeType?: string; // 지정 시 해당 범죄유형 보도(관할별)
  crimeSubtype?: string; // 공판의 기저 범죄유형 등
} = {}) {
  const [date, setDate] = useState<string>(""); // "" → API가 오늘로 기본 처리
  const [office, setOffice] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setOpen((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const qs = new URLSearchParams(crimeType ? {} : { kind });
  if (crimeType) qs.set("crimeType", crimeType);
  if (crimeSubtype) qs.set("crimeSubtype", crimeSubtype);
  if (date) qs.set("date", date);
  const url = `/api/public-safety/assembly-news?${qs.toString()}`;
  const { data, loading } = useApi<Resp>(url);

  const selected = data?.selectedDate ?? date ?? "";
  const isToday = data ? data.selectedDate === data.today : false;

  // 날짜 옵션(선택일이 목록에 없으면 0건으로 추가)
  const dateOptions = useMemo(() => {
    const list = (data?.availableDates ?? []).slice();
    if (data && !list.some((d) => d.date === data.selectedDate)) {
      list.unshift({ date: data.selectedDate, count: 0 });
    }
    return list;
  }, [data]);

  const groups = useMemo(() => {
    const all = data?.groups ?? [];
    return office === "all" ? all : all.filter((g) => (g.officeId ?? "__none__") === office);
  }, [data, office]);

  return (
    <Card>
      <CardHeader className="flex-wrap gap-2">
        <CardTitle className="flex items-center gap-1.5">
          <Newspaper className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="기사 제목 검색"
          className="order-3 min-w-0 flex-1 basis-full rounded-md border border-line px-2 py-1 text-detail outline-none focus:border-primary lg:order-none lg:basis-auto"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-detail text-ink-muted">
            <CalendarDays className="h-3.5 w-3.5" /> 날짜
          </span>
          <Select
            value={selected}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 w-auto text-caption"
          >
            {dateOptions.map((d) => (
              <option key={d.date} value={d.date}>
                {d.date}{d.date === data?.today ? " (오늘)" : ""} · {d.count}건
              </option>
            ))}
          </Select>
          <Select value={office} onChange={(e) => setOffice(e.target.value)} className="h-8 w-auto text-caption">
            <option value="all">전체 관할</option>
            {(data?.groups ?? []).map((g) => (
              <option key={g.officeId ?? "none"} value={g.officeId ?? "__none__"}>
                {g.officeName} ({g.count})
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-detail text-ink-muted">
          공개 언론기사를 <b>기사상 발생 지역</b> 기준으로 검찰청 관할(고검-지검-지청 순)별로 정리합니다. 동일 기사는 1건으로 묶고, 제목을 누르면 원문으로 이동합니다.
        </p>

        {(() => {
          const q = query.trim();
          const display = groups
            .map((g) => ({ ...g, arts: q ? g.articles.filter((a) => a.title.includes(q)) : g.articles }))
            .filter((g) => !q || g.arts.length > 0);
          if (loading) return <div className="py-8 text-center"><Spinner /></div>;
          if (!display.length) {
            return q ? (
              <EmptyState title={`‘${q}’ 검색 결과가 없습니다`} desc="다른 검색어나 날짜를 시도해 보세요." />
            ) : (
              <EmptyState
                title={isToday ? `오늘 ${title}가 없습니다` : `${selected} ${title}가 없습니다`}
                desc="상단에서 다른 날짜를 선택해 보세요."
              />
            );
          }
          return (
          <div className="space-y-3">
            {display.map((g, i) => {
              const prev = display[i - 1];
              const showHigh = office === "all" && g.highOffice && g.highOffice !== prev?.highOffice;
              const showEtc = office === "all" && !g.highOffice && (i === 0 || display[i - 1].highOffice);
              const key = g.officeId ?? "__none__";
              const isOpen = q ? true : open.has(key);
              return (
                <Fragment key={g.officeId ?? "none"}>
                  {showHigh && (
                    <h3 className="mt-2 border-b-2 border-primary/30 pb-1 text-body-s font-bold text-primary">
                      {g.highOffice}
                    </h3>
                  )}
                  {showEtc && (
                    <h3 className="mt-2 border-b-2 border-line pb-1 text-body-s font-bold text-ink-muted">
                      관할 미상
                    </h3>
                  )}
                  <div className="rounded-lg border border-line">
                    <button onClick={() => toggle(key)} className="flex w-full items-center gap-1.5 border-b border-line bg-gray-5 px-3 py-2 text-left hover:bg-gray-10">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-body-s font-bold text-ink-title">{g.officeName}</span>
                      <Badge tone="outline">{g.arts.length}건</Badge>
                      <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-ink-disabled transition-transform", !isOpen && "-rotate-90")} />
                    </button>
                    {isOpen && (
                    <ul className="divide-y divide-line">
                      {g.arts.map((a) => (
                        <li key={a.id} className="px-3 py-2.5">
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-start gap-1.5 text-body-s font-medium text-ink-title hover:text-primary"
                          >
                            <span className="hover:underline">{a.title}</span>
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                          </a>
                          <p className="mt-0.5 text-detail text-ink-muted">
                            {a.sourceName}
                            {a.publishedAt ? ` · ${formatDate(a.publishedAt)}` : ""}
                            {a.region ? ` · ${a.region}` : ""}
                            {a.sources && a.sources.length > 1 ? ` · 동일 보도 ${a.sources.length}건` : ""}
                          </p>
                          {a.sources && a.sources.length > 1 && (
                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                              {a.sources.map((s, i) => (
                                <a
                                  key={i}
                                  href={s.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-detail text-blue-60 hover:underline"
                                >
                                  · {s.sourceName}
                                </a>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
