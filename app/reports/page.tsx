import { Suspense } from "react";
import { Spinner } from "@/components/ui/misc";
import { ReportGenerator } from "@/components/reports/ReportGenerator";
import { IssueSubNav } from "@/components/issues/IssueSubNav";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">이슈 브리핑</h1>
        <p className="text-body-s text-ink-muted">
          수집된 자료를 바탕으로 보고서 초안을 생성합니다
        </p>
      </div>
      <IssueSubNav />
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        }
      >
        <ReportGenerator />
      </Suspense>
    </div>
  );
}
