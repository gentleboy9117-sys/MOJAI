import { ShieldCheck } from "lucide-react";

/**
 * [공안] 기본권 고지 박스 (사양 §9.1)
 *  * 집회·시위는 헌법상 기본권 행사일 수 있음을 항상 상단에 고지한다.
 */
export function PublicSafetyNoticeBox({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-lg border border-blue-20 bg-blue-5 px-4 py-3">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-60" />
        <div className="min-w-0 space-y-1">
          <p className="text-body-s font-semibold text-blue-70">
            집회·시위는 헌법상 보장되는 기본권 행사일 수 있습니다.
          </p>
          {!compact && (
            <ul className="space-y-0.5 text-detail leading-relaxed text-ink-body">
              <li>· 본 화면은 공개 집회·시위 일정과 공개 보도를 검찰청 관할 단위로 정리한 참고용 자료입니다.</li>
              <li>· 집회 자체를 범죄로 단정하지 않으며, 관련 보도는 범죄 사실이 아니라 공개 보도입니다.</li>
              <li>· 참가자 식별, 주최·참가 단체의 정치 성향·배후 추론, 감시 목적의 활용을 하지 않습니다.</li>
              <li>· 검찰청 관할은 공개된 관할 구역표에 따라 분류하며, 최종 판단과 책임은 담당자에게 있습니다.</li>
            </ul>
          )}
          {compact && (
            <p className="text-detail leading-relaxed text-ink-body">
              공개 일정·공개 보도 기준 참고 자료입니다. 집회를 범죄로 단정하지 않으며, 관할은 추정, 최종 판단은 담당자.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
