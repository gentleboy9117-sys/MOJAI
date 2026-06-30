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
          집회·시위 일정 및 개요를 날짜별, 관할별로 정리합니다.
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
