"use client";
import { Fragment } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/misc";
import { useApi } from "@/lib/client/useApi";

interface ByOfficeRow {
  officeId: string | null;
  officeName: string;
  highOffice: string | null;
  assemblyCount: number;
  mainLocations: string[];
  relatedReportCount: number;
  reviewNeededCount: number;
}

/** [공안] 집회·시위 일정(검찰청별) — 선택 날짜, 고검-지검-지청 순 */
export function AssemblyByOfficeView({ date }: { date: string }) {
  const { data, loading } = useApi<ByOfficeRow[]>(`/api/public-safety/dashboard/by-office?date=${date}`);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-primary" /> 집회·시위 일정(검찰청별)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-8 text-center"><Spinner /></div>
        ) : !data?.length ? (
          <EmptyState title="해당 일자의 집회·시위 일정이 없습니다" />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-body-s">
              <thead>
                <tr className="border-b border-line bg-gray-5 text-left text-detail text-ink-muted">
                  <th className="px-3 py-2 font-medium">검찰청</th>
                  <th className="px-3 py-2 text-right font-medium">공개 집회</th>
                  <th className="px-3 py-2 font-medium">주요 장소</th>
                  <th className="px-3 py-2 text-right font-medium">관련 보도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.map((r, i) => {
                  const prev = data[i - 1];
                  const showHigh = r.highOffice && r.highOffice !== prev?.highOffice;
                  const showEtc = !r.highOffice && (i === 0 || data[i - 1].highOffice);
                  return (
                    <Fragment key={r.officeId ?? `none-${i}`}>
                      {showHigh && (
                        <tr className="bg-primary/5">
                          <td colSpan={4} className="px-3 py-1 text-detail font-bold text-primary">{r.highOffice}</td>
                        </tr>
                      )}
                      {showEtc && (
                        <tr className="bg-gray-5">
                          <td colSpan={4} className="px-3 py-1 text-detail font-bold text-ink-muted">관할 미상</td>
                        </tr>
                      )}
                      <tr className="hover:bg-gray-5">
                        <td className="px-3 py-2 font-medium text-ink-title">
                          {r.officeId ? (
                            <Link href={`/public-safety/assemblies?officeId=${r.officeId}`} className="hover:text-primary hover:underline">
                              {r.officeName}
                            </Link>
                          ) : (
                            <span>{r.officeName}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-ink-body">{r.assemblyCount}</td>
                        <td className="px-3 py-2 text-ink-muted">{r.mainLocations.join(", ") || "-"}</td>
                        <td className="px-3 py-2 text-right text-ink-body">{r.relatedReportCount}</td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
