"use client";
import { useEffect, useState } from "react";
import { UserCog, Database, ShieldCheck, Wrench, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { apiPost, getDevUser, setDevUser, DEV_USERS, type DevUser } from "@/lib/client/api";

const ROLE_DESC: Record<DevUser["role"], string> = {
  VIEWER: "조회 전용 — 대시보드·이슈·검찰청별 보기 열람",
  ANALYST: "분석관",
  ADMIN: "관리자 — 모든 권한 + 보도자료·문자풀 생성, 감사 로그·동기화·일괄 처리",
};

interface ActionDef {
  key: string;
  label: string;
  desc: string;
  url: string;
  body?: unknown;
  format: (data: any) => string;
}

const ACTIONS: ActionDef[] = [
  {
    key: "sync",
    label: "검찰청 동기화",
    desc: "검찰청 조직(대검·고검·지검·지청) 정보를 최신 시드로 동기화합니다.",
    url: "/api/offices/sync",
    format: (d) => `동기화 완료${d?.count != null ? ` — ${d.count}개 청` : d?.synced != null ? ` — ${d.synced}개 청` : ""}`,
  },
  {
    key: "crawl",
    label: "레퍼런스 수집",
    desc: "공개 검찰발표자료를 수집해 형식·문체 레퍼런스로 저장합니다.",
    url: "/api/press-releases/references/crawl",
    body: { limit: 20 },
    format: (d) =>
      `수집 ${d?.collected ?? 0}건 · 저장 ${d?.saved ?? 0}건${d?.usedFallback ? " (샘플 폴백)" : ""}`,
  },
  {
    key: "analyze",
    label: "스타일 분석",
    desc: "수집된 레퍼런스의 제목 패턴·구조·문체를 재분석합니다.",
    url: "/api/press-releases/references/analyze",
    body: {},
    format: (d) => `패턴 ${d?.patterns?.length ?? 0}종 · 레퍼런스 ${d?.references?.length ?? 0}건 분석`,
  },
  {
    key: "classify",
    label: "전체 재분류·클러스터",
    desc: "수집된 기사를 다시 분류하고 이슈 클러스터를 재구성합니다.",
    url: "/api/classify/batch",
    body: { onlyReview: false },
    format: (d) =>
      `재분류 ${d?.classified ?? d?.updated ?? 0}건 · 클러스터 ${d?.clusters ?? d?.clustered ?? 0}건`,
  },
];

function AdminAction({ def, disabled }: { def: ActionDef; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const d = await apiPost<any>(def.url, def.body);
      setMsg({ tone: "success", text: def.format(d) });
    } catch (e) {
      setMsg({ tone: "danger", text: e instanceof Error ? e.message : "실행에 실패했습니다." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-line p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-body-s font-medium text-ink-title">{def.label}</p>
          <p className="mt-0.5 text-detail text-ink-muted">{def.desc}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={run} disabled={busy || disabled}>
          {busy ? <Spinner /> : null} 실행
        </Button>
      </div>
      {msg && (
        <p
          className={
            msg.tone === "success"
              ? "mt-2 rounded-md border border-success/30 bg-success-bg px-2 py-1.5 text-detail text-success"
              : "mt-2 rounded-md border border-danger/30 bg-danger-bg px-2 py-1.5 text-detail text-danger"
          }
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<DevUser | null>(null);

  useEffect(() => {
    setUser(getDevUser());
  }, []);

  function changeRole(u: DevUser) {
    setDevUser(u); // 헤더 칩 갱신 이벤트 발행
    setUser(u);
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-content space-y-5 p-5">
      <div>
        <h1 className="text-heading-m text-ink-title">설정</h1>
        <p className="text-body-s text-ink-muted">데모 권한 전환, 데이터 소스·보안 정책 안내, 관리자 운영 작업</p>
      </div>

      {/* 1) 데모 권한 전환 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <UserCog className="h-4 w-4 text-primary" /> 데모 권한 전환
          </CardTitle>
          <span className="text-detail text-ink-muted">운영은 SSO 연동으로 대체</span>
        </CardHeader>
        <CardContent className="space-y-2">
          {DEV_USERS.map((u) => {
            const active = user?.email === u.email;
            return (
              <button
                key={u.email}
                type="button"
                onClick={() => changeRole(u)}
                className={`flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors ${
                  active ? "border-primary bg-navy-5 ring-1 ring-primary" : "border-line bg-white hover:bg-gray-5"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      active ? "border-primary bg-primary" : "border-line-strong"
                    }`}
                  >
                    {active && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <div>
                    <p className="text-body-s font-medium text-ink-title">{u.name}</p>
                    <p className="text-detail text-ink-muted">{ROLE_DESC[u.role]}</p>
                  </div>
                </div>
                <Badge tone={active ? "navy" : "outline"}>{u.role}</Badge>
              </button>
            );
          })}
          <p className="text-detail text-ink-muted">권한을 바꾸면 상단 사용자 칩과 API 호출 권한이 즉시 반영됩니다.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 2) 데이터 소스 정책 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Database className="h-4 w-4 text-primary" /> 데이터 소스 정책
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-detail text-ink-body">
            <div className="flex items-start gap-2">
              <Badge tone="navy">공식 보도자료</Badge>
              <span>법무부·검찰 등 공개 보도자료는 재사용 가능한 공공자료로 우선 활용합니다.</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge tone="warning">라이선스 뉴스</Badge>
              <span>라이선스가 필요한 뉴스는 계약 범위 내에서만 사용하며 표시가 제한될 수 있습니다.</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge tone="outline">DevCrawler</Badge>
              <span>개발용 크롤러는 운영 환경에서 비활성화되어 있으며, 표시·재배포가 제한됩니다.</span>
            </div>
            <p className="rounded-md border border-line bg-gray-5 px-2 py-1.5 text-ink-muted">
              모든 중요도 표기는 보도 파급도·조직 대응 참고도이며 범죄 위험도가 아닙니다(공개 보도 기준).
            </p>
          </CardContent>
        </Card>

        {/* 3) 보안 안내 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> 보안 안내
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-detail text-ink-body">
            <p>· SSRF 방지: 외부 요청은 허용 도메인(allowlist)으로 제한합니다.</p>
            <p>· 입력 정제(sanitize): 저장·렌더링 전 HTML/스크립트를 무력화합니다.</p>
            <p>· 감사 로그(audit): 조회·생성·다운로드 등 활동을 기록합니다.</p>
            <p>· 권한 제어(RBAC): 역할(사용자·관리자)에 따라 기능을 제한합니다.</p>
          </CardContent>
        </Card>
      </div>

      {/* 4) 관리자 운영 작업 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Wrench className="h-4 w-4 text-primary" /> 관리자 운영 작업
          </CardTitle>
          {!isAdmin && <Badge tone="outline">관리자 전용</Badge>}
        </CardHeader>
        <CardContent className="space-y-2.5">
          {!isAdmin && (
            <p className="rounded-md border border-warning/40 bg-warning-bg px-3 py-2 text-detail text-[#9a6a00]">
              이 작업은 관리자 권한이 필요합니다. 위에서 ‘관리자’로 전환한 뒤 실행하세요.
            </p>
          )}
          {ACTIONS.map((a) => (
            <AdminAction key={a.key} def={a} disabled={!isAdmin} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
