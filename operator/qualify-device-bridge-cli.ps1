<#
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE
TAG: LEEWAY.DEVICE.BRIDGE.CLI_QUALIFICATION
5WH:
WHAT = Deterministic local CLI qualification and evidence summary.
WHY = Validate real source, tests and package mismatch without claiming production Veritas.
WHO = LeeWay Device Bridge owner/maintainer.
WHERE = operator/qualify-device-bridge-cli.ps1
WHEN = 2026-10-23
HOW = Resolve -> hash -> run tests -> hash -> classified local evidence.
LICENSE: MIT
#>
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$GitRemote = (& git -C $Root remote get-url origin).Trim()
if ($GitRemote -notmatch '4citeB4U/LEEWAY-DEVICE-BRIDGE(\.git)?$') { throw 'CANONICAL_REMOTE_MISMATCH' }
$Branch = (& git -C $Root branch --show-current).Trim()
$Head = (& git -C $Root rev-parse HEAD).Trim()
$Out = Join-Path (Split-Path $Root -Parent) 'evidence-staging\device-bridge-cli-20261023'
New-Item -ItemType Directory -Force -Path $Out | Out-Null
function Get-Sha256([string]$Target) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $stream = [System.IO.File]::OpenRead($Target)
  try { return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
  finally { $stream.Dispose(); $sha.Dispose() }
}
$Files = @('package.json','operator/device-bridge-cli.mjs','tests/cli/cli.test.mjs','apps/desktop/adapter.mjs','packages/protocol/index.mjs','tests/mcp/desktop-parity-batch2.test.mjs','operator/c3-admission-binding.mjs','tests/c3-unsigned-consent-regression.test.mjs')
$Before = @{}
foreach ($f in $Files) { $Before[$f] = Get-Sha256 (Join-Path $Root $f) }
Push-Location $Root
try {
  $CliLog = & npm.cmd run test:cli 2>&1 | Out-String
  $CliExit = $LASTEXITCODE
  $McpLog = & npm.cmd run test:mcp 2>&1 | Out-String
  $McpExit = $LASTEXITCODE
  $C3Log = & node --test tests/c3-unsigned-consent-regression.test.mjs tests/c3-admission-binding.test.mjs tests/c3-production-fail-closed-startup.test.mjs tests/c3-trusted-issuer-consent.test.mjs tests/device-command-admission-production.test.mjs 2>&1 | Out-String
  $C3Exit = $LASTEXITCODE
  $Catalog = & node operator/device-bridge-cli.mjs verify-catalog 2>&1 | Out-String
  $CatalogExit = $LASTEXITCODE
} finally { Pop-Location }
$After = @{}
foreach ($f in $Files) { $After[$f] = Get-Sha256 (Join-Path $Root $f) }
$Stable = $true
foreach ($f in $Files) { if ($Before[$f] -ne $After[$f]) { $Stable = $false } }
$Qualification = if ($CliExit -eq 0 -and $McpExit -eq 0 -and $C3Exit -eq 0 -and $Stable) { 'LOCAL_TEST_PASS' } else { 'LOCAL_TEST_FAIL' }
$Receipt = [ordered]@{
  schema = 'leeway.device-bridge.local-cli-qualification.v1'
  time = (Get-Date).ToString('o')
  gitRemote = $GitRemote
  gitBranch = $Branch
  gitHead = $Head
  result = $Qualification
  cliTestExitCode = $CliExit
  mcpTestExitCode = $McpExit
  c3TestExitCode = $C3Exit
  catalogVerificationExitCode = $CatalogExit
  catalogState = if ($CatalogExit -eq 0) { 'LOCAL_MANIFEST_FILES_MATCH' } else { 'LOCAL_CATALOG_NOT_QUALIFIED' }
  sourceStableAcrossTests = $Stable
  sourceSha256Before = $Before
  sourceSha256After = $After
  productionVeritas = 'NOT_PERFORMED'
  productionDeviceExecution = 'NOT_PERFORMED'
  learningLedger = 'NOT_UPDATED'
}
$Target = Join-Path $Out 'cli-qualification-local.json'
$Receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Target -Encoding UTF8
$CliLog | Set-Content -LiteralPath (Join-Path $Out 'cli-tests.log') -Encoding UTF8
$McpLog | Set-Content -LiteralPath (Join-Path $Out 'mcp-tests.log') -Encoding UTF8
$C3Log | Set-Content -LiteralPath (Join-Path $Out 'c3-security-tests.log') -Encoding UTF8
$Catalog | Set-Content -LiteralPath (Join-Path $Out 'catalog-verification.json') -Encoding UTF8
$Receipt | ConvertTo-Json -Depth 8
if ($Qualification -ne 'LOCAL_TEST_PASS') { exit 1 }
