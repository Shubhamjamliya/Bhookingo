param([ValidateSet('verify', 'dev')] [string]$Mode = 'verify')

$ErrorActionPreference = 'Stop'
$PackageRoot = Split-Path -Parent $PSScriptRoot
$RepoRoot = Split-Path -Parent $PackageRoot
$ProtectedTargets = @('package.json', 'package-lock.json', 'scripts', 'ecosystem.config.cjs', 'nodemon.json')

function Assert-Clean {
  Push-Location $PackageRoot
  try { $dirty = git status --porcelain -- @ProtectedTargets } finally { Pop-Location }
  if ($dirty) {
    Write-Host '[Integrity Guard] Backend startup-critical files are modified. Review the Git diff first.' -ForegroundColor Red
    $dirty | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    exit 1
  }
}

& (Join-Path $RepoRoot 'scripts\repo-security-guard.ps1') -Mode preflight
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Assert-Clean
if ($Mode -eq 'verify') {
  Write-Host '[Integrity Guard] Backend protected files match Git.' -ForegroundColor Green
  exit 0
}
Set-Location $PackageRoot
node .\node_modules\nodemon\bin\nodemon.js --config nodemon.json server.js
exit $LASTEXITCODE
