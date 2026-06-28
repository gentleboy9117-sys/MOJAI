"use client";
import Link from "next/link";
import { Label, Select, Input } from "@/components/ui/field";
import { REGIONS } from "@/lib/types";
import { ALL_CRIME_TYPES } from "@/lib/classifiers/taxonomy";
import { FileText } from "lucide-react";

export interface IssueFilters {
  period: string; region: string; crimeType: string; sort: string; q: string; minScore: string; view: "issue" | "article";
}

export const DEFAULT_FILTERS: IssueFilters = { period: "30d", region: "", crimeType: "", sort: "score", q: "", minScore: "0", view: "issue" };

export function FilterSidebar({ filters, onChange }: { filters: IssueFilters; onChange: (f: IssueFilters) => void }) {
  const set = <K extends keyof IssueFilters>(k: K, v: IssueFilters[K]) => onChange({ ...filters, [k]: v });
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-3.5 overflow-y-auto border-r border-line bg-white p-4 scrollbar-thin">
      <h2 className="text-title text-ink-title">필터</h2>

      <div>
        <Label>보기 단위</Label>
        <div className="flex rounded-md border border-line-strong p-0.5 text-body-s">
          {(["issue", "article"] as const).map((v) => (
            <button key={v} onClick={() => set("view", v)} className={`flex-1 rounded-sm py-1.5 ${filters.view === v ? "bg-primary font-medium text-white" : "text-ink-body"}`}>
              {v === "issue" ? "이슈 단위" : "기사 단위"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>기간</Label>
        <Select value={filters.period} onChange={(e) => set("period", e.target.value)}>
          <option value="today">오늘</option>
          <option value="7d">최근 7일</option>
          <option value="30d">최근 30일</option>
          <option value="all">전체</option>
        </Select>
      </div>

      <div>
        <Label>지역</Label>
        <Select value={filters.region} onChange={(e) => set("region", e.target.value)}>
          <option value="">전체 지역</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
      </div>

      <div>
        <Label>범죄유형</Label>
        <Select value={filters.crimeType} onChange={(e) => set("crimeType", e.target.value)}>
          <option value="">전체 유형</option>
          {ALL_CRIME_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {filters.view === "issue" && (
        <div>
          <Label>최소 보도 파급도</Label>
          <Select value={filters.minScore} onChange={(e) => set("minScore", e.target.value)}>
            <option value="0">전체</option>
            <option value="30">보통 이상</option>
            <option value="55">높음 이상</option>
            <option value="80">매우 높음</option>
          </Select>
        </div>
      )}

      <div>
        <Label>정렬</Label>
        <Select value={filters.sort} onChange={(e) => set("sort", e.target.value)}>
          <option value="score">보도 파급도순</option>
          <option value="recent">최신순</option>
        </Select>
      </div>

      {filters.view === "article" && (
        <label className="flex items-center gap-2 text-body-s text-ink-body">
          <input type="checkbox" checked={filters.minScore === "review"} onChange={(e) => set("minScore", e.target.checked ? "review" : "0")} />
          검토 필요만 보기
        </label>
      )}

      <div>
        <Label>검색어</Label>
        <Input placeholder="제목/키워드" value={filters.q} onChange={(e) => set("q", e.target.value)} />
      </div>

      <Link href="/reports" className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2.5 text-body-s font-medium text-white hover:bg-primary-hover">
        <FileText className="h-4 w-4" /> 브리핑 보고서 생성
      </Link>
      <p className="text-detail leading-relaxed text-ink-disabled">보도 파급도는 공개 보도 기준 참고 지표입니다.</p>
    </aside>
  );
}
