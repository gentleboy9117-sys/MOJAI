"use client";
import { useMemo, useState } from "react";
import { Landmark, ExternalLink, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";
import { IssueSubNav } from "@/components/issues/IssueSubNav";
import { formatDate } from "@/lib/utils";

interface ArticleRow {
  id: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  originalUrl: string;
  summary?: string | null;
  primaryRegion?: string | null;
}

const CRIME = "형사사법제도/정책";

// 사설/오피니언 형식(제목 머리표 또는 표현)
const OPINION_RE = /^\s*[\[【]?\s*(사설|칼럼|기고|시선|기자수첩|데스크|오피니언|시론|논단|특별기고|전문가\s*칼럼)\s*[\]】]?/;
// 주요 주제 후보(우선순위 순) — 그날 기사에 매칭되는 주제만 표시되어 매일 달라짐
const TOPICS: { key: string; re: RegExp }[] = [
  { key: "보완수사권 관련", re: /보완수사권|보완수사/ },
  { key: "검찰개혁·검찰폐지 관련", re: /검찰\s*개혁|검찰개혁|검찰\s*폐지|검찰\s*해체|검찰\s*존치|사법\s*개혁/ },
  { key: "공소청·수사기소 분리 관련", re: /공소청|기소청|수사청|중수청|중대범죄수사청|수사[·\s]*기소\s*분리|기소\s*분리|수사·기소/ },
  { key: "수사권 조정·검경 관련", re: /수사권\s*조정|검경\s*수사권|검수완박|검수원복|수사지휘/ },
  // 특검이 사건을 처리 중이면 공수처가 사건 당사자여도 '특검 관련'으로 분류(공수처보다 우선)
  { key: "특검 관련", re: /특검|특별검사|내란\s*특검|종합\s*특검/ },
  { key: "공수처 관련", re: /공수처|고위공직자범죄수사처/ },
  { key: "주요 인사 관련", re: /검찰총장|검사장|고검장|지검장|검찰\s*인사|검사\s*인사|인선|내정|총장\s*후보|수뇌부|임명/ },
  { key: "입법·법개정 관련", re: /법안|입법|개정안|법\s*개정|본회의|법사위|발의|국회\s*통과/ },
];

interface TopicGroup { key: string; rank: number; articles: ArticleRow[] }

/** [이슈] 제도/정책 이슈 — 그날 기사를 주요 주제별로 묶어 표시(관할 분류 없음) */
export default function PolicyIssuesPage() {
  const { data, loading } = useApi<ArticleRow[]>(
    `/api/articles?crimeType=${encodeURIComponent(CRIME)}&period=all&limit=300`,
  );
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const { groups, total } = useMemo(() => {
    // 동일 기사(제목 기준) 1건으로 묶기
    const norm = (t: string) => t.split(" - ")[0].replace(/\[[^\]]*\]/g, "").replace(/[\s·.,'"“”()…\-]/g, "").toLowerCase();
    const seen = new Set<string>();
    const rows: ArticleRow[] = [];
    for (const a of data ?? []) {
      const k = norm(a.title) || a.id;
      if (seen.has(k)) continue;
      seen.add(k);
      rows.push(a);
    }

    // 주제 배정: 사설/오피니언(형식) 우선, 그 외 주제 우선순위 매칭, 미매칭은 기타
    const map = new Map<string, ArticleRow[]>();
    const push = (key: string, a: ArticleRow) => { if (!map.has(key)) map.set(key, []); map.get(key)!.push(a); };
    for (const a of rows) {
      const text = `${a.title} ${a.summary ?? ""}`;
      if (OPINION_RE.test(a.title)) { push("사설·오피니언", a); continue; }
      const topic = TOPICS.find((t) => t.re.test(text));
      push(topic ? topic.key : "기타 제도/정책", a);
    }

    // 정렬: 주제 그룹(기사 수 desc) → 사설·오피니언 → 기타
    const out: TopicGroup[] = [];
    for (const [key, arts] of map.entries()) {
      const rank = key === "기타 제도/정책" ? 3 : key === "사설·오피니언" ? 2 : 1;
      out.push({ key, rank, articles: arts });
    }
    out.sort((a, b) => a.rank - b.rank || b.articles.length - a.articles.length);
    return { groups: out, total: rows.length };
  }, [data]);

  return (
    <div className="mx-auto max-w-content space-y-4 p-5">
      <div>
        <h1 className="flex items-center gap-2 text-heading-m text-ink-title">
          <Landmark className="h-5 w-5 text-primary" /> 제도/정책 이슈
        </h1>
        <p className="text-body-s text-ink-muted">
          검찰개혁·보완수사권·공소청·입법 등 <b>형사사법제도·정책</b> 보도를 그날의 <b>주요 주제별</b>로 묶어 표시 {!loading && `· ${total}건`}
        </p>
      </div>
      <IssueSubNav />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : !groups.length ? (
        <EmptyState icon={<Landmark className="h-8 w-8" />} title="제도/정책 관련 보도가 없습니다" desc="관련 기사가 수집되면 표시됩니다." />
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const isOpen = open.has(g.key);
            return (
              <div key={g.key} className="overflow-hidden rounded-lg border border-line">
                <button
                  onClick={() => toggle(g.key)}
                  className="flex w-full items-center gap-2 bg-gray-5 px-3 py-2.5 text-left transition hover:bg-gray-10"
                  aria-expanded={isOpen}
                >
                  <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  <span className="text-body-s font-bold text-ink-title">{g.key}</span>
                  <Badge tone="outline">{g.articles.length}건</Badge>
                </button>
                {isOpen && (
                  <ul className="divide-y divide-line border-t border-line">
                    {g.articles.map((a) => (
                      <li key={a.id} className="px-4 py-2.5">
                        <a
                          href={a.originalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-start gap-1.5 text-body-s font-medium text-ink-title hover:text-primary"
                        >
                          <span className="hover:underline">{a.title.split(" - ")[0]}</span>
                          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                        </a>
                        <p className="mt-0.5 text-detail text-ink-muted">
                          {a.sourceName}
                          {a.publishedAt ? ` · ${formatDate(a.publishedAt)}` : ""}
                        </p>
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
