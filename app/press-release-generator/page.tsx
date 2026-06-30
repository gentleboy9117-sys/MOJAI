import { PressReleaseSimple } from "@/components/pressRelease/PressReleaseSimple";

export const dynamic = "force-dynamic";

export default function PressReleaseGeneratorPage() {
  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">보도자료 초안</h1>
        <p className="text-body-s text-ink-muted">보도자료 초안을 작성합니다.</p>
      </div>
      <PressReleaseSimple />
    </div>
  );
}
