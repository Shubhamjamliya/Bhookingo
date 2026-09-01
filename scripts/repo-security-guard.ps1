param(
  [ValidateSet('preflight', 'scan')]
  [string]$Mode = 'preflight'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$LifecycleScriptNames = @('preinstall', 'install', 'postinstall', 'prepublish', 'prepublishOnly', 'prepare', 'prestart', 'poststart', 'predev', 'postdev', 'prepack', 'postpack')
$ForbiddenCommandPatterns = @(
  '(?i)(replace_colors|replace_ordersmain_colors|replace_remaining_colors|modernize(_v[2-4])?|trim_data)\.(js|cjs)',
  '(?i)invoke-expression',
  '(?i)downloadstring',
  '(?i)frombase64string',
  '(?i)encodedcommand',
  '(?i)executionpolicy\s+bypass'
)
$MalwareIndicators = @(
  'A8-3713-1',
  'A8-3387',
  'Payload-B6',
  'x-payload-b64',
  'lastSenderTxViaIndexer',
  'NONCE_FANOUT'
)

function Fail([string]$Message) {
  Write-Host "[Security Guard] $Message" -ForegroundColor Red
  exit 1
}

function Assert-NoCustomGitHooks {
  $configuredPath = git config --get core.hooksPath 2>$null
  if ($LASTEXITCODE -eq 0 -and $configuredPath) {
    Fail "Custom Git hooks path is configured: $configuredPath"
  }

  $hooksPath = Join-Path $RepoRoot '.git\hooks'
  $activeHooks = Get-ChildItem -Path $hooksPath -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notlike '*.sample' }
  if ($activeHooks) {
    Fail "Active Git hook(s) found: $($activeHooks.Name -join ', ')."
  }
}

function Assert-SafePackageScripts {
  $manifests = Get-ChildItem -Path $RepoRoot -Filter package.json -File -Recurse |
    Where-Object { $_.FullName -notmatch '\\node_modules\\' }
  foreach ($manifest in $manifests) {
    $package = Get-Content -Raw $manifest.FullName | ConvertFrom-Json
    if (-not $package.scripts) { continue }
    foreach ($property in $package.scripts.PSObject.Properties) {
      if ($LifecycleScriptNames -contains $property.Name) {
        Fail "Lifecycle script '$($property.Name)' is not permitted in $($manifest.FullName)."
      }
      foreach ($pattern in $ForbiddenCommandPatterns) {
        if ([string]$property.Value -match $pattern) {
          Fail "Unsafe command in $($manifest.FullName): script '$($property.Name)'."
        }
      }
    }
  }
}

function Assert-NoKnownMalwareIndicators {
  $scannableExtensions = @('.js', '.cjs', '.mjs', '.ts', '.cts', '.mts', '.json')

  if (Get-Command rg -ErrorAction SilentlyContinue) {
    $rgArguments = @('--hidden', '--files-with-matches', '--fixed-strings', '--glob', '*.js', '--glob', '*.cjs', '--glob', '*.mjs', '--glob', '*.ts', '--glob', '*.cts', '--glob', '*.mts', '--glob', '*.json', '--glob', '!node_modules/**', '--glob', '!.git/**', '--glob', '!dist/**', '--glob', '!build/**', '--glob', '!coverage/**', '--glob', '!uploads/**', '--glob', '!logs/**', '--glob', '!.cache/**', '--glob', '!.vite/**', '--glob', '!.next/**')
    foreach ($indicator in $MalwareIndicators) {
      $match = & rg @rgArguments $indicator $RepoRoot 2>$null | Select-Object -First 1
      if ($LASTEXITCODE -eq 0 -and $match) {
        Fail "Known malicious loader indicator '$indicator' found in $match."
      }
    }
    return
  }

  $excludedDirectories = @('node_modules', '.git', 'dist', 'build', 'coverage', 'uploads', 'logs', '.cache', '.vite', '.next')
  $pendingDirectories = [System.Collections.Generic.Stack[string]]::new()
  $pendingDirectories.Push($RepoRoot)
  $files = @()

  while ($pendingDirectories.Count -gt 0) {
    $directory = $pendingDirectories.Pop()
    Get-ChildItem -LiteralPath $directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
      if ($_.PSIsContainer) {
        if ($excludedDirectories -notcontains $_.Name) {
          $pendingDirectories.Push($_.FullName)
        }
      } elseif ($scannableExtensions -contains $_.Extension.ToLowerInvariant()) {
        $files += $_
      }
    }
  }

  foreach ($indicator in $MalwareIndicators) {
    $match = $files | Select-String -SimpleMatch -Pattern $indicator -List -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($match) {
      Fail "Known malicious loader indicator '$indicator' found in $($match.Path)."
    }
  }
}

function Invoke-Preflight {
  Assert-NoCustomGitHooks
  Assert-SafePackageScripts
  Assert-NoKnownMalwareIndicators
  Write-Host '[Security Guard] Git hooks and package scripts passed review.' -ForegroundColor Green
}

function Invoke-DefenderScan {
  if (-not (Get-Command Start-MpScan -ErrorAction SilentlyContinue)) {
    Fail 'Windows Defender scan command is unavailable.'
  }
  Start-MpScan -ScanType CustomScan -ScanPath $RepoRoot
  Write-Host '[Security Guard] Windows Defender custom scan submitted.' -ForegroundColor Green
}

switch ($Mode) {
  'preflight' { Invoke-Preflight }
  'scan' { Invoke-DefenderScan }
}
