<# 
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.OWNER.ACTIVATION.READINESS
TAG: LEEWAY.BRIDGE.OWNER.LIVE_PROVIDER_DIAGNOSTIC_V1
5WH:
WHAT = Inspect the active Windows Bridge task and localhost Formula/Runtime/MCP readiness.
WHY = Distinguish missing live providers from successful source staging before cutover.
WHO = Creator-authorized owner on enrolled Windows host; outside support contributes source only.
WHERE = Existing host PowerShell console; reads staged sources beneath $HOME/.leeway.
WHEN = 2026-11-20.
HOW = Read-only scheduled-task, file SHA-256, loopback HTTP and source-presence observations.
LICENSE = Existing repository terms apply; no new license assertion.
SECURITY = Does not fetch credentials, change files or settings, restart services or grant execution.
#>
[CmdletBinding()]
param(
  [string]$TaskName = 'LeeWay Device Bridge Relay',
  [string]$StageRoot = (Join-Path $HOME '.leeway\staging\bridge-control-refresh'),
  [string]$BootstrapPath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$checks = [System.Collections.Generic.List[object]]::new()
function Add-Check([string]$name,[string]$status,[string]$detail) {
  [void]$checks.Add([pscustomobject]@{check=$name;status=$status;detail=$detail})
}
function Probe-Local([string]$name,[string]$uri) {
  try {
    $parsed = [uri]$uri
    if($parsed.Scheme -ne 'http' -or $parsed.Host -ne '127.0.0.1') { throw 'UNSAFE_PROBE_TARGET' }
    $r = Invoke-WebRequest -Uri $uri -Method Get -SkipHttpErrorCheck -TimeoutSec 5
    $status=[int]$r.StatusCode
    $summary = ('HTTP_{0}' -f $status)
    if ($name -eq 'FORMULA_HEALTH' -and $status -eq 200) {
      try {
        $body = $r.Content | ConvertFrom-Json
        $bStatus=[string]$body.status
        $summary += '; reportedStatus=' + $bStatus
      }catch { $summary += '; statusBody=UNPARSEABLE' }
    }
    if ($name -eq 'RUNTIME_MANIFEST' -and $status -eq 200) {
      try {
        $body=$r.Content | ConvertFrom-Json
        if($body.PSObject.Properties.Name -contains 'rootObjectId') {
          $summary += '; rootObjectIdPresent=' + [bool](-not [string]::IsNullOrWhiteSpace([string]$body.rootObjectId))
        }
      }catch { $summary += '; manifestBody=UNPARSEABLE' }
    }
    $label='OBSERVED'
    if ($status -ge 500) { $label='BLOCKED' }
    elseif ($name -eq 'BRIDGE_MCP_CHALLENGE' -and $status -eq 401) { $label='PASS' }
    elseif ($status -eq 200) { $label='PASS' }
    Add-Check $name $label $summary
  }catch {
    Add-Check $name 'BLOCKED' ('LOCAL_SERVICE_UNREACHABLE:' + $_.Exception.GetType().Name)
  }
}
function Discover-Bootstrap([object]$task) {
  if($null -eq $task -or @($task.Actions).Count -ne 1){return $null}
  $a=@($task.Actions)[0]
  $match=[regex]::Match([string]$a.Arguments,'(?i)-File\s+(?:"(?<file>[^"]+\.ps1)"|(?<file>[^\s]+\.ps1))')
  if(-not $match.Success){return $null}
  $scriptPath=$match.Groups['file'].Value.Trim("'")
  if(-not [IO.Path]::IsPathRooted($scriptPath) -and $a.WorkingDirectory){
    $scriptPath=Join-Path $a.WorkingDirectory $scriptPath
  }
  if(-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)){return $null}
  return (Join-Path (Split-Path -Parent $scriptPath) 'native-discovery-bootstrap.mjs')
}
if($PSVersionTable.PSVersion.Major -lt 7 -or -not $IsWindows){
  Add-Check 'OS_POWERSHELL' 'BLOCKED' 'PowerShell 7 on Windows is required'
}else{
  Add-Check 'OS_POWERSHELL' 'PASS' ('PowerShell ' + $PSVersionTable.PSVersion.ToString())
}
try {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  Add-Check 'SCHEDULED_RELAY' 'OBSERVED' ('Task state=' + [string]$task.State)
  if(-not $BootstrapPath){$BootstrapPath=Discover-Bootstrap $task}
}catch {
  Add-Check 'SCHEDULED_RELAY' 'BLOCKED' 'Existing task not accessible; not creating or changing it'
}
if($BootstrapPath -and (Test-Path -LiteralPath $BootstrapPath -PathType Leaf)){
  $hash=(Get-FileHash -LiteralPath $BootstrapPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $source=Get-Content -LiteralPath $BootstrapPath -Raw
  $mode=if($source -match 'enableExecution\s*:\s*false'){'DISCOVERY_ONLY'}else{'NOT_DETERMINED'}
  Add-Check 'ACTIVE_BOOTSTRAP' 'OBSERVED' ('sha256=' + $hash + '; mode=' + $mode)
  if($source -match '(?s)formulaPreGate\s*:\s*async.*?catch\s*\{\s*return\s+true'){
    Add-Check 'ACTIVE_FORMULA_GATE' 'BLOCKED' 'Fail-open health check found; no task-bound evaluation proven'
  }else{Add-Check 'ACTIVE_FORMULA_GATE' 'UNVERIFIED' 'Requires task-bound Formula receipt readback'}
  if($source -match 'Boolean\(deviceId\s*&&\s*platform\s*&&\s*capability\)'){
    Add-Check 'ACTIVE_VERITAS_GATE' 'BLOCKED' 'Placeholder field-presence gate found'
  }else{Add-Check 'ACTIVE_VERITAS_GATE' 'UNVERIFIED' 'Independent production PRE verification not observed'}
  if($source -match 'consentProvider\s*:\s*async' -and $source -match 'createConsentEvidenceToken'){
    Add-Check 'ACTIVE_OWNER_CONSENT' 'BLOCKED' 'Consent self-signing callback found; interactive provenance not established'
  }else{Add-Check 'ACTIVE_OWNER_CONSENT' 'UNVERIFIED' 'Per-command authenticated owner interaction not observed'}
  if($source -match 'complianceCardGate' -and $source -match 'complianceCardProvider'){
    Add-Check 'ACTIVE_COMPLIANCE_BINDING' 'UNVERIFIED' 'Declared in source; live validation not observed'
  }else{Add-Check 'ACTIVE_COMPLIANCE_BINDING' 'BLOCKED' 'Original bootstrap lacks required two-part compliance binding'}
}else{Add-Check 'ACTIVE_BOOTSTRAP' 'BLOCKED' 'Could not locate current startup from scheduled task; pass -BootstrapPath'}
foreach($name in @('device-bridge','runtime-fabric')){
  $matches = @(Get-ChildItem -LiteralPath $StageRoot -Directory -Filter ($name + '-*') -ErrorAction SilentlyContinue)
  if($matches.Count -lt 1){Add-Check ('STAGED_'+$name) 'BLOCKED' 'No staged checkout observed';continue}
  $valid=@()
  foreach($dir in $matches){
    try{
      $sha=(& git -C $dir.FullName rev-parse HEAD 2>$null).Trim()
      if($LASTEXITCODE -eq 0 -and $sha -match '^[a-f0-9]{40}$'){$valid+=($sha.Substring(0,12))}
    }catch{}
  }
  if($valid.Count -eq 0){Add-Check ('STAGED_'+$name) 'BLOCKED' 'No readable Git commit in source checkouts'}
  else{Add-Check ('STAGED_'+$name) 'PASS' ('Commits: '+($valid -join ', '))}
}
$veritas = Get-ChildItem -LiteralPath $StageRoot -Directory -Filter 'runtime-fabric-*' -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending | Select-Object -First 1
if($veritas){
  $rootFile=Join-Path $veritas.FullName 'automation-runtime\c3-production-veritas-stage-boundary.mjs'
  if(Test-Path -LiteralPath $rootFile -PathType Leaf){
    $body=Get-Content -LiteralPath $rootFile -Raw
    if($body -match 'QUALIFIED_PRODUCTION_VERITAS_ROOTS\s*=\s*Object\.freeze\(\s*\[\s*\]\s*\)'){
      Add-Check 'PRODUCTION_VERITAS_ROOTS' 'BLOCKED' 'Source has zero approved independent custodian roots'
    }else{Add-Check 'PRODUCTION_VERITAS_ROOTS' 'UNVERIFIED' 'Source root list changed; independent enrollment must be verified externally'}
  }
}
Probe-Local 'FORMULA_HEALTH' 'http://127.0.0.1:4001/runtime/formula/v1/health'
Probe-Local 'RUNTIME_HEALTH' 'http://127.0.0.1:4011/runtime/health'
Probe-Local 'RUNTIME_MANIFEST' 'http://127.0.0.1:4011/runtime/enforcement/manifest'
Probe-Local 'BRIDGE_MCP_CHALLENGE' 'http://127.0.0.1:4271/mcp'
$blocks=@($checks|Where-Object status -eq 'BLOCKED'|ForEach-Object check)
$report=[ordered]@{
 schema='leeway.bridge.live-activation-diagnostic.v1'
 observedAt=(Get-Date).ToUniversalTime().ToString('o')
 performed='READ_ONLY'
 changedHost=$false
 executedDesktopCommand=$false
 independentlyVerified=$false
 productionQualified=$false
 blockers=$blocks
 checks=@($checks)
}
$report|ConvertTo-Json -Depth 6
# Intentionally return success so an expected diagnostic blocker does not close the owner's terminal.
exit 0
