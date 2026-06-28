import { Suspense } from "react";
import { Spinner } from "@/components/ui/misc";
import { PublicSafetySubNav } from "@/components/publicSafety/PublicSafetySubNav";
import { AssemblyNewsByOfficePanel } from "@/components/publicSafety/AssemblyNewsByOfficePanel";

export const dynamic = "force-dynamic";

export default function ElectionNewsPage() {
  return (
    <div className="mx-auto max-w-content space-y-4 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">선거 보도</h1>
        <p className="text-body-s text-ink-muted">
          공개 언론기사 중 선거범죄 관련 보도를 검찰청 관할별로 정리합니다. 각 기사 제목을 누르면 원문으로 이동합니다.
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
        <AssemblyNewsByOfficePanel kind="election" title="선거 보도" />
      </Suspense>
    </div>
  );
}
