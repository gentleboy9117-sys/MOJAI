"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// 검찰청 소재 도시 좌표(경도, 위도) — 대략값(드릴다운 포인트용)
const CITY_COORDS: Record<string, [number, number]> = {
  서울: [126.98, 37.57], 의정부: [127.05, 37.74], 고양: [126.83, 37.66], 남양주: [127.21, 37.64],
  인천: [126.70, 37.46], 부천: [126.77, 37.50], 수원: [127.01, 37.27], 성남: [127.13, 37.42],
  안양: [126.95, 37.39], 안산: [126.83, 37.32], 평택: [127.09, 36.99], 여주: [127.63, 37.30],
  춘천: [127.73, 37.88], 강릉: [128.88, 37.75], 원주: [127.92, 37.34], 속초: [128.59, 38.21], 영월: [128.46, 37.18],
  대전: [127.38, 36.35], 세종: [127.29, 36.48], 천안: [127.11, 36.81], 공주: [127.12, 36.45], 논산: [127.10, 36.19], 서산: [126.45, 36.78], 홍성: [126.66, 36.60], 아산: [127.00, 36.79],
  청주: [127.49, 36.64], 충주: [127.93, 36.97], 제천: [128.19, 37.13], 영동: [127.78, 36.17],
  대구: [128.60, 35.87], 안동: [128.73, 36.57], 경주: [129.22, 35.86], 포항: [129.36, 36.02], 김천: [128.11, 36.14], 상주: [128.16, 36.41], 의성: [128.70, 36.35], 영덕: [129.37, 36.42],
  부산: [129.08, 35.18], 울산: [129.31, 35.54], 창원: [128.68, 35.23], 진주: [128.08, 35.19], 통영: [128.42, 34.85], 밀양: [128.75, 35.50], 거창: [127.91, 35.69], 마산: [128.57, 35.22], 김해: [128.89, 35.23], 양산: [129.04, 35.34],
  광주: [126.85, 35.16], 목포: [126.39, 34.81], 장흥: [126.91, 34.68], 순천: [127.49, 34.95], 해남: [126.60, 34.57], 여수: [127.66, 34.76],
  전주: [127.15, 35.82], 군산: [126.74, 35.97], 정읍: [126.86, 35.57], 남원: [127.39, 35.42],
  제주: [126.53, 33.50],
};
const CITY_SIDO: Record<string, string> = {
  서울: "서울특별시", 인천: "인천광역시",
  부천: "경기도", 의정부: "경기도", 고양: "경기도", 남양주: "경기도", 수원: "경기도", 성남: "경기도", 안양: "경기도", 안산: "경기도", 평택: "경기도", 여주: "경기도",
  춘천: "강원도", 강릉: "강원도", 원주: "강원도", 속초: "강원도", 영월: "강원도",
  대전: "대전광역시", 세종: "세종특별자치시", 천안: "충청남도", 공주: "충청남도", 논산: "충청남도", 서산: "충청남도", 홍성: "충청남도", 아산: "충청남도",
  청주: "충청북도", 충주: "충청북도", 제천: "충청북도", 영동: "충청북도",
  대구: "대구광역시", 안동: "경상북도", 경주: "경상북도", 포항: "경상북도", 김천: "경상북도", 상주: "경상북도", 의성: "경상북도", 영덕: "경상북도",
  부산: "부산광역시", 울산: "울산광역시", 창원: "경상남도", 진주: "경상남도", 통영: "경상남도", 밀양: "경상남도", 거창: "경상남도", 마산: "경상남도", 김해: "경상남도", 양산: "경상남도",
  광주: "광주광역시", 목포: "전라남도", 순천: "전라남도", 장흥: "전라남도", 해남: "전라남도", 여수: "전라남도",
  전주: "전라북도", 군산: "전라북도", 정읍: "전라북도", 남원: "전라북도",
  제주: "제주특별자치도",
};
const CITIES = Object.keys(CITY_COORDS);
const cityOf = (n: string) => CITIES.find((c) => n.includes(c)) ?? null;
const sidoOf = (n: string) => { const c = cityOf(n); return c ? CITY_SIDO[c] : null; };

// 권역 → 시도
const REGIONS: { key: string; sidos: string[] }[] = [
  { key: "수도권", sidos: ["서울특별시", "인천광역시", "경기도"] },
  { key: "강원", sidos: ["강원도"] },
  { key: "충청", sidos: ["대전광역시", "세종특별자치시", "충청북도", "충청남도"] },
  { key: "호남", sidos: ["광주광역시", "전라북도", "전라남도"] },
  { key: "영남", sidos: ["대구광역시", "부산광역시", "울산광역시", "경상북도", "경상남도"] },
  { key: "제주", sidos: ["제주특별자치도"] },
];

// 로그 스케일(서울 등 큰 값 왜곡 완화) — 바차트·히트맵 공통
const logScale = (c: number, max: number) => (c <= 0 || max <= 0 ? 0 : Math.log(c + 1) / Math.log(max + 1));
const logPct = (c: number, max: number) => (c <= 0 ? 0 : Math.max(2, Math.round(logScale(c, max) * 100)));

// 색상: 로그 스케일 + 옅은파랑→파랑(대비 완화)
function lerp(a: number[], b: number[], t: number) { return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`; }
function heatColor(c: number, max: number): string {
  if (c <= 0) return "#eef2f9";
  return lerp([207, 226, 245], [37, 99, 235], 0.2 + 0.8 * logScale(c, max)); // #cfe2f5 → #2563eb
}

interface Feature { properties: { code: string; name: string }; geometry: { type: string; coordinates: any } }
interface Geo { features: Feature[] }
const VW = 360, VH = 460, PAD = 12;

export function KoreaChoropleth({ offices }: { offices: { name: string; count: number }[] }) {
  const [sido, setSido] = useState<Geo | null>(null);
  const [sgg, setSgg] = useState<Geo | null>(null);
  const [drill, setDrill] = useState<{ code: string; name: string } | null>(null);
  const [openRegion, setOpenRegion] = useState<string | null>("수도권");

  useEffect(() => { fetch("/geo/skorea-sido.json").then((r) => r.json()).then(setSido).catch(() => {}); }, []);
  useEffect(() => { if (drill && !sgg) fetch("/geo/skorea-sigungu.json").then((r) => r.json()).then(setSgg).catch(() => {}); }, [drill, sgg]);

  const sidoCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of offices) { const s = sidoOf(o.name); if (s) m.set(s, (m.get(s) ?? 0) + o.count); }
    return m;
  }, [offices]);
  const sidoByName = useMemo(() => new Map((sido?.features ?? []).map((f) => [f.properties.name, f])), [sido]);

  // 시도 클릭/선택 → 드릴
  const drillTo = (name: string) => { const f = sidoByName.get(name); if (f) setDrill({ code: f.properties.code, name }); };

  // 표시 피처(시도 or 시군구)
  const features = useMemo(() => {
    if (drill) return (sgg?.features ?? []).filter((f) => f.properties.code.startsWith(drill.code));
    return sido?.features ?? [];
  }, [sido, sgg, drill]);

  const sidoMax = Math.max(1, ...[...sidoCounts.values()]);

  // 드릴다운 시 검찰청 포인트(소재지 위경도 + 청명/건수)
  const points = useMemo(() => {
    if (!drill) return [] as { name: string; count: number; lng: number; lat: number }[];
    const byCity = new Map<string, { name: string; count: number }[]>();
    for (const o of offices) {
      if (sidoOf(o.name) !== drill.name) continue;
      const c = cityOf(o.name); if (!c) continue;
      if (!byCity.has(c)) byCity.set(c, []);
      byCity.get(c)!.push(o);
    }
    const out: { name: string; count: number; lng: number; lat: number }[] = [];
    byCity.forEach((list, c) => {
      const [lng, lat] = CITY_COORDS[c];
      list.forEach((o, i) => {
        const ang = (i / Math.max(1, list.length)) * Math.PI * 2;
        const jit = list.length > 1 ? 0.03 : 0;
        out.push({ name: o.name, count: o.count, lng: lng + Math.cos(ang) * jit, lat: lat + Math.sin(ang) * jit });
      });
    });
    return out;
  }, [drill, offices]);

  // 투영
  const proj = useMemo(() => {
    let minLng = 1e9, maxLng = -1e9, minLat = 1e9, maxLat = -1e9;
    const visit = (co: any) => { if (typeof co[0] === "number") { const [a, b] = co; if (a < minLng) minLng = a; if (a > maxLng) maxLng = a; if (b < minLat) minLat = b; if (b > maxLat) maxLat = b; } else for (const c of co) visit(c); };
    for (const f of features) visit(f.geometry.coordinates);
    if (minLng > maxLng) return null;
    const latMid = (minLat + maxLat) / 2;
    const k = Math.cos((latMid * Math.PI) / 180);
    const rxMin = minLng * k, rxMax = maxLng * k;
    const scale = Math.min((VW - 2 * PAD) / (rxMax - rxMin || 1), (VH - 2 * PAD) / (maxLat - minLat || 1));
    const offX = PAD + ((VW - 2 * PAD) - (rxMax - rxMin) * scale) / 2;
    const offY = PAD + ((VH - 2 * PAD) - (maxLat - minLat) * scale) / 2;
    return (lng: number, lat: number): [number, number] => [offX + (lng * k - rxMin) * scale, offY + (maxLat - lat) * scale];
  }, [features]);

  function pathOf(geom: Feature["geometry"]): string {
    if (!proj) return "";
    const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    let d = "";
    for (const poly of polys) for (const ring of poly) {
      ring.forEach((pt: number[], i: number) => { const [x, y] = proj(pt[0], pt[1]); d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`; });
      d += "Z";
    }
    return d;
  }

  const loading = !sido || (drill && !sgg);
  const pointMax = Math.max(1, ...points.map((p) => p.count));

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      {/* 지도 */}
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          {drill ? (
            <button onClick={() => setDrill(null)} className="flex items-center gap-1 text-detail text-ink-muted hover:text-primary">
              <ArrowLeft className="h-4 w-4" /> 전국
            </button>
          ) : (
            <span className="text-detail text-ink-muted">좌측 권역에서 시도를 선택하면 시군구·검찰청으로 드릴다운</span>
          )}
          {drill && <span className="ml-auto text-detail font-medium text-ink-title">{drill.name}</span>}
        </div>
        {loading ? (
          <div className="flex h-[400px] items-center justify-center text-detail text-ink-disabled">지도 불러오는 중…</div>
        ) : (
          <svg viewBox={`0 0 ${VW} ${VH}`} className="h-[400px] w-full">
            <g key={drill?.code ?? "sido"} className="kmap-anim">
              {features.map((f) => {
                const c = drill ? 0 : (sidoCounts.get(f.properties.name) ?? 0);
                return (
                  <path
                    key={f.properties.code}
                    d={pathOf(f.geometry)}
                    fill={drill ? "#f3f6fb" : heatColor(c, sidoMax)}
                    stroke="#475569"
                    strokeWidth={drill ? 0.5 : 0.9}
                    className={cn("kmap-region", !drill && "cursor-pointer")}
                    onClick={() => { if (!drill) drillTo(f.properties.name); }}
                  >
                    {!drill && <title>{f.properties.name}: {c}건</title>}
                  </path>
                );
              })}
              {/* 검찰청 포인트(드릴다운) */}
              {drill && proj && points.map((p, i) => {
                const [x, y] = proj(p.lng, p.lat);
                const r = 2.5 + Math.sqrt(p.count / pointMax) * 6;
                return (
                  <circle key={i} cx={x} cy={y} r={r} fill="#2563eb" fillOpacity={0.8} stroke="#1e3a8a" strokeWidth={0.6} className="cursor-pointer">
                    <title>{p.name}: {p.count}건</title>
                  </circle>
                );
              })}
            </g>
          </svg>
        )}
        {/* 범례 */}
        <div className="mt-1 flex items-center gap-1 text-caption text-ink-muted">
          <span>적음</span>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => <span key={t} className="h-3 w-6 rounded-sm" style={{ background: heatColor(t * sidoMax || (t === 0 ? 0 : 1), sidoMax) }} />)}
          <span>많음</span>
          <span className="ml-1">(이슈 수 · 제곱근 스케일)</span>
        </div>
      </div>

      {/* 좌측 표(권역 아코디언) — 바차트 일관 */}
      <div className="w-full shrink-0 lg:w-64">
        {drill ? (
          <div className="space-y-1">
            <button onClick={() => setDrill(null)} className="mb-1 flex items-center gap-1 text-detail text-ink-muted hover:text-primary"><ArrowLeft className="h-4 w-4" /> 전국 권역</button>
            {points.length ? [...points].sort((a, b) => b.count - a.count).map((p, i) => (
              <BarRow key={i} label={p.name.replace(/지방검찰청|검찰청/g, "").trim()} count={p.count} max={pointMax} />
            )) : <p className="px-1 text-detail text-ink-muted">해당 시도 검찰청 집계 없음</p>}
          </div>
        ) : (
          <div className="space-y-1.5">
            {REGIONS.map((rg) => {
              const total = rg.sidos.reduce((s, n) => s + (sidoCounts.get(n) ?? 0), 0);
              const open = openRegion === rg.key;
              return (
                <div key={rg.key}>
                  <button onClick={() => setOpenRegion(open ? null : rg.key)} className="flex w-full items-center gap-2">
                    <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform", !open && "-rotate-90")} />
                    <span className="w-16 shrink-0 text-left text-body-s font-bold text-ink-title">{rg.key}</span>
                    <div className="h-3.5 flex-1 overflow-hidden rounded bg-gray-5"><div className="h-full rounded bg-primary/70" style={{ width: `${logPct(total, sidoMax)}%` }} /></div>
                    <span className="w-7 shrink-0 text-right text-body-s font-semibold text-primary">{total}</span>
                  </button>
                  {open && (
                    <div className="mt-1 space-y-1 pl-5">
                      {rg.sidos.map((n) => (
                        <BarRow key={n} label={n} count={sidoCounts.get(n) ?? 0} max={sidoMax} onClick={() => drillTo(n)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BarRow({ label, count, max, onClick, muted }: { label: string; count: number; max: number; onClick?: () => void; muted?: boolean }) {
  const pct = logPct(count, max);
  const inner = (
    <>
      <span className="w-20 shrink-0 truncate text-left text-body-s text-ink-title">{label}</span>
      <div className="h-3.5 flex-1 overflow-hidden rounded bg-gray-5"><div className={cn("h-full rounded", muted ? "bg-ink-disabled" : "bg-primary")} style={{ width: `${pct}%` }} /></div>
      <span className="w-7 shrink-0 text-right text-body-s font-semibold text-primary">{count}</span>
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded hover:bg-gray-5">{inner}</button>
  ) : (
    <div className="flex w-full items-center gap-2">{inner}</div>
  );
}
