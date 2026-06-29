"use client";
import { useMemo } from "react";

// 검찰청 소재 도시 좌표(경도, 위도) — 지검·고검·주요 지청
const COORDS: Record<string, [number, number]> = {
  서울: [126.98, 37.57], 의정부: [127.05, 37.74], 고양: [126.83, 37.66], 남양주: [127.21, 37.64],
  인천: [126.70, 37.46], 부천: [126.77, 37.50], 수원: [127.01, 37.27], 성남: [127.13, 37.42],
  안양: [126.95, 37.39], 안산: [126.83, 37.32], 평택: [127.09, 36.99], 여주: [127.63, 37.30],
  춘천: [127.73, 37.88], 강릉: [128.88, 37.75], 원주: [127.92, 37.34], 속초: [128.59, 38.21], 영월: [128.46, 37.18],
  대전: [127.38, 36.35], 천안: [127.11, 36.81], 공주: [127.12, 36.45], 논산: [127.10, 36.19], 서산: [126.45, 36.78], 홍성: [126.66, 36.60],
  청주: [127.49, 36.64], 충주: [127.93, 36.97], 제천: [128.19, 37.13], 영동: [127.78, 36.17],
  대구: [128.60, 35.87], 안동: [128.73, 36.57], 경주: [129.22, 35.86], 포항: [129.36, 36.02], 김천: [128.11, 36.14], 상주: [128.16, 36.41], 의성: [128.70, 36.35], 영덕: [129.37, 36.42],
  부산: [129.08, 35.18], 울산: [129.31, 35.54], 창원: [128.68, 35.23], 진주: [128.08, 35.19], 통영: [128.42, 34.85], 밀양: [128.75, 35.50], 거창: [127.91, 35.69], 마산: [128.57, 35.22],
  광주: [126.85, 35.16], 목포: [126.39, 34.81], 장흥: [126.91, 34.68], 순천: [127.49, 34.95], 해남: [126.60, 34.57],
  전주: [127.15, 35.82], 군산: [126.74, 35.97], 정읍: [126.86, 35.57], 남원: [127.39, 35.42],
  제주: [126.53, 33.50],
};

// 남한 외곽 대략선(경도,위도) — 모식용 가이드
const OUTLINE: [number, number][] = [
  [126.7, 37.9], [127.5, 38.3], [128.4, 38.5], [129.0, 37.5], [129.5, 36.5], [129.4, 35.7],
  [129.3, 35.1], [128.5, 34.8], [127.8, 34.9], [126.9, 34.5], [126.4, 34.7], [126.4, 35.5],
  [126.6, 36.5], [126.5, 37.0], [126.6, 37.7],
];

const LNG0 = 125.9, LNG1 = 129.8, LAT0 = 33.0, LAT1 = 38.7;
const W = 100, H = 150;
const px = (lng: number) => ((lng - LNG0) / (LNG1 - LNG0)) * W;
const py = (lat: number) => ((LAT1 - lat) / (LAT1 - LAT0)) * H;

function cityOf(name: string): string | null {
  for (const c of Object.keys(COORDS)) if (name.includes(c)) return c;
  return null;
}

export function KoreaOfficeMap({ data }: { data: { name: string; count: number }[] }) {
  const points = useMemo(() => {
    const byCity = new Map<string, number>();
    for (const d of data) {
      const c = cityOf(d.name);
      if (!c) continue;
      byCity.set(c, (byCity.get(c) ?? 0) + d.count);
    }
    const arr = [...byCity.entries()].map(([city, count]) => ({ city, count, x: px(COORDS[city][0]), y: py(COORDS[city][1]) }));
    return arr.sort((a, b) => b.count - a.count);
  }, [data]);

  const max = Math.max(1, ...points.map((p) => p.count));
  const outlinePath = OUTLINE.map((p, i) => `${i === 0 ? "M" : "L"}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(" ") + " Z";

  if (!points.length) return <p className="py-6 text-center text-body-s text-ink-muted">집계된 검찰청이 없습니다.</p>;

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[360px] w-auto shrink-0">
        <path d={outlinePath} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.6} />
        {points.map((p) => {
          const r = 2 + Math.sqrt(p.count / max) * 8;
          const op = 0.35 + (p.count / max) * 0.5;
          const big = p.count >= max * 0.25;
          return (
            <g key={p.city}>
              <circle cx={p.x} cy={p.y} r={r} fill="#1d4ed8" fillOpacity={op} stroke="#1e3a8a" strokeWidth={0.4} />
              {big && (
                <text x={p.x} y={p.y - r - 1} textAnchor="middle" className="fill-ink-title" style={{ fontSize: 3.4, fontWeight: 700 }}>
                  {p.city} {p.count}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {/* 범례/순위 */}
      <div className="grid w-full grid-cols-2 gap-x-3 gap-y-0.5 sm:max-w-xs">
        {points.slice(0, 14).map((p, i) => (
          <div key={p.city} className="flex items-center justify-between gap-2 text-detail">
            <span className="truncate text-ink-body"><span className="text-ink-disabled">{i + 1}.</span> {p.city}</span>
            <span className="shrink-0 font-semibold text-primary">{p.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
