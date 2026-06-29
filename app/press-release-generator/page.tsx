import { PressReleaseWizard } from "@/components/pressRelease/PressReleaseWizard";

export const dynamic = "force-dynamic";

export default function PressReleaseGeneratorPage() {
  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">보도자료 초안</h1>
        <p className="text-body-s text-ink-muted">
          사건 처리 이후 공개 가능한 사실을 입력하면 공개 검찰발표자료의 구조·문체를 참고해 초안을 생성합니다 — 초안(담당자 검토 필요)
        </p>
      </div>
      <PressReleaseWizard />
    </div>
  );
}
