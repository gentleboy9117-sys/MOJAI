# 디자인 토큰 (KRDS 기반)

이 프로젝트의 UI는 **KRDS(Korea Design System, 디지털정부 서비스 표준 디자인 가이드)** 를 기반으로 한다.
토큰의 단일 출처(Source of Truth)는 [`app/globals.css`](../app/globals.css) 의 `:root` 이며,
[`tailwind.config.ts`](../tailwind.config.ts) 가 동일 값을 미러링한다.

> 출처
> - 색상: https://v04.krds.go.kr/guide/style/style_02.html
> - 서체: https://v04.krds.go.kr/guide/style/style_03.html
> - 형태(Radius): https://v04.krds.go.kr/guide/style/style_04.html
> - 배치(Layout/Spacing): https://v04.krds.go.kr/guide/style/style_05.html

## 1. 앱 메인 컬러

**앱의 메인(Primary) 컬러는 `#003675`** (KRDS Navy/Secondary 50)이다.
검찰·법무 도메인의 신뢰감 있는 짙은 남색으로, 흰색 대비 명암비 4.5:1(WCAG AA)을 충족한다.

## 2. 색상 팔레트 (KRDS 실측값)

### Navy — 앱 Primary (KRDS Secondary scale)
| step | 0 | 5 | 10 | 20 | 30 | 40 | **50** | 60 | 70 | 80 | 90 | 100 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hex | #FFFFFF | #EDF1F5 | #CDD7E4 | #B4C4D6 | #99B0CB | #2A5C96 | **#003675** | #002B5E | #002046 | #00162F | #000B17 | #000000 |

### Blue — 보조 액센트 (KRDS Primary, 링크/포커스)
| step | 30 | 40 | **50** | 60 | 70 |
|---|---|---|---|---|---|
| hex | #7CA6F3 | #5089EF | **#246BEB** | #1D56BC | #16408D |

### Grayscale
| step | 0 | 5 | 10 | 20 | 40 | 50 | 70 | 90 | 100 |
|---|---|---|---|---|---|---|---|---|---|
| hex | #FFFFFF | #F8F8F8 | #F0F0F0 | #E4E4E4 | #C6C6C6 | #8E8E8E | #555555 | #1D1D1D | #000000 |
| 용도 | 흰 배경 | BG | BG | Disabled | Border | Text-disabled | **Text-body** | **Text-title** | — |

### Point (Red) — 강조
Base 50 = `#E71825`.

### System
| 의미 | 색상 | 배경(tonal) | 용도 |
|---|---|---|---|
| Danger | `#EB003B` | #FDF2F3 | 오류·금지·위험·삭제·불가 |
| Warning | `#FFB724` | #FFF7E6 | 주의 |
| Success | `#008A1E` | #E7F6EA | 성공·진행 |
| Information | `#2768FF` | #EFF5FF | 정보·강조 |

## 3. 시맨틱 매핑

| 토큰 | 값 | Tailwind |
|---|---|---|
| brand | #003675 | `bg-primary`, `text-primary` |
| surface (앱 셸) | #F8F8F8 | `bg-surface` |
| surface.raised (카드) | #FFFFFF | `bg-surface-raised` |
| line (경계) | #E4E4E4 | `border-line` |
| line.strong | #C6C6C6 | `border-line-strong` |
| ink.title | #1D1D1D | `text-ink-title` |
| ink.body | #555555 | `text-ink-body` |
| ink.disabled | #8E8E8E | `text-ink-disabled` |
| focus ring | #246BEB | `ring-ring` |

## 4. 서체 (Typography)

- 기본 글꼴: **Pretendard GOV** → Pretendard → 시스템 산세리프 폴백
  - 내부망/오프라인에서는 자동으로 시스템 폰트로 폴백된다. **운영 시 Pretendard GOV self-host 필수.**
- Line-height 기본 1.5, 한글 `word-break: keep-all`
- 텍스트 계층(Tailwind `text-*`): `display-l(40)` · `display-m(32)` · `heading-l(28)` · `heading-m(24)` · `heading-s(20)` · `title(18)` · `body-l(17)` · `body(16)` · `body-s(15)` · `label(14)` · `caption(13)` · `detail(12)`

## 5. 형태 (Radius)

정부상징 로고 사용 기관 규칙에 따라 **최대 12px** 로 제한.

| 토큰 | 값 | 적용 |
|---|---|---|
| `rounded-xs` | 2px | Badge-dot, indicator |
| `rounded-sm` | 4px | Tag, Chip, Checkbox |
| `rounded-md` | 6px | **Button, Input, Select** (기본) |
| `rounded-lg` | 8px | Card, Dialog |
| `rounded-xl` | 12px | Banner, Bottom sheet (최대) |

## 6. 배치 (Layout / Spacing)

- **Spacing**: 8pt grid (+4px 보조) — `1=2 · 2=4 · 3=8 · 4=12 · 5=16 · 6=20 · 7=24 · 8=32 · 9=40 · 10=48`
- **Screen margin**: PC 최소 24px, Mobile 최소 16px
- **콘텐츠 최대 영역**: 1280px (`max-w-content`)
- **Grid**: Desktop 12(최대16) / Tablet 8(최대12) / Mobile 4(최대6) column
- **Breakpoint**: Mobile 360–600 / Tablet 601–1024 / Desktop 1025–1920

## 7. 로고 사용 정책

본 시스템의 **주최 기관은 법무부**이므로 법무부 로고를 메인으로 사용한다.

| 로고 | 파일 | 사용처 |
|---|---|---|
| **법무부** (정부상징 + 워드마크) | `public/logo/moj-logo.png` | **헤더(Masthead) 메인**, 보고서 표지, 문서 푸터 |
| 검찰(검찰 깃발 엠블럼) | `public/logo/prosecution-flag.svg` | 보조 식별자(검찰청 컨텍스트), 검찰청별 보기 헤더, 파비콘 |

- KRDS "공식 배너(Masthead)" + "운영기관 식별자(Identifier)" 패턴을 따른다.
- 상단 공식 배너: "이 누리집은 대한민국 공식 전자정부 누리집입니다" 고지.
