param(
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'LeeWay\DeviceBridge'),
  [string]$DeviceId,
  [string]$EnrollmentRecordPath,
  [string]$RelayUrl,
  [SecureString]$MeshToken
)
$ErrorActionPreference = 'Stop'
$sourceRoot = $PSScriptRoot
$cargo = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
if (-not (Test-Path -LiteralPath $cargo)) { throw 'RUST_TOOLCHAIN_REQUIRED' }
& $cargo build --manifest-path (Join-Path $sourceRoot 'Cargo.toml') --workspace --release
if ($LASTEXITCODE -ne 0) { throw 'LEEWAY_CORE_BUILD_FAILED' }

$partitions = 'Workspace','Sandbox','Continuum','DigitalBrain','Diagnostics','Ledger','Receipts'
foreach ($path in @('bin','config','credentials','keys','scripts','runtime\operator','runtime\apps','runtime\scripts','SovereignNode')) {
  New-Item -ItemType Directory -Path (Join-Path $InstallRoot $path) -Force | Out-Null
}
foreach ($partition in $partitions) {
  New-Item -ItemType Directory -Path (Join-Path $InstallRoot "SovereignNode\$partition") -Force | Out-Null
}
Copy-Item -LiteralPath (Join-Path $sourceRoot 'target\release\leeway-core.exe') -Destination (Join-Path $InstallRoot 'bin\leeway-core.exe') -Force
Copy-Item -LiteralPath (Join-Path $sourceRoot 'scripts\start-leeway-core.ps1') -Destination (Join-Path $InstallRoot 'scripts\start-leeway-core.ps1') -Force
Copy-Item -LiteralPath (Join-Path $sourceRoot 'scripts\generate-device-key.mjs') -Destination (Join-Path $InstallRoot 'scripts\generate-device-key.mjs') -Force
Copy-Item -LiteralPath (Join-Path $sourceRoot 'operator\workstation-relay-agent.mjs') -Destination (Join-Path $InstallRoot 'runtime\operator\workstation-relay-agent.mjs') -Force
New-Item -ItemType Directory -Path (Join-Path $InstallRoot 'runtime\apps\desktop') -Force | Out-Null
Copy-Item -Path (Join-Path $sourceRoot 'apps\desktop\*') -Destination (Join-Path $InstallRoot 'runtime\apps\desktop') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $sourceRoot 'scripts\mesh-replication-worker.mjs') -Destination (Join-Path $InstallRoot 'runtime\scripts\mesh-replication-worker.mjs') -Force

$privateKey = Join-Path $InstallRoot 'keys\device-private.pem'
$publicKey = Join-Path $InstallRoot 'keys\device-public.pem'
& node (Join-Path $InstallRoot 'scripts\generate-device-key.mjs') $privateKey $publicKey
if ($LASTEXITCODE -ne 0) { throw 'LEEWAY_DEVICE_KEYGEN_FAILED' }

$registryPath = Join-Path $InstallRoot 'config\trusted-device-registry.json'
if ($EnrollmentRecordPath) {
  Copy-Item -LiteralPath $EnrollmentRecordPath -Destination $registryPath -Force
} elseif (-not (Test-Path -LiteralPath $registryPath)) {
  '{"devices":[]}' | Set-Content -LiteralPath $registryPath -Encoding utf8NoBOM
}

$credentialState = 'LOGIN_REQUIRED'
if ($null -ne $MeshToken) {
  $MeshToken | ConvertFrom-SecureString | Set-Content -LiteralPath (Join-Path $InstallRoot 'credentials\mesh-token.dpapi') -Encoding ascii
  $credentialState = 'HOST_CREDENTIAL_BOUND'
}
if ($DeviceId -and $DeviceId -match '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$') {
  Set-Content -LiteralPath (Join-Path $InstallRoot 'config\device-id') -Value $DeviceId -Encoding ascii -NoNewline
} elseif ($credentialState -eq 'HOST_CREDENTIAL_BOUND') {
  throw 'LEEWAY_DEVICE_ID_REQUIRED_AFTER_LOGIN'
}
if ($credentialState -eq 'HOST_CREDENTIAL_BOUND') {
  if ($RelayUrl -notmatch '^wss://') { throw 'LEEWAY_RELAY_URL_REQUIRED_AFTER_LOGIN' }
  Set-Content -LiteralPath (Join-Path $InstallRoot 'config\relay-url') -Value $RelayUrl -Encoding ascii -NoNewline
}

$launcher = Join-Path $InstallRoot 'scripts\start-leeway-core.ps1'
if ($credentialState -eq 'HOST_CREDENTIAL_BOUND') {
  $verification = & (Join-Path $InstallRoot 'bin\leeway-core.exe') registry-verify --registry $registryPath --device $DeviceId | ConvertFrom-Json
  if ($verification.admitted -ne $true) { throw 'LEEWAY_DEVICE_ENROLLMENT_REQUIRED' }
  & (Join-Path $InstallRoot 'bin\leeway-core.exe') registry-key-verify --registry $registryPath --device $DeviceId --public $publicKey | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'LEEWAY_DEVICE_KEY_NOT_BOUND_TO_ENROLLMENT' }
  $action = New-ScheduledTaskAction -Execute (Join-Path $PSHOME 'pwsh.exe') -Argument "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$launcher`" -InstallRoot `"$InstallRoot`""
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  Register-ScheduledTask -TaskName 'LeeWay Sovereign Core' -Action $action -Trigger $trigger -Description 'LeeWay user-owned sovereign core daemon' -Force | Out-Null
}

[pscustomobject]@{
  installed = $true
  installRoot = $InstallRoot
  partitions = $partitions
  credentialState = $credentialState
  deviceKeyState = 'HOST_HELD'
  daemonState = if ($credentialState -eq 'HOST_CREDENTIAL_BOUND') { 'REGISTERED_AT_LOGON' } else { 'AWAITING_OWNER_LOGIN' }
} | ConvertTo-Json -Depth 4
