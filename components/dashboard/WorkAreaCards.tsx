import Link from "next/link";
import { Newspaper, FileSignature, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

// 두 업무 영역 — 기사 모니터링과 보도자료 생성은 업무적으로 분리되어 있음을 명시
export function WorkAreaCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="flex flex-col p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-5 text-primary"><Newspaper className="h-5 w-5" /></span>
          <h2 className="text-heading-s text-ink-title">오전 이슈 모니터링</h2>
        </div>
        <p className="mb-4 flex-1 text-body-s leading-relaxed text-ink-body">
          공개 뉴스와 공식자료를 수집해 검찰청별·범죄유형별로 분류하고, 오늘의 주요 이슈와 브리핑 보고서를 자동 생성합니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/issues" className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-body-s font-medium text-white hover:bg-primary-hover">이슈 모니터링 시작 <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/reports" className="inline-flex items-center rounded-md border border-line-strong px-3 py-2 text-body-s text-primary hover:bg-navy-5">오늘의 브리핑 보기</Link>
        </div>
      </Card>

      <Card className="flex flex-col p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-5 text-primary"><FileSignature className="h-5 w-5" /></span>
          <h2 className="text-heading-s text-ink-title">사건 처리 후 발표자료 작성</h2>
        </div>
        <p className="mb-4 flex-1 text-body-s leading-relaxed text-ink-body">
          사건 처리 결과와 공개 가능 사실을 입력하면, 공개 검찰발표자료의 구조와 문체를 참고해 보도자료 초안을 생성합니다.
          <span className="mt-1 block text-detail text-ink-muted">※ 기사 모니터링 결과는 보도자료 입력값으로 자동 사용되지 않습니다.</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/press-release-generator" className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-body-s font-medium text-white hover:bg-primary-hover">보도자료 초안 생성 <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/press-release-references" className="inline-flex items-center rounded-md border border-line-strong px-3 py-2 text-body-s text-primary hover:bg-navy-5">레퍼런스 스타일 가이드</Link>
        </div>
      </Card>
    </div>
  );
}
