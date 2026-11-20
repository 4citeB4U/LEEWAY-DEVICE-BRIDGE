# LEEWAY HEADER — DO NOT REMOVE
# REGION: LEEWAY.DEVICE.BRIDGE.OPERATOR.DIAGNOSTICS
# TAG: LEEWAY.DEVICE.BRIDGE.FUNNEL.502.READONLY.V1
# WHO: LeeWay Industries and authorized local operators
# WHAT: Evidence-only qualification of native MCP listener candidates and Tailscale Funnel
# WHEN: 2026-11-04 original; 2026-11-13 multi-port diagnostic correction
# WHERE: operator/diagnose-discovery-502.ps1
# WHY: Avoid falsely declaring native MCP down by probing only historical port 4271 when port 8008 may be active
# HOW: Read-only PowerShell, explicit override or bounded candidate ports, redacted Funnel status, no mutations
# AUTHORITY: OBSERVATION ONLY. Candidate ports are not runtime identity; no remote OAuth, Formula, Veritas or execution proof
# LICENSE: MIT
[CmdletBinding()]
param(
  # Zero means inspect both documented historical candidates, not select an authoritative port.
  [ValidateScript({ $_ -eq 0 -or ($_ -ge 1024 -and $_ -le 65535) })]
  [int]$LocalMcpPort = 0,
  [switch]$IncludePublicDns,
  [string]$FunnelHost = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Ports = if ($LocalMcpPort -eq 0) { @(8008, 4271) } else { @($LocalMcpPort) }
$Report = [ordered]@{
  schemaVersion = '1.1'
  authority = 'READ_ONLY_LOCAL_OBSERVATION'
  observedAt = [DateTime]::UtcNow.ToString('o')
  rootFound = (Test-Path (Join-Path $Root 'apps/desktop/mcp-server.mjs'))
  localMcpPort = if ($LocalMcpPort -eq 0) { $null } else { $LocalMcpPort }
  portSelection = if ($LocalMcpPort -eq 0) { 'HISTORICAL_CANDIDATES_NOT_AUTHORITY' } else { 'EXPLICIT_OPERATOR_PORT' }
  portCandidates = @()
  machine = $env:COMPUTERNAME
  service = 'NOT_CHECKED'
  listener = 'NOT_CHECKED'
  loopbackTcp = 'NOT_CHECKED'
  tailscaleCommand = 'NOT_CHECKED'
  tailscaleFunnel = 'NOT_CHECKED'
  publicDns = 'NOT_REQUESTED'
  interpretation = 'UNVERIFIED'
  notes = @()
}
try {
  $tsSvc = Get-Service -Name 'Tailscale' -ErrorAction SilentlyContinue
  $Report.service = if ($null -eq $tsSvc) { 'NOT_INSTALLED' } else { $tsSvc.Status.ToString() }
} catch { $Report.service = 'READ_FAILED' }

foreach ($Port in $Ports) {
  $Observation = [ordered]@{
    port = $Port
    listener = 'NOT_CHECKED'
    loopbackTcp = 'NOT_CHECKED'
  }
  try {
    $tcp = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
    $Observation.listener = if ($tcp.Count -gt 0) { 'LISTENING' } else { 'NOT_LISTENING' }
  } catch { $Observation.listener = 'READ_FAILED' }
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
      $task = $client.ConnectAsync('127.0.0.1', $Port)
      if ($task.Wait(1200) -and $client.Connected) {
        $Observation.loopbackTcp = 'CONNECTED'
      } else {
        $Observation.loopbackTcp = 'UNREACHABLE'
      }
    } finally { $client.Dispose() }
  } catch { $Observation.loopbackTcp = 'UNREACHABLE' }
  $Report.portCandidates += [pscustomobject]$Observation
}
$Listening = @($Report.portCandidates | Where-Object { $_.listener -eq 'LISTENING' })
$Reachable = @($Report.portCandidates | Where-Object { $_.loopbackTcp -eq 'CONNECTED' })
$Report.listener = if ($Listening.Count -gt 0) { 'CANDIDATE_LISTENING' } else { 'NO_CANDIDATE_LISTENER_OBSERVED' }
$Report.loopbackTcp = if ($Reachable.Count -gt 0) { 'CANDIDATE_CONNECTED' } else { 'NO_CANDIDATE_CONNECTION_OBSERVED' }

$ts = Get-Command 'tailscale' -ErrorAction SilentlyContinue
if ($ts) {
  $Report.tailscaleCommand = 'AVAILABLE'
  try {
    $response = & $ts.Source funnel status --json 2>$null
    if ($LASTEXITCODE -eq 0 -and $response) {
      $null = $response | ConvertFrom-Json -ErrorAction Stop
      # Deliberately do not print public endpoints, Serve targets, tokens or raw config.
      $Report.tailscaleFunnel = 'STATUS_QUERY_SUCCEEDED'
      $Report.notes += 'Privately compare actual Tailscale Serve/Funnel target, listener PID and approved source SHA; no public MCP request was made.'
    } else { $Report.tailscaleFunnel = 'STATUS_QUERY_FAILED' }
  } catch { $Report.tailscaleFunnel = 'STATUS_QUERY_FAILED' }
} else { $Report.tailscaleCommand = 'UNAVAILABLE' }

if ($IncludePublicDns -and $FunnelHost) {
  if ($FunnelHost -match '^[a-zA-Z0-9.-]+\.ts\.net$' -and $FunnelHost.Length -le 253) {
    try {
      $records = @(Resolve-DnsName -Name $FunnelHost -Type A -Server '1.1.1.1' -ErrorAction Stop)
      $Report.publicDns = if (@($records | Where-Object { $_.Type -eq 'A' }).Count -gt 0) { 'RESOLVES_PUBLICLY' } else { 'NO_PUBLIC_A_RECORD' }
    } catch { $Report.publicDns = 'DNS_QUERY_FAILED' }
  } else { $Report.publicDns = 'INVALID_HOST_FORMAT' }
}

if ($Reachable.Count -gt 0 -and $Report.tailscaleFunnel -eq 'STATUS_QUERY_SUCCEEDED') {
  $Report.interpretation = 'CANDIDATE_TCP_REACHABLE_FUNNEL_STATUS_OBSERVED_REMOTE_UNVERIFIED'
} elseif ($Reachable.Count -gt 0) {
  $Report.interpretation = 'CANDIDATE_TCP_REACHABLE_FUNNEL_AND_REMOTE_UNVERIFIED'
} elseif ($LocalMcpPort -ne 0) {
  $Report.interpretation = 'SELECTED_PORT_UNREACHABLE_OTHER_PORTS_UNVERIFIED'
} else {
  $Report.interpretation = 'CANDIDATE_PORTS_UNREACHABLE_ACTUAL_BINDING_UNVERIFIED'
}
$Report.notes += 'Historical 8008 and 4271 are diagnostic candidates only; neither defines the current native service or Funnel forwarding target.'
$Report.notes += 'TCP reachability is not MCP initialize, authenticated tool execution, device identity or independent verification.'
# No credentials, endpoint details or policy output are included.
$Report | ConvertTo-Json -Depth 5
