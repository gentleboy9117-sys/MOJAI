# Netlify 배포 이전 가이드 (자동 수집 포함)

> 현재는 **로컬(Windows) 전용**으로 동작합니다. Netlify에 올릴 때 이 문서대로 2가지(① DB, ② 스케줄러)만 바꾸면 됩니다.
> 수집/분류/브리핑의 **핵심 로직(`lib/`)은 그대로 재사용**되므로, 바뀌는 건 "어디에 저장하나(DB)"와 "무엇이 주기 실행을 트리거하나(스케줄러)"뿐입니다.

---

## 0. 지금(로컬) 구조 — 왜 localhost에서 자동수집이 되는가

| 요소 | 로컬 현재 방식 |
|---|---|
| 앱 | `npm run dev` (Next.js, localhost:3000) |
| DB | **SQLite** 파일 `prisma/dev.db` |
| 자동 수집 | **Windows 작업 스케줄러** `ProsecutionAI-AutoCollect` 가 6시간마다 `run-auto-collect.ps1` → `tsx scripts/auto-collect.ts` 실행 → 같은 `dev.db` 갱신 → 브라우저 새로고침 시 최신 반영 |

→ **로컬에서는 정상 동작하는 올바른 구조입니다.** 단, 이 둘은 Netlify로 **그대로 넘어가지 않습니다**(아래 이유).

---

## 1. ⚠️ Netlify에서 반드시 바뀌어야 하는 것

### (1) SQLite → 호스팅 PostgreSQL  (필수)
Netlify는 서버리스라 **파일 기반 SQLite 쓰기가 불가**합니다(함수 파일시스템이 일시적·읽기전용). 무료 Postgres 권장: **Neon** 또는 **Supabase**.

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"          // sqlite → postgresql
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]  // Netlify(Lambda) 런타임용 추가
}
```
- `DATABASE_URL` 을 Neon/Supabase 연결문자열로 교체 → `npx prisma migrate deploy` (또는 `db push`) 로 스키마 생성 → `tsx prisma/seed.ts` 로 검찰청 67곳 등 초기데이터 시드.
- SQLite는 enum을 String으로 우회했는데(현 스키마), Postgres에서도 그대로 동작하므로 추가 변경 불필요.

### (2) Windows 작업 스케줄러 → Netlify Scheduled Functions  (필수)
Netlify엔 OS 스케줄러가 없습니다. 대신 **Scheduled Functions(cron)** 를 씁니다. `scripts/auto-collect.ts` 의 `runAutoCollect()` 를 그대로 호출하면 됩니다.

```ts
// netlify/functions/scheduled-collect.mts
import type { Config } from "@netlify/functions";
import { runAutoCollect } from "../../scripts/auto-collect";   // 동일 로직 재사용

export default async () => {
  const result = await runAutoCollect();
  return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
};

export const config: Config = {
  schedule: "0 */6 * * *",   // 6시간마다 (UTC 기준 — 한국시간 환산 주의)
};
```
> 참고: `scripts/auto-collect.ts` 하단의 `runAutoCollect().then(...)` 자동 실행부는 CLI 전용이므로,
> Netlify로 옮길 때는 그 블록을 `if (process.argv[1]?.includes("auto-collect")) { ... }` 로 감싸거나
> 오케스트레이션 로직만 `lib/pipeline/` 로 빼면 import 시 중복 실행이 없습니다.

### (3) Next.js 호스팅
```toml
# netlify.toml
[build]
  command = "prisma generate && next build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```
`npm i -D @netlify/plugin-nextjs` 후 위 설정. App Router/API Route는 자동으로 서버리스 함수로 매핑됩니다.

---

## 2. Netlify 환경변수 (Site settings → Environment variables)
로컬 `.env` 값을 그대로 옮기되, 키만 채우면 됩니다.

| 변수 | 값 |
|---|---|
| `DATABASE_URL` | Neon/Supabase Postgres 연결문자열 |
| `APP_MODE` | `production` |
| `LLM_PROVIDER` | `mock`(키 없이 동작) 또는 `openai`(+`OPENAI_API_KEY`) |
| `NEWS_PROVIDER_MODE` | `public` |
| `NEWS_RSS_URLS` | (선택) 수집 RSS, 쉼표구분. 미설정 시 기본 구글뉴스 '검찰/검찰청' |
| `FETCH_ALLOWLIST` | `news.google.com,spo.go.kr,moj.go.kr,...` |

> ⚠️ `APP_MODE=production` 이면 DevCrawler가 자동 비활성화됩니다(설계상 안전장치). 공개 RSS 수집은 `public` 모드로 계속 동작합니다.

---

## 3. 배포 체크리스트 (나중에 한 번에)
1. [ ] Neon/Supabase에서 Postgres 생성 → `DATABASE_URL` 확보
2. [ ] `schema.prisma` 의 provider `postgresql` + `binaryTargets` 추가
3. [ ] `npx prisma migrate deploy` + 시드
4. [ ] `netlify.toml` + `@netlify/plugin-nextjs` 추가
5. [ ] `netlify/functions/scheduled-collect.mts` 추가(위 템플릿)
6. [ ] Netlify에 환경변수 입력
7. [ ] git push → Netlify 빌드 → Functions 탭에서 scheduled-collect 등록 확인
8. [ ] (로컬 전용) Windows 작업 `ProsecutionAI-AutoCollect` 는 배포 후 비활성/삭제

---

## 4. 알려진 한계 (배포와 무관, 기능 자체)
- **공안(집회) 실시간 크롤 미구현**: `SeoulPoliceAssemblyProvider` 는 현재 MVP stub(샘플 8건 갱신). 실데이터는 `smpa.go.kr` 게시판 파싱 구현 필요(allowlist엔 이미 포함). Netlify로 옮겨도 이 부분은 별도 구현이 필요합니다.
- **언론기사**: 구글뉴스 RSS 기반 실수집 정상 동작(제목·요약 중심). 원문 전체 표시는 라이선스 공급원(빅카인즈 등) 연결 시 가능.
