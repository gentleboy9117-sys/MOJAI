import { TextPoolGenerator } from "@/components/textPool/TextPoolGenerator";

export const dynamic = "force-dynamic";

export default function TextPoolPage() {
  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">문자풀 초안</h1>
        <p className="text-body-s text-ink-muted">
          기자단 신속 공보용 문자풀(휴대폰 문자 분량) 초안을 작성합니다.
        </p>
      </div>
      <TextPoolGenerator />
    </div>
  );
}
