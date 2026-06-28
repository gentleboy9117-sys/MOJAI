"use client";
import { useState } from "react";
import { Download, RefreshCw, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/misc";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiPost } from "@/lib/client/api";
import { ReferenceList } from "@/components/pressRelease/ReferenceList";
import { StyleGuide } from "@/components/pressRelease/StyleGuide";

interface CrawlResult {
  collected: number;
  saved: number;
  usedFallback: boolean;
  note?: string;
}

export default function PressReleaseReferencesPage() {
  // 탭 강제 리마운트로 데이터 새로고침 (useApi 가 마운트 시 fetch)
  const [refsKey, setRefsKey] = useState(0);
  const [guideKey, setGuideKey] = useState(0);
  const [busy, setBusy] = useState<null | "crawl" | "analyze">(null);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function crawl() {
    setBusy("crawl");
    setMsg(null);
    try {
      const r = await apiPost<CrawlResult>("/api/press-releases/references/crawl", { limit: 20 });
      setMsg({
        tone: "success",
        text: `수집 ${r.collected}건 · 저장 ${r.saved}건${r.usedFallback ? " (네트워크 제한으로 샘플 폴백 사용)" : ""}${
          r.note ? ` — ${r.note}` : ""
        }`,
      });
      setRefsKey((k) => k + 1);
    } catch (e) {
      setMsg({ tone: "danger", text: e instanceof Error ? e.message : "레퍼런스 수집에 실패했습니다." });
    } finally {
      setBusy(null);
    }
  }

  async function analyze() {
    setBusy("analyze");
    setMsg(null);
    try {
      const r = await apiPost<{ patterns: unknown[]; references: unknown[] }>(
        "/api/press-releases/references/analyze",
        {},
      );
      setMsg({
        tone: "success",
        text: `스타일 재분석 완료 — 패턴 ${r.patterns?.length ?? 0}종 · 레퍼런스 ${r.references?.length ?? 0}건 반영`,
      });
      setGuideKey((k) => k + 1);
    } catch (e) {
      setMsg({ tone: "danger", text: e instanceof Error ? e.message : "스타일 재분석에 실패했습니다." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-heading-m text-ink-title">검찰발표자료 레퍼런스</h1>
          <p className="text-body-s text-ink-muted">
            공개 검찰발표자료의 형식·문체를 분석한 스타일 참고 자료입니다 — 사건 내용은 사용하지 않습니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={crawl} disabled={busy !== null}>
            {busy === "crawl" ? <Spinner /> : <Download className="h-4 w-4" />} 레퍼런스 수집
          </Button>
          <Button variant="outline" size="sm" onClick={analyze} disabled={busy !== null}>
            {busy === "analyze" ? <Spinner /> : <RefreshCw className="h-4 w-4" />} 스타일 재분석
          </Button>
        </div>
      </div>

      <Card className="border-blue-20 bg-blue-5">
        <CardContent className="flex gap-2 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-60" />
          <p className="text-detail leading-relaxed text-blue-70">
            레퍼런스는 제목·구조·문체 등 형식 참고용입니다. 레퍼런스의 사건 사실관계는 보도자료 초안 생성에 사용되지 않습니다. 수집은
            공개 보도자료를 대상으로 하며, 권한(분석관/관리자)이 필요합니다.
          </p>
        </CardContent>
      </Card>

      {msg && (
        <p
          className={
            msg.tone === "success"
              ? "rounded-md border border-success/30 bg-success-bg px-3 py-2 text-detail text-success"
              : "rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-detail text-danger"
          }
        >
          {msg.text}
        </p>
      )}

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">레퍼런스 목록</TabsTrigger>
          <TabsTrigger value="guide">스타일 가이드</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <ReferenceList key={refsKey} />
        </TabsContent>
        <TabsContent value="guide" className="mt-4">
          <div className="mb-2 flex items-center gap-1.5">
            <Badge tone="outline">참고 법령·표현 기준</Badge>
            <span className="text-detail text-ink-muted">법적 판단이 아닌 작성 형식 가이드입니다.</span>
          </div>
          <StyleGuide key={guideKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
