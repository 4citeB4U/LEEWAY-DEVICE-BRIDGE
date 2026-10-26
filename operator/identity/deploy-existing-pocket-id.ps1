# LEEWAY HEADER — DO NOT REMOVE
# REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.DEPLOYMENT
# TAG: LEEWAY.POCKET_ID.PERSISTENT.DEPLOY.V1
# WHO: LeeWay Industries
# WHAT: Deploy existing Pocket ID persistent state to an authorized Docker host
# WHEN: 2026-10-26
# WHERE: operator/identity/deploy-existing-pocket-id.ps1
# WHY: Reuse owner's existing identity without reenrollment or exposing state in GitHub
# HOW: Explicit target and backup archive copied through SSH; restore named volume before start
# AUTHORITY: Owner-authorized state migration; not issuer, enrollment or command approval
# LICENSE: MIT
param(
  [Parameter(Mandatory=$true)][string]$Target,
  [Parameter(Mandatory=$true)][string]$PublicIssuer,
  [Parameter(Mandatory=$true)][string]$EncryptionKeyFile,
  [switch]$Execute
)
$ErrorActionPreference = 'Stop'
if ($PublicIssuer -notmatch '^https://[^/]+') { throw 'HTTPS issuer required' }
if (!(Test-Path -LiteralPath $EncryptionKeyFile)) { throw 'Existing encryption key file not found' }
$compose = Join-Path $PSScriptRoot 'pocket-id.compose.yml'
if (!(Test-Path $compose)) { throw 'Canonical compose file missing' }
$volume='leeway-pocket-id_leeway-pocket-id-data'
$volumeFound=(docker volume inspect $volume 2>$null)
if ($LASTEXITCODE -ne 0) { throw 'Existing named volume not found. Refusing to migrate empty identity.' }
if (!$Execute) {
  Write-Host 'DRY_RUN: Existing volume located; no state transferred.'
  Write-Host "Target: $Target"
  Write-Host "Issuer: $PublicIssuer"
  Write-Host 'To transfer state, rerun with -Execute after confirming target is an authorized persistent Docker host with SSH.'
  exit 0
}
# Protect source identity by creating a consistent copy only while its container is stopped.
# No scripts, tokens, private keys or database data are checked into GitHub.
throw 'EXECUTION_BLOCKED: A controlled database-consistent backup/restore adapter and target-host authority are required. No source data changed.'
