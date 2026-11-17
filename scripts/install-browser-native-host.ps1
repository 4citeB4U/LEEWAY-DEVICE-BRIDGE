<#
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.BROWSER_NATIVE_HOST.INSTALL
TAG: LEEWAY.BROWSER.NATIVE.HOST.INSTALL.V1
WHO: LeeWay Industries; WHAT: owner-scoped Windows Native Messaging registration.
WHEN: 2026-11-16; WHERE: scripts/install-browser-native-host.ps1.
WHY: Materialize the browser-to-local-Device-Bridge transport on an enrolled Windows account.
HOW: Validate an existing Rust host binary, write a browser-specific manifest, register its absolute path in HKCU, then read it back.
AUTHORITY: Installation adapter only; it grants no Device Bridge capability by itself.
LICENSE: MIT
#>
[CmdletBinding(SupportsShouldProcess)]
param(
  [Parameter(Mandatory)][ValidateSet('Chrome','Edge','Firefox')][string]$Browser,
  [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9@._-]{1,128}$')][string]$ExtensionId,
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'LeeWay\DeviceBridge'),
  [string]$NativeHostExecutable = (Join-Path $env:LOCALAPPDATA 'LeeWay\DeviceBridge\bin\leeway-browser-native-host.exe'),
  [switch]$PlanOnly
)
$ErrorActionPreference = 'Stop'
$hostName = 'com.leewayindustries.device_bridge'
$manifestRoot = Join-Path $InstallRoot 'browser-native-host'
$manifestPath = Join-Path $manifestRoot "$hostName.$($Browser.ToLowerInvariant()).json"
$registryPath = switch ($Browser) {
  'Chrome'  { "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName" }
  'Edge'    { "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$hostName" }
  'Firefox' { "HKCU:\Software\Mozilla\NativeMessagingHosts\$hostName" }
}
$manifest = [ordered]@{
  name = $hostName
  description = 'LeeWay sovereign local browser courier'
  path = [IO.Path]::GetFullPath($NativeHostExecutable)
  type = 'stdio'
}
if ($Browser -eq 'Firefox') {
  $manifest.allowed_extensions = @($ExtensionId)
} else {
  $manifest.allowed_origins = @("chrome-extension://$ExtensionId/")
}
$plan = [ordered]@{
  browser = $Browser
  extensionId = $ExtensionId
  extensionSource = (Join-Path $InstallRoot 'runtime\apps\extension')
  nativeHostExecutable = $manifest.path
  manifestPath = $manifestPath
  registryPath = $registryPath
  scope = 'CURRENT_USER'
}
if ($PlanOnly) {
  [pscustomobject]$plan | ConvertTo-Json -Depth 4
  return
}
if (-not (Test-Path -LiteralPath $NativeHostExecutable -PathType Leaf)) { throw "LEEWAY_BROWSER_NATIVE_HOST_EXECUTABLE_NOT_FOUND: $NativeHostExecutable" }
$signature = Get-AuthenticodeSignature -LiteralPath $NativeHostExecutable
if ($signature.Status -ne 'Valid') { throw "LEEWAY_BROWSER_NATIVE_HOST_TRUST_REQUIRED: Authenticode status is $($signature.Status)" }
if (-not $PSCmdlet.ShouldProcess("$Browser current-user Native Messaging registration", "Install $hostName")) { return }
New-Item -ItemType Directory -Path $manifestRoot -Force | Out-Null
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding utf8NoBOM
New-Item -Path $registryPath -Force | Out-Null
Set-Item -Path $registryPath -Value $manifestPath
$registeredPath = (Get-Item -Path $registryPath).GetValue('')
if ($registeredPath -ne $manifestPath) { throw 'LEEWAY_BROWSER_NATIVE_HOST_REGISTRY_READBACK_MISMATCH' }
$readback = Get-Content -Raw -LiteralPath $registeredPath | ConvertFrom-Json
if ($readback.name -ne $hostName -or $readback.path -ne $manifest.path) { throw 'LEEWAY_BROWSER_NATIVE_HOST_MANIFEST_READBACK_MISMATCH' }
[pscustomobject]($plan + [ordered]@{ installed = $true; readbackVerified = $true }) | ConvertTo-Json -Depth 4
