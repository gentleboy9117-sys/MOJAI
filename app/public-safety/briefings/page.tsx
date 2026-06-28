import { Suspense } from "react";
import { Spinner } from "@/components/ui/misc";
import { PublicSafetySubNav } from "@/components/publicSafety/PublicSafetySubNav";
import { PublicSafetyBriefingGenerator } from "@/components/publicSafety/PublicSafetyBriefingGenerator";

export const dynamic = "force-dynamic";

export default function BriefingsPage() {
  return (
    <div className="mx-auto max-w-content space-y-4 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">공안 브리핑</h1>
        <p className="text-body-s text-ink-muted">
          공개자료·공개 보도 기준으로 공안 브리핑 초안을 생성합니다 — 참고용 자동 생성물(담당자 검토 필요).
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
        <PublicSafetyBriefingGenerator />
      </Suspense>
    </div>
  );
}
