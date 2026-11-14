<#
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.WORKSTATION.BOOTSTRAP
TAG: LEEWAY.PORTABLE.ENROLLED.WORKSTATION.LAUNCHER.V1
WHAT: Start an already-enrolled Windows workstation relay from any checkout location.
WHY: Device identity and credentials are deployment bindings, never source defaults.
HOW: Require caller-supplied enrollment values, validate the local workspace, then launch the bounded relay agent.
AUTHORITY: Local operator bootstrap only; this script does not enroll, sign, grant, or verify a device.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$')] [string] $DeviceId,
  [Parameter(Mandatory)] [ValidateLength(16, 512)] [string] $MeshToken,
  [Parameter(Mandatory)] [ValidatePattern('^wss?://')] [string] $RelayUrl,
  [Parameter(Mandatory)] [string] $Workspace,
  [ValidatePattern('^[A-Z][A-Z0-9_]{1,127}$')] [string] $DeviceRole = 'WORKSTATION_NODE',
  [ValidateRange(1024, 65535)] [int] $StatusPort = 8009
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$agentPath = Join-Path $repoRoot 'operator\hp-standalone-agent.mjs'
$node = Get-Command node -ErrorAction Stop
$workspacePath = (Resolve-Path -LiteralPath $Workspace -ErrorAction Stop).Path

if (-not (Test-Path -LiteralPath $agentPath -PathType Leaf)) {
  throw "HP_RELAY_AGENT_NOT_FOUND: $agentPath"
}

$env:LEEWAY_DEVICE_ID = $DeviceId
$env:LEEWAY_MESH_TOKEN = $MeshToken
$env:LEEWAY_RELAY_URL = $RelayUrl
$env:LEEWAY_DEVICE_WORKSPACE = $workspacePath
$env:LEEWAY_DEVICE_ROLE = $DeviceRole
$env:HP_AGENT_HTTP_PORT = [string]$StatusPort

Write-Host "Starting enrolled LeeWay workstation relay for $DeviceId."
Write-Host "Workspace: $workspacePath"
Write-Host "Relay: $RelayUrl"
& $node.Source $agentPath
exit $LASTEXITCODE
