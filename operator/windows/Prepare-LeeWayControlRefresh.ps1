<#
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.OWNER.REFRESH
TAG: LEEWAY.DEVICE.BRIDGE.CONTROL_REFRESH_PREFLIGHT_V1
5WH:
WHAT = Stage pinned Device Bridge and Runtime Fabric candidates and audit the original Windows MCP host.
WHY = Prepare a single safe owner refresh without promoting discovery-only mode or placeholder C3 authority.
WHO = The authenticated Windows owner and external contributors, under LeeWay Standards.
WHERE = operator/windows/Prepare-LeeWayControlRefresh.ps1
WHEN = 2026-11-20.
HOW = Verify exact PR commit identities, observe the existing scheduled task and startup source, report fail-closed blockers.
LICENSE = MIT.
This program NEVER enables execution, changes task actions, restarts services, or writes outside $HOME/.leeway.
#>
[CmdletBinding()]
param(
  [ValidateSet('Audit','Stage')][string]$Mode = 'Stage',
  [string]$TaskName = 'LeeWay Device Bridge Relay',
  [string]$BootstrapPath,
  [string]$StageRoot = (Join-Path $HOME '.leeway\staging\bridge-control-refresh')
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$records = [System.Collections.Generic.List[object]]::new()
$blockers = [System.Collections.Generic.List[string]]::new()
function Record([string]$check,[string]$status,[string]$detail) {
  [void]$records.Add([pscustomobject]@{check=$check;status=$status;detail=$detail})
  if($status -eq 'BLOCKED') { [void]$blockers.Add($check) }
}
function Resolve-TaskEntrypoint([object]$task) {
  if (-not $task -or @($task.Actions).Count -ne 1) { return $null }
  $action = @($task.Actions)[0]
  $arguments = [string]$action.Arguments
  $match = [regex]::Match($arguments,'(?i)-File\s+(?:"(?<file>[^"]+\.ps1)"|(?<file>[^\s]+\.ps1))')
  if (-not $match.Success) { return $null }
  $candidate = $match.Groups['file'].Value.Trim("'")
  if(-not [System.IO.Path]::IsPathRooted($candidate) -and $action.WorkingDirectory) {
    $candidate=Join-Path $action.WorkingDirectory $candidate
  }
  if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $null }
  return Join-Path (Split-Path -Parent $candidate) 'native-discovery-bootstrap.mjs'
}
function Check-Bootstrap([string]$sourcePath) {
  if (-not $sourcePath -or -not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
    Record 'HOST_BOOTSTRAP' 'BLOCKED' 'Existing native-discovery-bootstrap.mjs could not be resolved from task; use -BootstrapPath.'
    return
  }
  $source=Get-Content -LiteralPath $sourcePath -Raw
  $hash=(Get-FileHash -Algorithm SHA256 -LiteralPath $sourcePath).Hash.ToLowerInvariant()
  Record 'HOST_BOOTSTRAP' 'OBSERVED' ("SHA256={0}; path={1}" -f $hash,$sourcePath)
  if($source -match 'enableExecution\s*:\s*false'){
    Record 'EXECUTION_REGISTRATION' 'BLOCKED' 'The running host explicitly selects discovery-only mode.'
  } else {
    Record 'EXECUTION_REGISTRATION' 'UNVERIFIED' 'Source text alone does not prove live execution tools/list.'
  }
  if($source -match '(?s)formulaPreGate\s*:\s*async.*?if\s*\(!r\.ok\)\s*return\s+true' -or
     $source -match '(?s)formulaPreGate\s*:\s*async.*?catch\s*\{\s*return\s+true\s*;?\s*\}'){
    Record 'FORMULA_PRE' 'BLOCKED' 'Fail-open Formula health fallback found in startup source.'
  } else {
    Record 'FORMULA_PRE' 'UNVERIFIED' 'A genuine request-bound Formula evaluation and actual receipt are still required.'
  }
  if($source -match 'Boolean\(deviceId\s*&&\s*platform\s*&&\s*capability\)'){
    Record 'VERITAS_PRE' 'BLOCKED' 'Placeholder field-presence Veritas pre-gate detected.'
  } else {
    Record 'VERITAS_PRE' 'UNVERIFIED' 'Independently authenticated Veritas PRE evidence is not established by source inspection.'
  }
  if($source -match 'consentProvider\s*:\s*async' -and $source -match 'createConsentEvidenceToken'){
    Record 'OWNER_CONSENT' 'BLOCKED' 'Host issues consent tokens locally; fresh authenticated owner interaction is not demonstrated.'
  } else {
    Record 'OWNER_CONSENT' 'UNVERIFIED' 'Verify actual per-operation signed owner interaction, not token shape.'
  }
  if($source -notmatch 'complianceCardProvider' -or $source -notmatch 'complianceCardGate'){
    Record 'COMPLIANCE_CARD' 'BLOCKED' 'Host startup does not bind both trusted compliance-card providers.'
  } else {
    Record 'COMPLIANCE_CARD' 'UNVERIFIED' 'Check live Runtime validation result before execution admission.'
  }
}
function Stage-PinnedRepo([string]$name,[string]$remote,[string]$pullRef,[string]$expectedSha) {
  $short=$expectedSha.Substring(0,12)
  $dest=Join-Path $StageRoot ($name+'-'+$short)
  if(-not (Test-Path -LiteralPath $dest)){
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    & git init -q $dest
    if($LASTEXITCODE -ne 0) { throw "GIT_INIT_FAILED:$name" }
    & git -C $dest remote add origin $remote
    if($LASTEXITCODE -ne 0) { throw "GIT_REMOTE_BIND_FAILED:$name" }
  }
  if(-not (Test-Path -LiteralPath (Join-Path $dest '.git'))){throw "STAGING_REPO_INVALID:$name"}
  $remoteUrl=(& git -C $dest remote get-url origin).Trim()
  if($remoteUrl -cne $remote){throw "STAGING_REMOTE_IDENTITY_MISMATCH:$name"}
  $dirty=(& git -C $dest status --porcelain)
  if($LASTEXITCODE -ne 0 -or $dirty){throw "STAGING_WORKTREE_DIRTY:$name"}
  # Fetch the PR ref only as a transport; select the reviewed immutable commit
  # by full object ID, not the mutable PR head.
  & git -C $dest fetch --no-tags --depth 50 origin $pullRef 2>&1 | Out-Null
  if($LASTEXITCODE -ne 0) { throw "GIT_FETCH_FAILED:$name" }
  & git -C $dest merge-base --is-ancestor $expectedSha FETCH_HEAD
  if($LASTEXITCODE -ne 0) { throw "SOURCE_COMMIT_NOT_IN_REVIEWED_PR:$name" }
  & git -C $dest checkout --detach $expectedSha 2>&1 | Out-Null
  if($LASTEXITCODE -ne 0) { throw "GIT_CHECKOUT_FAILED:$name" }
  $head=(& git -C $dest rev-parse HEAD).Trim()
  if($head -cne $expectedSha){throw "SOURCE_CHECKOUT_MISMATCH:$name"}
  Record ("STAGED_"+$name) 'PASS' ("SHA="+$head+"; path="+$dest)
}
if($PSVersionTable.PSVersion.Major -lt 7 -or -not $IsWindows){
  Record 'WINDOWS_POWERSHELL_7' 'BLOCKED' 'Run in PowerShell 7 on the owner Windows host.'
} else {
  Record 'WINDOWS_POWERSHELL_7' 'PASS' ("PowerShell "+$PSVersionTable.PSVersion)
}
if(Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue){
  $task=Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if($task){
    Record 'EXISTING_RELAY_TASK' 'OBSERVED' ("State="+$task.State+"; task="+$TaskName)
    if(-not $BootstrapPath){$BootstrapPath=Resolve-TaskEntrypoint $task}
  }else{Record 'EXISTING_RELAY_TASK' 'BLOCKED' 'Expected scheduled task absent; do not create a second task.'}
}else{Record 'EXISTING_RELAY_TASK' 'BLOCKED' 'Windows Task Scheduler tools are unavailable.'}
Check-Bootstrap $BootstrapPath
if($Mode -eq 'Stage'){
  if(-not (Get-Command git -ErrorAction SilentlyContinue)){
    Record 'STAGING_GIT' 'BLOCKED' 'Git is required to pin and fetch canonical source.'
  }else{
    $allowedRoot=[System.IO.Path]::GetFullPath((Join-Path $HOME '.leeway'))
    $fullStage=[System.IO.Path]::GetFullPath($StageRoot)
    if(-not $fullStage.StartsWith(($allowedRoot.TrimEnd('\')+'\'),[System.StringComparison]::OrdinalIgnoreCase)){
      Record 'STAGING_LOCATION' 'BLOCKED' 'Staging must remain under current user HOME/.leeway.'
    }else{
      try{
        New-Item -ItemType Directory -Force -Path $fullStage | Out-Null
        Stage-PinnedRepo 'device-bridge' 'https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE.git' 'pull/127/head' '0be4f5aad8cdbd87ded695132da677d93ed8ad62'
        Stage-PinnedRepo 'runtime-fabric' 'https://github.com/4citeB4U/Leeway-Runtime-Fabric.git' 'pull/182/head' '5ed7801f47a653e1f9d9033f1e70bdb5cb903745'
      }catch{Record 'STAGING' 'BLOCKED' $_.Exception.Message}
    }
  }
}
$report=[ordered]@{
  schema='leeway.bridge.control-refresh-readiness.v1'
  observedAt=(Get-Date).ToUniversalTime().ToString('o')
  mode=$Mode
  originalTaskChanged=$false
  runningHostChanged=$false
  desktopExecutionAuthorized=$false
  productionQualified=$false
  activation='NOT_EXECUTED'
  blockers=@($blockers)
  checks=@($records)
}
$report | ConvertTo-Json -Depth 6
# This is an evidence-only preparation command, never a grant or full-control assertion.
if($blockers.Count -gt 0){exit 2}
exit 0
