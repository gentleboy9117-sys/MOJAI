import { Suspense } from "react";
import { Spinner } from "@/components/ui/misc";
import { PublicSafetySubNav } from "@/components/publicSafety/PublicSafetySubNav";
import { PublicSafetyDashboardPage } from "@/components/publicSafety/PublicSafetyDashboardPage";

export const dynamic = "force-dynamic";

export default function PublicSafetyDashboard() {
  return (
    <div className="mx-auto max-w-content space-y-4 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">공안 — 집회·시위 공개정보 모니터링</h1>
        <p className="text-body-s text-ink-muted">
          공개 집회·시위 일정과 관련 공개 보도를 검찰청 관할 단위로 정리한 참고용 화면입니다.
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
        <PublicSafetyDashboardPage />
      </Suspense>
    </div>
  );
}
