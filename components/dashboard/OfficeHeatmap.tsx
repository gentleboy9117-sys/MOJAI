"use client";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";

interface Row {
  officeId: string; officeName: string; region: string; articleCount: number; issueCount: number;
  mainCrimeType?: string; reviewNeeded: number; importantIssues: number; deltaPrev: number;
}

export function OfficeHeatmap({ limit = 10 }: { limit?: number }) {
  const { data, loading } = useApi<Row[]>("/api/dashboard/office-heatmap?period=7d");
  const rows = data?.slice(0, limit) ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-primary" /> 검찰청별 이슈 현황</CardTitle>
        <Link href="/offices" className="text-detail text-blue-60 hover:underline">전체 보기 →</Link>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? <div className="p-4"><Spinner /></div> : !rows.length ? (
          <EmptyState title="해당 기간 데이터가 없습니다" />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-body-s">
              <thead>
                <tr className="border-b border-line bg-gray-5 text-left text-detail text-ink-muted">
                  <th className="px-3 py-2 font-medium">검찰청</th>
                  <th className="px-3 py-2 font-medium">지역</th>
                  <th className="px-3 py-2 text-right font-medium">기사</th>
                  <th className="px-3 py-2 text-right font-medium">이슈</th>
                  <th className="px-3 py-2 font-medium">주요 유형</th>
                  <th className="px-3 py-2 text-right font-medium">전일 대비</th>
                  <th className="px-3 py-2 text-right font-medium">중요</th>
                  <th className="px-3 py-2 text-right font-medium">검토필요</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.officeId} className="hover:bg-gray-5">
                    <td className="px-3 py-2 font-medium text-ink-title">{r.officeName}</td>
                    <td className="px-3 py-2 text-ink-muted">{r.region}</td>
                    <td className="px-3 py-2 text-right text-ink-body">{r.articleCount}</td>
                    <td className="px-3 py-2 text-right text-ink-body">{r.issueCount}</td>
                    <td className="px-3 py-2 text-ink-body">{r.mainCrimeType ?? "-"}</td>
                    <td className={`px-3 py-2 text-right font-medium ${r.deltaPrev > 0 ? "text-danger" : r.deltaPrev < 0 ? "text-blue-60" : "text-ink-disabled"}`}>
                      {r.deltaPrev > 0 ? `+${r.deltaPrev}` : r.deltaPrev}
                    </td>
                    <td className="px-3 py-2 text-right text-ink-body">{r.importantIssues}</td>
                    <td className="px-3 py-2 text-right text-ink-body">{r.reviewNeeded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
