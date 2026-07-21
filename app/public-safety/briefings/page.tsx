import { Suspense } from "react";
import { Spinner } from "@/components/ui/misc";
import { PublicSafetySubNav } from "@/components/publicSafety/PublicSafetySubNav";
import { ReportGenerator } from "@/components/reports/ReportGenerator";

export const dynamic = "force-dynamic";

export default function BriefingsPage() {
  return (
    <div className="mx-auto max-w-content space-y-4 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">공안 브리핑</h1>
        <p className="text-body-s text-ink-muted">
          수집된 자료를 바탕으로 보고서 초안을 생성합니다
        </p>
      </div>
      <PublicSafetySubNav />
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        }
      >
        <ReportGenerator mode="safety" />
      </Suspense>
    </div>
  );
}
