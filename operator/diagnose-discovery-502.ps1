# LEEWAY HEADER — DO NOT REMOVE
# REGION: LEEWAY.DEVICE.BRIDGE.OPERATOR.DIAGNOSTICS
# TAG: LEEWAY.DEVICE.BRIDGE.FUNNEL.502.READONLY.V1
# WHO: LeeWay Industries and authorized local operators
# WHAT: Evidence-only qualification of the native MCP listener and Tailscale Funnel
# WHEN: 2026-11-04
# WHERE: operator/diagnose-discovery-502.ps1
# WHY: Separate local MCP service outage from Funnel routing and Windows availability
# HOW: Read-only PowerShell commands, bounded output, zero network or policy mutations
# AUTHORITY: OBSERVATION ONLY. Does not prove remote OAuth, Formula, Veritas or execution
# LICENSE: MIT
[CmdletBinding()]
param(
  [ValidateRange(1024,65535)][int]$LocalMcpPort = 4271,
  [switch]$IncludePublicDns,
  [string]$FunnelHost = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Report = [ordered]@{
  schemaVersion = '1.0'
  authority = 'READ_ONLY_LOCAL_OBSERVATION'
  observedAt = [DateTime]::UtcNow.ToString('o')
  rootFound = (Test-Path (Join-Path $Root 'apps/desktop/mcp-server.mjs'))
  localMcpPort = $LocalMcpPort
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
  $Report.service = if($null -eq $tsSvc){'NOT_INSTALLED'}else{$tsSvc.Status.ToString()}
} catch {$Report.service = 'READ_FAILED'}
try {
  $tcp = @(Get-NetTCPConnection -State Listen -LocalPort $LocalMcpPort -ErrorAction SilentlyContinue)
  $Report.listener = if($tcp.Count -gt 0){'LISTENING'}else{'NOT_LISTENING'}
} catch {$Report.listener = 'READ_FAILED'}
try {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $task = $client.ConnectAsync('127.0.0.1',$LocalMcpPort)
    if($task.Wait(1200) -and $client.Connected){$Report.loopbackTcp='CONNECTED'}
    else{$Report.loopbackTcp='UNREACHABLE'}
  } finally {$client.Dispose()}
} catch {$Report.loopbackTcp='UNREACHABLE'}
$ts = Get-Command 'tailscale' -ErrorAction SilentlyContinue
if($ts) {
  $Report.tailscaleCommand = 'AVAILABLE'
  try {
    $response = & $ts.Source funnel status --json 2>$null
    if($LASTEXITCODE -eq 0 -and $response) {
      $json = $response | ConvertFrom-Json -ErrorAction Stop
      # Deliberately do not print public endpoints, Serve targets, tokens or raw config.
      $Report.tailscaleFunnel = 'STATUS_QUERY_SUCCEEDED'
      $Report.notes += 'Compare local Funnel config privately to the canonical native MCP port; no remote access was tested.'
    } else {$Report.tailscaleFunnel='STATUS_QUERY_FAILED'}
  } catch {$Report.tailscaleFunnel='STATUS_QUERY_FAILED'}
} else {$Report.tailscaleCommand='UNAVAILABLE'}
if($IncludePublicDns -and $FunnelHost) {
  if($FunnelHost -match '^[a-zA-Z0-9.-]+\\.ts\\.net$' -and $FunnelHost.Length -le 253){
    try {
      $records = @(Resolve-DnsName -Name $FunnelHost -Type A -Server '1.1.1.1' -ErrorAction Stop)
      $Report.publicDns = if(@($records | Where-Object {$_.Type -eq 'A'}).Count -gt 0){'RESOLVES_PUBLICLY'}else{'NO_PUBLIC_A_RECORD'}
    } catch {$Report.publicDns='DNS_QUERY_FAILED'}
  } else {$Report.publicDns='INVALID_HOST_FORMAT'}
}
if($Report.listener -eq 'NOT_LISTENING') {
  $Report.interpretation = 'BLOCKED_NATIVE_MCP_NOT_LISTENING'
  $Report.notes += 'Native MCP loopback listener absent; repair owner-authorized service startup before touching Funnel.'
} elseif($Report.loopbackTcp -eq 'CONNECTED' -and $Report.tailscaleFunnel -eq 'STATUS_QUERY_SUCCEEDED') {
  $Report.interpretation = 'LOCAL_MCP_REACHABLE_FUNNEL_CONFIG_PRESENT_PUBLIC_PATH_UNVERIFIED'
} else {
  $Report.interpretation = 'NEEDS_TARGETED_LOCAL_DIAGNOSIS'
}
# No credentials, endpoint details or policy output are included.
$Report | ConvertTo-Json -Depth 4
