// 동일 기사(제목 기준) 묶음 — 대표 1건 + 동일 보도 매체 링크 목록
export interface Source { sourceName: string; url: string }
export interface Deduped<T> { rep: T; sources: Source[]; count: number }

function normTitle(t: string): string {
  return t.split(" - ")[0].replace(/\[[^\]]*\]/g, "").replace(/[\s·.,'"“”()…\-]/g, "").toLowerCase();
}

export function dedupeArticles<T extends { id: string; title: string; sourceName: string; originalUrl: string }>(rows: T[]): Deduped<T>[] {
  const map = new Map<string, Deduped<T>>();
  for (const a of rows) {
    const k = normTitle(a.title) || a.id;
    if (!map.has(k)) map.set(k, { rep: a, sources: [], count: 0 });
    const g = map.get(k)!;
    g.count++;
    if (a.originalUrl && !g.sources.some((s) => s.url === a.originalUrl)) g.sources.push({ sourceName: a.sourceName, url: a.originalUrl });
  }
  return [...map.values()];
}
