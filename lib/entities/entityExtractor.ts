// =====================================================================
// 엔티티 추출 — 기관/지역/법령/범죄키워드 + 익명 인물표현
//  * 실명 추론 금지. 공개 기사에 명시된 표현만. "A씨/B씨" 등 익명 유지.
// =====================================================================
import { CRIME_TAXONOMY } from "@/lib/classifiers/taxonomy";

export type EntityType =
  | "PROSECUTION" | "COURT" | "POLICE" | "GOV" | "COMPANY"
  | "SCHOOL" | "FINANCE" | "LOCATION" | "PERSON" | "LAW" | "CRIME_KEYWORD";

export const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  PROSECUTION: "검찰", COURT: "법원", POLICE: "경찰", GOV: "정부기관",
  COMPANY: "기업", SCHOOL: "학교", FINANCE: "금융기관", LOCATION: "지역",
  PERSON: "인물(익명)", LAW: "법령", CRIME_KEYWORD: "범죄 키워드",
};

export interface ExtractedEntity {
  entityType: EntityType;
  entityText: string;
  normalizedText?: string;
  confidence: number;
}

interface Rule { type: EntityType; re: RegExp; conf: number }

const RULES: Rule[] = [
  { type: "PROSECUTION", re: /대검찰청|[가-힣]{2,8}(?:지방검찰청|고등검찰청|지청)|[가-힣]{2,6}지검/g, conf: 0.9 },
  { type: "COURT", re: /대법원|헌법재판소|[가-힣]{2,8}(?:지방법원|고등법원|가정법원)/g, conf: 0.85 },
  { type: "POLICE", re: /경찰청|[가-힣]{2,8}경찰서|[가-힣]{2,6}경찰청/g, conf: 0.85 },
  { type: "FINANCE", re: /금융감독원|[가-힣]{2,8}(?:은행|증권|자산운용|저축은행|캐피탈)/g, conf: 0.75 },
  { type: "COMPANY", re: /\(주\)[가-힣A-Za-z0-9]{2,20}|[가-힣A-Za-z0-9]{2,20}(?:주식회사|㈜|그룹)/g, conf: 0.7 },
  { type: "SCHOOL", re: /[가-힣]{2,10}(?:대학교|대학|고등학교|중학교|초등학교)/g, conf: 0.8 },
  { type: "GOV", re: /[가-힣]{2,8}(?:위원회|공단|공사)|국세청|관세청|식약처|국토교통부|보건복지부|고용노동부|법무부/g, conf: 0.7 },
  { type: "LOCATION", re: /[가-힣]{2,6}(?:특별자치도|광역시|특별시|특별자치시)|[가-힣]{2,5}(?:시|군|구)(?=[\s,.]|$)/g, conf: 0.6 },
  { type: "LAW", re: /[가-힣]{2,25}(?:처벌법|특례법|관리법|금지법|보호법)|특정경제범죄가중처벌법|자본시장법|정보통신망법|공직선거법|형법|상법/g, conf: 0.75 },
  // 인물: 익명 표현만(A씨/홍○○) + 직책. 실명 캡처 회피.
  { type: "PERSON", re: /[A-Z가-힣]씨|[가-힣]○+|[가-힣]\s?(?:전|현)\s?(?:장관|차관|국회의원|시장|지사|구청장|회장|대표|사장|이사)/g, conf: 0.55 },
];

export function extractEntities(text: string, opts: { perTypeLimit?: number } = {}): ExtractedEntity[] {
  if (!text) return [];
  const limit = opts.perTypeLimit ?? 6;
  const seen = new Set<string>();
  const out: ExtractedEntity[] = [];

  for (const rule of RULES) {
    const counts = new Map<string, number>();
    for (const m of text.matchAll(rule.re)) {
      const t = m[0].trim();
      if (t.length < 2) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    for (const [t, n] of sorted) {
      const key = `${rule.type}:${t}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        entityType: rule.type,
        entityText: t,
        confidence: Math.min(0.95, rule.conf + (n > 1 ? 0.05 : 0)),
      });
    }
  }

  // 범죄 키워드(taxonomy)
  const crimeSeen = new Set<string>();
  for (const cat of CRIME_TAXONOMY) {
    for (const sub of cat.subtypes) {
      for (const kw of sub.keywords) {
        if (kw.length >= 2 && text.includes(kw) && !crimeSeen.has(kw)) {
          crimeSeen.add(kw);
          out.push({ entityType: "CRIME_KEYWORD", entityText: kw, normalizedText: cat.type, confidence: 0.7 });
        }
      }
    }
  }

  return out;
}

/** 엔티티를 타입별로 묶어 UI 패널용으로 */
export function groupEntities(entities: ExtractedEntity[]): Record<EntityType, string[]> {
  const g = {} as Record<EntityType, string[]>;
  for (const e of entities) {
    (g[e.entityType] ??= []).push(e.entityText);
  }
  return g;
}
