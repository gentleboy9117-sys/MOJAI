"use client";
import { useMemo, useState } from "react";
import { Building2, Gavel, ChevronDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { TrialSubNav } from "@/components/trials/TrialSubNav";
import { OFFICE_ORDER } from "@/lib/publicSafety/assemblyJurisdictionClassifier";
import { dedupeArticles } from "@/lib/client/dedupeArticles";
import { formatDate } from "@/lib/utils";

interface ArticleRow {
  id: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  originalUrl: string;
  primaryOfficeName?: string | null;
  crimeSubtype?: string | null;
}

const UNCLASSIFIED = "미분류 (관할 미상)";
interface OfficeGroup { name: string; articles: ArticleRow[] }

export default function TrialOfficesPage() {
  const { data, loading } = useApi<ArticleRow[]>("/api/articles?crimeType=공판&period=all&limit=300");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const groups = useMemo<OfficeGroup[]>(() => {
    const byOffice = new Map<string, ArticleRow[]>();
    for (const r of data ?? []) {
      const name = r.primaryOfficeName || UNCLASSIFIED;
      if (!byOffice.has(name)) byOffice.set(name, []);
      byOffice.get(name)!.push(r);
    }
    return [...byOffice.entries()]
      .map(([name, articles]) => ({
        name,
        articles: [...articles].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
      }))
      .sort((a, b) => {
        const oa = a.name === UNCLASSIFIED ? 99999 : OFFICE_ORDER[a.name] ?? 9999;
        const ob = b.name === UNCLASSIFIED ? 99999 : OFFICE_ORDER[b.name] ?? 9999;
        return oa - ob;
      });
  }, [data]);

  return (
    <div className="mx-auto max-w-content space-y-4 p-5">
      <div>
        <h1 className="flex items-center gap-2 text-heading-m text-ink-title">
          <Building2 className="h-5 w-5 text-primary" /> 검찰청별 보기
        </h1>
        <p className="text-body-s text-ink-muted">검찰청을 누르면 해당 청의 공판 보도가 펼쳐집니다 (공개 보도 기준)</p>
      </div>
      <TrialSubNav />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : !groups.length ? (
        <EmptyState icon={<Gavel className="h-8 w-8" />} title="공판 관련 보도가 없습니다" desc="공판 관련 기사가 수집되면 검찰청별로 집계됩니다." />
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const isOpen = open.has(g.name);
            return (
              <div key={g.name} className="overflow-hidden rounded-lg border border-line">
                <button
                  onClick={() => toggle(g.name)}
                  className="flex w-full items-center gap-2 bg-gray-5 px-3 py-2.5 text-left transition hover:bg-gray-10"
                  aria-expanded={isOpen}
                >
                  <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  <Building2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-body-s font-bold text-ink-title">{g.name}</span>
                  <Badge tone="outline">{dedupeArticles(g.articles).length}건</Badge>
                </button>
                {isOpen && (
                  <ul className="divide-y divide-line border-t border-line">
                    {dedupeArticles(g.articles).map((d) => (
                      <li key={d.rep.id} className="px-4 py-2.5">
                        <a
                          href={d.rep.originalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-start gap-1.5 text-body-s font-medium text-ink-title hover:text-primary"
                        >
                          <span className="hover:underline">{d.rep.title.split(" - ")[0]}</span>
                          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                        </a>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-detail text-ink-muted">
                          {d.rep.crimeSubtype && <Badge tone="navy">{d.rep.crimeSubtype}</Badge>}
                          <span>{d.rep.sourceName}{d.rep.publishedAt ? ` · ${formatDate(d.rep.publishedAt)}` : ""}</span>
                          {d.count > 1 && <span className="text-blue-60">· 동일 보도 {d.count}건</span>}
                        </p>
                        {d.count > 1 && (
                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                            {d.sources.map((s, i) => (
                              <a key={i} href={s.url} target="_blank" rel="noreferrer" className="text-detail text-blue-60 hover:underline">· {s.sourceName}</a>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
