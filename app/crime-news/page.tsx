"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Newspaper } from "lucide-react";
import { Spinner } from "@/components/ui/misc";
import { AssemblyNewsByOfficePanel } from "@/components/publicSafety/AssemblyNewsByOfficePanel";
import { IssueSubNav } from "@/components/issues/IssueSubNav";
import { TrialSubNav } from "@/components/trials/TrialSubNav";

/** 범죄유형별 '목록' → 공안 보도식 관할별 보도 화면(이슈/공판 공용) */
function CrimeNewsInner() {
  const sp = useSearchParams();
  const type = sp.get("type") ?? "";
  const subtype = sp.get("subtype") ?? undefined;
  const scope = sp.get("scope") ?? (type === "공판" ? "trial" : "issue");
  // 공판 범죄유형별 보기는 'type'이 항상 "공판"이고 subtype이 실제 범죄유형 → "공판 · " 접두 제거
  const label = scope === "trial" ? (subtype || type) : subtype ? `${type} · ${subtype}` : type;
  const title = `${label} 보도`;
  const backHref = scope === "trial" ? "/trials/crime-types" : "/crime-types";

  return (
    <div className="mx-auto max-w-content space-y-4 p-5">
      <div>
        <h1 className="flex items-center gap-2 text-heading-m text-ink-title">
          <Newspaper className="h-5 w-5 text-primary" /> {title}
        </h1>
        <p className="text-body-s text-ink-muted">검찰청 관할별(고검-지검-지청)·날짜별 보도 — 동일 기사는 묶어 표시</p>
      </div>
      {scope === "trial" ? <TrialSubNav /> : <IssueSubNav />}
      <Link href={backHref} className="inline-flex items-center gap-1 text-detail text-blue-60 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> 범죄유형별 보기로
      </Link>
      {type ? (
        <AssemblyNewsByOfficePanel crimeType={type} crimeSubtype={subtype} title={title} />
      ) : (
        <p className="text-body-s text-ink-muted">표시할 범죄유형이 지정되지 않았습니다.</p>
      )}
    </div>
  );
}

export default function CrimeNewsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>}>
      <CrimeNewsInner />
    </Suspense>
  );
}
