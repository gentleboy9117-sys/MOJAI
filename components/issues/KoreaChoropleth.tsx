"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { HIGH_PROSECUTION_TREE } from "@/lib/publicSafety/assemblyJurisdictionClassifier";

const HIGH_ORDER: Record<string, number> = Object.fromEntries(HIGH_PROSECUTION_TREE.map((g, i) => [g.high, i]));

// 도시 → 시도(geojson 명칭) : 드릴다운 대상 시도 판별용
const CITY_SIDO: Record<string, string> = {
  서울: "서울특별시", 인천: "인천광역시",
  부천: "경기도", 의정부: "경기도", 고양: "경기도", 남양주: "경기도", 수원: "경기도", 성남: "경기도", 안양: "경기도", 안산: "경기도", 평택: "경기도", 여주: "경기도",
  춘천: "강원도", 강릉: "강원도", 원주: "강원도", 속초: "강원도", 영월: "강원도",
  대전: "대전광역시", 세종: "세종특별자치시", 천안: "충청남도", 공주: "충청남도", 논산: "충청남도", 서산: "충청남도", 홍성: "충청남도", 아산: "충청남도",
  청주: "충청북도", 충주: "충청북도", 제천: "충청북도", 영동: "충청북도",
  대구: "대구광역시", 안동: "경상북도", 경주: "경상북도", 포항: "경상북도", 김천: "경상북도", 상주: "경상북도", 의성: "경상북도", 영덕: "경상북도",
  부산: "부산광역시", 울산: "울산광역시", 창원: "경상남도", 진주: "경상남도", 통영: "경상남도", 밀양: "경상남도", 거창: "경상남도", 마산: "경상남도", 김해: "경상남도", 양산: "경상남도",
  광주: "광주광역시", 목포: "전라남도", 순천: "전라남도", 장흥: "전라남도", 해남: "전라남도", 여수: "전라남도",
  전주: "전라북도", 군산: "전라북도", 정읍: "전라북도", 남원: "전라북도", 제주: "제주특별자치도",
};
const sidoOfName = (n: string) => { const c = Object.keys(CITY_SIDO).find((k) => n.includes(k)); return c ? CITY_SIDO[c] : null; };

// 로그 스케일(서울 왜곡 완화) — 막대·히트맵 공통
const logScale = (c: number, max: number) => (c <= 0 || max <= 0 ? 0 : Math.log(c + 1) / Math.log(max + 1));
const logPct = (c: number, max: number) => (c <= 0 ? 0 : Math.max(3, Math.round(logScale(c, max) * 100)));
// 단일 파랑 히트맵(옅은 파랑 → primary)
function lerp(a: number[], b: number[], t: number) { return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`; }
const heatColor = (c: number, max: number) => (c <= 0 ? "#eef2f9" : lerp([210, 224, 244], [0, 54, 117], 0.18 + 0.82 * logScale(c, max))); // → #003675

interface Office { id: string; name: string; type: string; region: string; parentId: string | null }
interface Feature { properties: { code: string; name: string }; geometry: { type: string; coordinates: any } }
interface Geo { features: Feature[] }
const VW = 360, VH = 460, PAD = 12;

export function KoreaChoropleth({ offices }: { offices: { name: string; count: number }[] }) {
  const [orgs, setOrgs] = useState<Office[]>([]);
  const [coords, setCoords] = useState<Record<string, [number, number]>>({});
  const [sido, setSido] = useState<Geo | null>(null);
  const [sgg, setSgg] = useState<Geo | null>(null);
  const [drill, setDrill] = useState<{ code: string; name: string } | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => { fetch("/api/offices").then((r) => r.json()).then((d) => setOrgs(d.data ?? d ?? [])).catch(() => {}); }, []);
  useEffect(() => { fetch("/geo/office-coords.json").then((r) => r.json()).then(setCoords).catch(() => {}); }, []);
  useEffect(() => { fetch("/geo/skorea-sido.json").then((r) => r.json()).then(setSido).catch(() => {}); }, []);
  useEffect(() => { if (drill && !sgg) fetch("/geo/skorea-sigungu.json").then((r) => r.json()).then(setSgg).catch(() => {}); }, [drill, sgg]);

  const countByName = useMemo(() => { const m = new Map<string, number>(); for (const o of offices) m.set(o.name, o.count); return m; }, [offices]);
  const sidoByName = useMemo(() => new Map((sido?.features ?? []).map((f) => [f.properties.name, f])), [sido]);
  const sidoCounts = useMemo(() => { const m = new Map<string, number>(); for (const o of offices) { const s = sidoOfName(o.name); if (s) m.set(s, (m.get(s) ?? 0) + o.count); } return m; }, [offices]);
  const sidoMax = Math.max(1, ...[...sidoCounts.values()]);

  // 조직도 트리(고검 → 지검 → 지청)
  const tree = useMemo(() => {
    const highs = orgs.filter((o) => o.type === "고등검찰청").sort((a, b) => (HIGH_ORDER[a.name] ?? 99) - (HIGH_ORDER[b.name] ?? 99));
    const dists = orgs.filter((o) => o.type === "지방검찰청");
    const branches = orgs.filter((o) => o.type === "지청");
    const distOf = (highId: string) => dists.filter((d) => d.parentId === highId);
    const branchOf = (distId: string) => branches.filter((b) => b.parentId === distId);
    const ownCount = (name: string) => countByName.get(name) ?? 0;
    const subCount = (o: Office): number => {
      if (o.type === "지청") return ownCount(o.name);
      if (o.type === "지방검찰청") return ownCount(o.name) + branchOf(o.id).reduce((s, b) => s + ownCount(b.name), 0);
      return distOf(o.id).reduce((s, d) => s + subCount(d), 0); // 고검
    };
    return { highs, distOf, branchOf, ownCount, subCount };
  }, [orgs, countByName]);
  const orgMax = Math.max(1, ...tree.highs.map((h) => tree.subCount(h)));

  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const drillName = (officeName: string) => { const s = sidoOfName(officeName); const f = s ? sidoByName.get(s) : null; if (f) setDrill({ code: f.properties.code, name: f.properties.name }); };

  // 표시 피처
  const features = useMemo(() => drill ? (sgg?.features ?? []).filter((f) => f.properties.code.startsWith(drill.code)) : (sido?.features ?? []), [sido, sgg, drill]);
  // 드릴 시 실좌표 포인트
  const points = useMemo(() => {
    if (!drill) return [] as { name: string; count: number; lng: number; lat: number }[];
    const out: { name: string; count: number; lng: number; lat: number }[] = [];
    for (const o of offices) { if (sidoOfName(o.name) !== drill.name) continue; const c = coords[o.name]; if (!c) continue; out.push({ name: o.name, count: o.count, lng: c[0], lat: c[1] }); }
    return out;
  }, [drill, offices, coords]);
  const pointMax = Math.max(1, ...points.map((p) => p.count));

  const proj = useMemo(() => {
    let minLng = 1e9, maxLng = -1e9, minLat = 1e9, maxLat = -1e9;
    const visit = (co: any) => { if (typeof co[0] === "number") { const [a, b] = co; if (a < minLng) minLng = a; if (a > maxLng) maxLng = a; if (b < minLat) minLat = b; if (b > maxLat) maxLat = b; } else for (const c of co) visit(c); };
    for (const f of features) visit(f.geometry.coordinates);
    if (minLng > maxLng) return null;
    const k = Math.cos(((minLat + maxLat) / 2 * Math.PI) / 180);
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
    for (const poly of polys) for (const ring of poly) { ring.forEach((pt: number[], i: number) => { const [x, y] = proj(pt[0], pt[1]); d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`; }); d += "Z"; }
    return d;
  }
  const loading = !sido || (drill && !sgg);

  // 막대(단일 파랑)
  const Bar = ({ count, max }: { count: number; max: number }) => (
    <div className="h-3.5 flex-1 overflow-hidden rounded bg-gray-5"><div className="h-full rounded bg-primary" style={{ width: `${logPct(count, max)}%` }} /></div>
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      {/* 지도 */}
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          {drill ? (
            <button onClick={() => setDrill(null)} className="flex items-center gap-1 text-detail text-ink-muted hover:text-primary"><ArrowLeft className="h-4 w-4" /> 전국</button>
          ) : (
            <span className="text-detail text-ink-muted">조직도(우측)에서 검찰청을 누르면 해당 지역 시군구·검찰청으로 드릴다운</span>
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
                  <path key={f.properties.code} d={pathOf(f.geometry)} fill={drill ? "#f3f6fb" : heatColor(c, sidoMax)} stroke="#475569" strokeWidth={drill ? 0.5 : 0.9}
                    className={cn("kmap-region", !drill && "cursor-pointer")}
                    onClick={() => { if (!drill) { const f2 = f; setDrill({ code: f2.properties.code, name: f2.properties.name }); } }}>
                    {!drill && <title>{f.properties.name}: {c}건</title>}
                  </path>
                );
              })}
              {drill && proj && points.map((p, i) => { const [x, y] = proj(p.lng, p.lat); const r = 2.5 + Math.sqrt(p.count / pointMax) * 6; return (
                <circle key={i} cx={x} cy={y} r={r} fill="#003675" fillOpacity={0.82} stroke="#fff" strokeWidth={0.6} className="cursor-pointer"><title>{p.name}: {p.count}건</title></circle>
              ); })}
            </g>
          </svg>
        )}
        <div className="mt-1 flex items-center gap-1 text-caption text-ink-muted">
          <span>적음</span>
          {[0.05, 0.25, 0.5, 0.75, 1].map((t) => <span key={t} className="h-3 w-6 rounded-sm" style={{ background: heatColor(t * sidoMax, sidoMax) }} />)}
          <span>많음</span><span className="ml-1">(이슈 수 · 로그 스케일)</span>
        </div>
      </div>

      {/* 조직도 아코디언(고검 > 지검 > 지청) */}
      <div className="w-full shrink-0 lg:w-72">
        <div className="max-h-[460px] space-y-1 overflow-y-auto scrollbar-thin pr-1">
          {tree.highs.map((h) => {
            const hOpen = open.has(h.id); const hc = tree.subCount(h);
            return (
              <div key={h.id}>
                <button onClick={() => toggle(h.id)} className="flex w-full items-center gap-2">
                  <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform", !hOpen && "-rotate-90")} />
                  <span className="w-16 shrink-0 text-left text-body-s font-bold text-ink-title">{h.name.replace("고등검찰청", "고검")}</span>
                  <Bar count={hc} max={orgMax} /><span className="w-7 shrink-0 text-right text-body-s font-semibold text-primary">{hc}</span>
                </button>
                {hOpen && tree.distOf(h.id).map((d) => {
                  const dOpen = open.has(d.id); const dc = tree.subCount(d); const branches = tree.branchOf(d.id);
                  return (
                    <div key={d.id} className="pl-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => branches.length && toggle(d.id)} className={cn("shrink-0", !branches.length && "invisible")}>
                          <ChevronDown className={cn("h-3 w-3 text-ink-muted transition-transform", !dOpen && "-rotate-90")} />
                        </button>
                        <button onClick={() => drillName(d.name)} className="flex flex-1 items-center gap-2 hover:opacity-80">
                          <span className="w-[4.5rem] shrink-0 truncate text-left text-detail text-ink-title">{d.name.replace("지방검찰청", "지검")}</span>
                          <Bar count={dc} max={orgMax} /><span className="w-6 shrink-0 text-right text-detail font-semibold text-primary">{dc}</span>
                        </button>
                      </div>
                      {dOpen && branches.map((b) => { const bc = tree.ownCount(b.name); return (
                        <button key={b.id} onClick={() => drillName(b.name)} className="flex w-full items-center gap-2 py-0.5 pl-6 hover:opacity-80">
                          <span className="w-16 shrink-0 truncate text-left text-detail text-ink-muted">{b.name}</span>
                          <Bar count={bc} max={orgMax} /><span className="w-6 shrink-0 text-right text-detail font-semibold text-primary/80">{bc}</span>
                        </button>
                      ); })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
