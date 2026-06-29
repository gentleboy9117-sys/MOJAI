import { PublicSafetySubNav } from "@/components/publicSafety/PublicSafetySubNav";
import { OfficeNewsBoard } from "@/components/publicSafety/OfficeNewsBoard";

export const dynamic = "force-dynamic";

export default function RelatedNewsPage() {
  return (
    <div className="mx-auto max-w-content space-y-4 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">집회·시위 보도</h1>
        <p className="text-body-s text-ink-muted">
          공개 언론기사 중 집회·시위 관련 보도를 검찰청 관할별로 정리합니다. 검찰청을 누르면 해당 청 보도가 표시됩니다.
        </p>
      </div>
      <PublicSafetySubNav />
      <OfficeNewsBoard baseUrl="/api/articles?keyword=집회&limit=300" />
    </div>
  );
}
