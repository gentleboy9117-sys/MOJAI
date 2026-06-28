# AI 기반 검찰 기획업무 자동화 플랫폼
### Prosecution Planning AI Workbench

> 매일 아침 사람이 수백 개 뉴스를 읽고 정리하던 일을, AI가 검찰청별·범죄유형별 이슈 보고서로 자동 변환합니다.

기획검사가 수행하는 반복적인 **정보 수집 · 이슈 분류 · 내부 보고 · 공식 발표자료 초안 작성** 업무를 AI로 지원하는 **내부망용 업무 자동화 플랫폼**입니다.

- **오전**에는 공개 뉴스와 공식 자료를 기반으로 관할청별·범죄유형별 이슈를 정리하고,
- **사건 처리 이후**에는 공개 가능한 사실을 입력해 검찰발표자료 형식의 보도자료 **초안**을 생성합니다.

> ⚠️ 두 기능은 동일한 제품 안에 있지만 **업무적으로 분리**되어 있습니다.
> 기사 모니터링 결과는 보도자료 생성의 입력값으로 **자동 사용되지 않으며**, 언론 기사를 보도자료로 자동 변환하지 않습니다.

---

## 1. 문제 정의

기획검사·공보 담당은 매일 아침 전국 단위의 사건 보도, 범죄유형별 동향, 언론 보도 흐름을 수작업으로 확인하고, 사건 처리 후에는 검찰발표자료를 일관된 형식·문체로 작성해야 합니다. 이 과정은 반복적이고 시간 소모가 큽니다. 본 플랫폼은 **공개 자료 기반**으로 이 두 가지 반복 업무를 보조합니다.

## 2. 주요 기능

### A. 오전 이슈 모니터링 / 브리핑
- 공식 보도자료·공개 RSS·(향후)라이선스 뉴스 수집 (`NewsProvider` 추상화)
- 전국 검찰청별 / 범죄유형별 자동 분류 (키워드 규칙 + LLM 보조, **confidence·근거 동시 저장**)
- **사건 중복 기사 자동 묶기**(이슈 클러스터) → 중앙 리스트는 이슈 단위 카드
- **보도 파급도 스코어링**(0~100) — *‘범죄 위험도’가 아니라* 보도 파급도/조직 대응·정책 참고도, **공개 보도 기준**
- **오늘의 주요 이슈 TOP 5**, **검찰청별 이슈 현황(히트맵/랭킹)**, **공개 보도량 기준 증가 감지**
- 이슈 **타임라인**(보도 기반), **인물·기관·지역 엔티티 추출**, **참고 법령 키워드**, **관계도 그래프**(React Flow)
- **Human-in-the-loop**: 신뢰도 낮음/관할 추정/민감 키워드 기사에 “검토 필요” 표시, 분석관이 수정·검토 완료(이력은 감사 로그)
- 5종 **브리핑 보고서** 자동 생성(기관장용/실무자용/정책 동향/언론 대응/회의자료), **민감 표현 자동 완화**

### C. 사건 처리 후 검찰발표자료 초안 생성
- 대검찰청 공개 **검찰발표자료(약 50건)를 Firecrawl로 수집**(미설정 시 샘플 폴백)
- 수집 자료의 **구조·문체·제목 패턴 분석**(레퍼런스 스타일 가이드)
- 사용자가 입력한 **사건 처리 결과·공개 가능 사실만**으로 보도자료 **초안** 생성(3단계 wizard)
- 레퍼런스는 **형식·문체 참고(RAG)용**으로만 사용 — 사건 내용·인물·피해액·날짜를 초안에 복사하지 않음
- **제목 후보 5개 · 기자 예상 Q&A · 담당자 체크리스트 · 문장 리스크 점검** 동시 제공
- 모든 결과는 **“초안 — 담당자 검토 필요”** 로 표시

## 3. 기술 스택

| 영역 | 스택 |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, React Flow(@xyflow/react) |
| Backend | Next.js API Route (운영 시 FastAPI worker 분리 가능) |
| DB | SQLite + Prisma (운영 확장: PostgreSQL) |
| AI/LLM | Provider 추상화 — `MockLLMProvider`(기본·오프라인) / `OpenAIProvider` / `LocalLLMProvider`(내부망) |
| 수집 | NewsProvider 4종, Firecrawl(검찰발표자료), rss-parser, cheerio, robots/allowlist/SSRF 방어 |
| 디자인 | **KRDS**(디지털정부 표준) 기반 토큰 — 메인 컬러 `#003675` ([docs/DESIGN_TOKENS.md](docs/DESIGN_TOKENS.md)) |

## 4. 실행 방법

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 (.env.example 복사)
cp .env.example .env

# 3) DB 생성 + Prisma client + 데모 데이터 시드 (한 번에)
npm run setup        # = prisma generate && prisma db push && tsx prisma/seed.ts

# 4) 개발 서버
npm run dev          # http://localhost:3000
```

기본 LLM은 `mock`(오프라인, API 키 불필요)이라 **네트워크 없이 전체 데모가 동작**합니다.

### 운영/배치 스크립트
```bash
npm run sync:offices     # 검찰청 마스터 동기화(seed JSON 기준)
npm run collect:news     # 뉴스/공식자료 수집·분류 (인자: RSS/URL)
npm run classify         # 전체 재분류 (--llm 로 LLM 보조)
npm run cluster          # 이슈 클러스터 재구성
npm run trend            # 공개 보도량 증가 감지 생성
npm run briefing         # 매일 오전 8시 자동 브리핑(수동 실행)
npm run crawl:press      # 대검 검찰발표자료 레퍼런스 수집(Firecrawl/샘플)
npm run analyze:press    # 레퍼런스 스타일 패턴 분석
```

## 5. 환경변수

`.env.example` 참고. 핵심:

| 변수 | 설명 |
|---|---|
| `APP_MODE` | development/test/**production** (production 에서 DevCrawler 비활성) |
| `DATABASE_URL` | SQLite `file:./dev.db` → 운영 PostgreSQL |
| `LLM_PROVIDER` | `mock`(기본)/`openai`/`local` |
| `OPENAI_*` / `LOCAL_LLM_*` | OpenAI 호환 / 내부망 설치형 LLM 엔드포인트 |
| `LLM_MAX_INPUT_CHARS` | LLM 전송 본문 최대 길이(원문 전체 미전송) |
| `NEWS_PROVIDER_MODE` | `public`/`licensed`/`dev` |
| `FETCH_ALLOWLIST` | 외부 fetch 허용 도메인 |
| `FIRECRAWL_API_KEY`, `SPO_PRESS_RELEASE_LIST_URL`, `PRESS_RELEASE_REFERENCE_LIMIT` | 검찰발표자료 수집 |

## 6. 데이터 소스 / 저작권 정책

- MVP는 **공개 보도자료·공개 RSS·샘플(합성) 데이터**를 사용합니다. 실제 언론 기사 원문을 대량 크롤링·저장하지 않습니다.
- 뉴스 수집은 `NewsProvider`로 분리: `PublicPressReleaseProvider`(재사용 가능 공개자료) / `LicensedNewsProvider`(라이선스 API mock) / `DevCrawlerProvider`(개발 전용, 운영 비활성).
- 상용화 시 원문은 **① 뉴스저작권 라이선스 API ② 빅카인즈/뉴스토어 등 합법 공급원 ③ 언론사 계약 API ④ 재사용 가능한 공식 보도자료** 중 하나로 확보합니다.
- 기사별 `licenseType / sourceType / canStoreFullText / canDisplayFullText / copyrightNotice`로 **표시·저장 권한을 분리** 관리하며, 표시 권한이 없으면 UI는 **제목·출처·요약·링크·저작권 안내만** 노출합니다.

### 검찰발표자료 레퍼런스 수집 정책
- 대검 공개 검찰발표자료 게시판(`cbIdx=1403`)을 **형식·문체 레퍼런스**로만 분석합니다.
- robots/이용정책 존중, rate limit, User-Agent 명시, content hash 중복 방지, 출처 URL·수집 시점 저장.
- 레퍼런스의 **사실관계를 새 보도자료에 복사하지 않습니다.**

## 7. 보안 설계

- **권한 분리(RBAC)**: 일반 사용자(조회) / 분석관(분류 수정·보고서·보도자료 초안) / 관리자(수집원·사용자·감사 로그)
- **감사 로그**: 모든 조회·수집·분류·수정·생성·다운로드 이벤트 기록(`AuditLog`)
- **SSRF 방어**: 외부 fetch allowlist, 내부 IP/localhost/메타데이터 엔드포인트 차단, DNS 리바인딩 차단, redirect manual
- **HTML sanitize**(sanitize-html), **rate limit**, API Key/DB 비밀번호는 `.env`(하드코딩 금지)
- 비공개 수사기록·개인정보·피해자 식별정보·수사기밀은 **입력/저장하지 않음**

### 문장 리스크 점검 / 민감 표현 완화
- 공통 점검기(`lib/report/riskChecker.ts`)가 피의사실·유죄 단정, 개인정보·피해자 식별, 명예훼손·과장 표현을 검출하고 제안 표현을 제시합니다.
- 보고서·보도자료 생성 시 `lib/report/safetyRewrite.ts`로 “편취했다 → 편취한 혐의를 받고 있는 것으로 알려졌다” 식 자동 완화를 적용합니다.

## 8. 디자인 (KRDS)

[KRDS(디지털정부 서비스 표준 디자인)](https://v04.krds.go.kr) 토큰 기반. 앱 메인 컬러는 **`#003675`**(KRDS Navy 50). 정부상징 로고 기관 규칙(radius 최대 12px), 8pt 그리드, Pretendard GOV, 최대 콘텐츠 1280px. 상세는 [docs/DESIGN_TOKENS.md](docs/DESIGN_TOKENS.md).
주최가 **법무부**이므로 헤더 메인 로고는 **법무부**, 검찰 엠블럼은 보조 식별자로 사용합니다.

## 9. 내부망 상용화 시 변경사항

| 항목 | MVP | 운영 |
|---|---|---|
| DB | SQLite | PostgreSQL |
| LLM | OpenAI/Mock | 내부망 설치형/승인 전용망 LLM(`LocalLLMProvider`) |
| 뉴스 | DevCrawler/공개RSS | 라이선스 뉴스 API(`LicensedNewsProvider`) |
| 인증 | 헤더/환경변수(데모) | 기관 SSO |
| 배포 | 단일 서버 | 내부망 K8s/VM |
| 감사 | AuditLog 테이블 | SIEM 연동 |
| 브리핑 | 수동 스크립트 | cron / K8s CronJob (매일 08:00) |
| 보고서 | Markdown | PDF/HWP/전자결재 연동 |

## 10. 데모 시나리오

1. **오전 이슈 모니터링** — 대시보드 → TOP 5 이슈/검찰청 히트맵/보도량 증가감지 확인 → 이슈 모니터링에서 ‘투자리딩방 사기’ 클러스터(다수 보도) → 타임라인·관계도·분류 근거 → 기관장용 브리핑 생성.
2. **검찰발표자료 레퍼런스 분석** — 레퍼런스 수집(Firecrawl/샘플) → 구조·문체·제목 패턴 스타일 가이드 확인.
3. **사건 처리 후 보도자료 초안** — 데모용 가상 사건 입력(3단계) → 유사 레퍼런스 구조 참고 → 초안 + 제목 후보 + Q&A + 체크리스트 + 문장 리스크 점검.

## 11. 디렉터리 구조 (요약)

```text
app/                 # 페이지 + API 라우트(offices/articles/issues/dashboard/reports/press-releases/audit-logs)
components/          # ui(KRDS 프리미티브) / layout / dashboard / issues / filters / reports / pressRelease
lib/
  classifiers/       # taxonomy + 키워드 규칙 + 관할 추정/검토필요
  clustering/        # similarity + issueClusterer
  scoring/           # issueScorer(보도 파급도) + spreadDetector(확산)
  entities/ legal/ timeline/   # 엔티티 / 참고 법령 / 타임라인 추출
  dashboard/         # topIssues / officeHeatmap / trendAlerts
  report/            # templates(5) + safetyRewrite + riskChecker + generator
  pressRelease/      # referenceAnalyzer/stylePattern/rag/generator/qa/checklist/safety
  providers/         # news(4) / llm(3) / pressRelease(Firecrawl)
  security/          # sanitize / ssrfGuard / audit / rbac / rateLimit / auth
  pipeline/          # reclassify / rebuildClusters / persistTrendAlerts (라우트·스크립트 공용)
prisma/ data/ scripts/ docs/
```

## 12. 주의사항

- 본 시스템은 **공개 자료 기반 참고 도구**입니다. 내부 수사정보 처리 시스템이 아닙니다.
- 보도 내용을 사실로 단정하지 않으며(“보도에 따르면/공식 발표에 따르면”), 관할이 불확실하면 **“추정”**으로 표시합니다.
- 모든 AI 분류·생성 결과에는 **confidence·근거 또는 검토 필요 여부**가 함께 표시되며, 생성형 결과는 **초안/참고용**입니다.
- 법령/죄명은 **참고 법령 키워드**이며 법적 판단이 아닙니다. 사람(분석관)이 수정·검토하는 Human-in-the-loop 구조를 유지합니다.
