# =====================================================================
# 검찰 AI 워크벤치 자동 수집 래퍼 (Windows 작업 스케줄러용)
#   - nodejs PATH 설정 → 프로젝트 폴더 이동 → tsx 로 통합 수집 실행 → 로그 기록
#   - 등록/해제는 register-auto-collect.ps1 / 작업 스케줄러 참고
# =====================================================================
$ErrorActionPreference = "Continue"
$env:Path = "$env:ProgramFiles\nodejs;" + $env:Path
$proj = "C:\prosecution-ai"
Set-Location $proj

$logDir = Join-Path $proj "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force -Path $logDir | Out-Null }
$log = Join-Path $logDir "auto-collect.log"

"`n===== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') 자동수집 시작 =====" | Out-File -FilePath $log -Append -Encoding utf8
& ".\node_modules\.bin\tsx.cmd" scripts/auto-collect.ts *>> $log
"===== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') 종료 (exit=$LASTEXITCODE) =====" | Out-File -FilePath $log -Append -Encoding utf8
