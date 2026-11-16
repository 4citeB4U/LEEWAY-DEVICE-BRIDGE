param(
  [Parameter(Mandatory=$true)][string]$InstallRoot
)
$ErrorActionPreference = 'Stop'
$credentialPath = Join-Path $InstallRoot 'credentials\mesh-token.dpapi'
$registryPath = Join-Path $InstallRoot 'config\trusted-device-registry.json'
$corePath = Join-Path $InstallRoot 'bin\leeway-core.exe'
$deviceIdPath = Join-Path $InstallRoot 'config\device-id'
$relayUrlPath = Join-Path $InstallRoot 'config\relay-url'
if (-not (Test-Path -LiteralPath $credentialPath)) { throw 'LEEWAY_MESH_TOKEN_CREDENTIAL_REQUIRED' }
if (-not (Test-Path -LiteralPath $registryPath)) { throw 'LEEWAY_DEVICE_REGISTRY_REQUIRED' }
if (-not (Test-Path -LiteralPath $deviceIdPath)) { throw 'LEEWAY_DEVICE_ID_REQUIRED' }
if (-not (Test-Path -LiteralPath $relayUrlPath)) { throw 'LEEWAY_RELAY_URL_REQUIRED' }
$secure = Get-Content -Raw -LiteralPath $credentialPath | ConvertTo-SecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:LEEWAY_MESH_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  $env:LEEWAY_TRUSTED_DEVICE_REGISTRY_PATH = $registryPath
  $env:LEEWAY_SOVEREIGN_ROOT = Join-Path $InstallRoot 'SovereignNode'
  $env:LEEWAY_DEVICE_ID = (Get-Content -Raw -LiteralPath $deviceIdPath).Trim()
  $env:LEEWAY_RELAY_URL = (Get-Content -Raw -LiteralPath $relayUrlPath).Trim()
  $env:LEEWAY_DEVICE_PRIVATE_KEY_PATH = Join-Path $InstallRoot 'keys\device-private.pem'
  $env:LEEWAY_WORKSPACE = Join-Path $InstallRoot 'SovereignNode\Workspace'
  $env:LEEWAY_CONTINUUM_ROOT = Join-Path $InstallRoot 'SovereignNode\Continuum'
  $core = Start-Process -FilePath $corePath -ArgumentList 'daemon' -PassThru -WindowStyle Hidden
  $replication = Start-Process -FilePath (Get-Command node).Source -ArgumentList @((Join-Path $InstallRoot 'runtime\scripts\mesh-replication-worker.mjs')) -PassThru -WindowStyle Hidden
  try {
    & node (Join-Path $InstallRoot 'runtime\operator\workstation-relay-agent.mjs')
    exit $LASTEXITCODE
  } finally {
    foreach ($child in @($replication,$core)) { if ($child -and -not $child.HasExited) { Stop-Process -Id $child.Id -Force } }
  }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  Remove-Item Env:LEEWAY_MESH_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:LEEWAY_DEVICE_PRIVATE_KEY_PATH -ErrorAction SilentlyContinue
}
