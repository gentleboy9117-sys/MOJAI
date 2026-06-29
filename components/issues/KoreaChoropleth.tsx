"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// 검찰청 소재 도시 → 시도(geojson 2013 명칭)
const CITY_SIDO: Record<string, string> = {
  서울: "서울특별시", 인천: "인천광역시",
  부천: "경기도", 의정부: "경기도", 고양: "경기도", 남양주: "경기도", 수원: "경기도", 성남: "경기도", 안양: "경기도", 안산: "경기도", 평택: "경기도", 여주: "경기도",
  춘천: "강원도", 강릉: "강원도", 원주: "강원도", 속초: "강원도", 영월: "강원도",
  대전: "대전광역시", 세종: "세종특별자치시",
  천안: "충청남도", 공주: "충청남도", 논산: "충청남도", 서산: "충청남도", 홍성: "충청남도", 아산: "충청남도",
  청주: "충청북도", 충주: "충청북도", 제천: "충청북도", 영동: "충청북도",
  대구: "대구광역시",
  안동: "경상북도", 경주: "경상북도", 포항: "경상북도", 김천: "경상북도", 상주: "경상북도", 의성: "경상북도", 영덕: "경상북도",
  부산: "부산광역시", 울산: "울산광역시",
  창원: "경상남도", 진주: "경상남도", 통영: "경상남도", 밀양: "경상남도", 거창: "경상남도", 마산: "경상남도", 김해: "경상남도", 양산: "경상남도",
  광주: "광주광역시",
  목포: "전라남도", 순천: "전라남도", 장흥: "전라남도", 해남: "전라남도", 여수: "전라남도",
  전주: "전라북도", 군산: "전라북도", 정읍: "전라북도", 남원: "전라북도",
  제주: "제주특별자치도",
};
const CITIES = Object.keys(CITY_SIDO);
function cityOf(officeName: string): string | null {
  for (const c of CITIES) if (officeName.includes(c)) return c;
  return null;
}
// 시도 N→S 정렬
const SIDO_ORDER = ["서울특별시", "인천광역시", "경기도", "강원도", "충청북도", "세종특별자치시", "대전광역시", "충청남도", "경상북도", "대구광역시", "전라북도", "경상남도", "울산광역시", "광주광역시", "전라남도", "부산광역시", "제주특별자치도"];
const sidoRank = (n: string) => { const i = SIDO_ORDER.indexOf(n); return i < 0 ? 99 : i; };

// 히트맵 색상(0=회색, 이후 옅은노랑→빨강)
const HEAT = ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"];
function heatColor(c: number, max: number): string {
  if (c <= 0) return "#f1f5f9";
  const t = max > 0 ? c / max : 0;
  if (t <= 0.2) return HEAT[0];
  if (t <= 0.4) return HEAT[1];
  if (t <= 0.6) return HEAT[2];
  if (t <= 0.8) return HEAT[3];
  return HEAT[4];
}

interface Feature { properties: { code: string; name: string }; geometry: { type: string; coordinates: any } }
interface Geo { features: Feature[] }

const VW = 360, VH = 460, PAD = 10;

export function KoreaChoropleth({ offices, nationalCount }: { offices: { name: string; count: number }[]; nationalCount?: number }) {
  const [sido, setSido] = useState<Geo | null>(null);
  const [sgg, setSgg] = useState<Geo | null>(null);
  const [drill, setDrill] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => { fetch("/geo/skorea-sido.json").then((r) => r.json()).then(setSido).catch(() => {}); }, []);
  useEffect(() => { if (drill && !sgg) fetch("/geo/skorea-sigungu.json").then((r) => r.json()).then(setSgg).catch(() => {}); }, [drill, sgg]);

  // 시도별 집계
  const sidoCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of offices) { const c = cityOf(o.name); const s = c ? CITY_SIDO[c] : null; if (s) m.set(s, (m.get(s) ?? 0) + o.count); }
    return m;
  }, [offices]);
  // 드릴다운 시 시군구별 집계(해당 시도 소속 사무소만, 소재 시군구 매칭)
  const sggCounts = useMemo(() => {
    const m = new Map<string, number>();
    if (!drill) return m;
    for (const o of offices) {
      const c = cityOf(o.name); if (!c || CITY_SIDO[c] !== drill.name) continue;
      m.set(c, (m.get(c) ?? 0) + o.count); // c = 시군구 표시명 매칭용
    }
    return m;
  }, [offices, drill]);

  const features = useMemo(() => {
    if (drill) return (sgg?.features ?? []).filter((f) => f.properties.code.startsWith(drill.code));
    return sido?.features ?? [];
  }, [sido, sgg, drill]);

  const countOf = (f: Feature): number => {
    if (!drill) return sidoCounts.get(f.properties.name) ?? 0;
    // 시군구: 표시명이 사무소 도시를 포함하면 매칭
    let sum = 0;
    for (const [city, n] of sggCounts) if (f.properties.name.includes(city)) sum += n;
    return sum;
  };
  const max = Math.max(1, ...features.map(countOf));

  // 투영(현재 표시 피처 기준 자동 맞춤)
  const proj = useMemo(() => {
    let minLng = 1e9, maxLng = -1e9, minLat = 1e9, maxLat = -1e9;
    const visit = (coords: any) => {
      if (typeof coords[0] === "number") { const [lng, lat] = coords; if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng; if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat; return; }
      for (const c of coords) visit(c);
    };
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

  // 옆 표 데이터
  const rows = useMemo(() => {
    const list = features.map((f) => ({ name: f.properties.name, count: countOf(f) }));
    if (drill) return list.sort((a, b) => b.count - a.count);
    return list.sort((a, b) => sidoRank(a.name) - sidoRank(b.name));
  }, [features, drill, sidoCounts, sggCounts]);
  const rowMax = Math.max(1, ...rows.map((r) => r.count));

  const loading = !sido || (drill && !sgg);

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
            <span className="text-detail text-ink-muted">시도를 클릭하면 시군구로 드릴다운</span>
          )}
          <span className="ml-auto text-detail font-medium text-ink-title">{drill ? drill.name : "전국"}</span>
        </div>
        {loading ? (
          <div className="flex h-[360px] items-center justify-center text-detail text-ink-disabled">지도 불러오는 중…</div>
        ) : (
          <svg viewBox={`0 0 ${VW} ${VH}`} className="h-[400px] w-full">
            <g key={drill?.code ?? "sido"} className="kmap-anim">
              {features.map((f) => {
                const c = countOf(f);
                return (
                  <path
                    key={f.properties.code}
                    d={pathOf(f.geometry)}
                    fill={heatColor(c, max)}
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    className={cn("kmap-region", !drill && "cursor-pointer")}
                    onClick={() => { if (!drill) setDrill({ code: f.properties.code, name: f.properties.name }); }}
                  >
                    <title>{f.properties.name}: {c}</title>
                  </path>
                );
              })}
            </g>
          </svg>
        )}
        {/* 범례 */}
        <div className="mt-1 flex items-center gap-1 text-caption text-ink-muted">
          <span>적음</span>
          <span className="h-3 w-5 rounded-sm" style={{ background: "#f1f5f9" }} />
          {HEAT.map((h) => <span key={h} className="h-3 w-5 rounded-sm" style={{ background: h }} />)}
          <span>많음</span>
          <span className="ml-1">(이슈 수 히트맵)</span>
        </div>
      </div>

      {/* 옆 표(세로 나열) */}
      <div className="w-full shrink-0 lg:w-56">
        <div className="max-h-[420px] space-y-0.5 overflow-y-auto scrollbar-thin pr-1">
          {!drill && typeof nationalCount === "number" && nationalCount > 0 && (
            <div className="flex items-center justify-between gap-2 rounded bg-gray-5 px-2 py-1 text-detail">
              <span className="text-ink-body">전국(법무부·대검)</span>
              <span className="font-semibold text-ink-muted">{nationalCount}</span>
            </div>
          )}
          {rows.map((r) => (
            <div key={r.name} className="flex items-center gap-2 px-1 py-0.5">
              <span className="w-20 shrink-0 truncate text-detail text-ink-title">{r.name}</span>
              <div className="h-3 flex-1 overflow-hidden rounded bg-gray-5">
                <div className="h-full rounded transition-all duration-500" style={{ width: `${rowMax ? Math.max(2, (r.count / rowMax) * 100) : 0}%`, background: heatColor(r.count, rowMax) }} />
              </div>
              <span className="w-7 shrink-0 text-right text-detail font-semibold text-primary">{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
