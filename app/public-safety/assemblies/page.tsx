import { Suspense } from "react";
import { Spinner } from "@/components/ui/misc";
import { PublicSafetySubNav } from "@/components/publicSafety/PublicSafetySubNav";
import { AssemblyScheduleSection } from "@/components/publicSafety/AssemblyScheduleSection";

export const dynamic = "force-dynamic";

export default function AssembliesPage() {
  return (
    <div className="mx-auto max-w-content space-y-4 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">집회·시위 일정</h1>
        <p className="text-body-s text-ink-muted">
          전국 지방경찰청 공개 게시판 기준 집회·시위 일정을 검찰청 관할별로 정리합니다. 날짜(오늘/내일/모레 또는 임의 날짜)를 선택하면 검찰청별 현황과 개요가 함께 갱신됩니다.
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
        <AssemblyScheduleSection />
      </Suspense>
    </div>
  );
}
