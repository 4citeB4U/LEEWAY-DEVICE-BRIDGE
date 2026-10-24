<#
REGION: LEEWAY.DEVICES.COMMANDER
TAG: APPLY_CANONICAL_NATIVE_COMMANDER_BINDING
WHO: Creator-authorized Agent Lee
WHAT: Rebind only native Commander to its Device Bridge-owned source and verified workspace.
WHEN: After native integration tests; WHERE: existing PC body, same port and boot entry.
WHY: Eliminate stale D-drive root and Runtime-owned executor duplication.
HOW: Backup, source-hash pin, compatibility loader, targeted restart, native read-back, rollback on failure.
LICENSE: MIT
#>
[CmdletBinding()]
param([string]$PcRuntime='E:\LeeWay-Work\pc-consciousness-live',[string]$Workspace='E:\LeeWay-Work')
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$r=$PSScriptRoot
if((& git -C $r remote get-url origin|Out-String).Trim() -ne 'https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE.git'){throw 'DEVICE_OWNER_NOT_VERIFIED'}
$server=Join-Path $r 'providers\desktop-commander\native-host\server.mjs'
$policy=Join-Path $r 'providers\desktop-commander\native-host\command-policy.mjs'
if((Get-FileHash $server -Algorithm SHA256).Hash -ne 'AACD3FEE1626A25EC2A7ADEBA38B4797B8297428933F6096E07A8FFC53F53D79'){throw 'UNQUALIFIED_NATIVE_SOURCE'}
$entry=Join-Path $PcRuntime 'host-commander-server.mjs'
if((Get-FileHash $entry -Algorithm SHA256).Hash -ne 'B1818C305544273C5102FB9C2AC270064427F13B9294F9247BC779385F7D275A'){throw 'LIVE_ENTRY_CHANGED'}
if(!(Test-Path $Workspace -PathType Container)){throw 'WORKSPACE_REQUIRED'}
$old=Invoke-RestMethod 'http://127.0.0.1:8891/health' -TimeoutSec 5
if($old.provider -ne 'LEEWAY_NATIVE_HOST_COMMANDER'){throw 'WRONG_LIVE_PROVIDER'}
$listener=Get-NetTCPConnection -LocalPort 8891 -State Listen|Select-Object -First 1
$proc=Get-CimInstance Win32_Process -Filter ('ProcessId='+$listener.OwningProcess)
if(!$proc.CommandLine.Contains($entry)){throw 'LIVE_PROCESS_SOURCE_MISMATCH'}
$run='native-commander-binding-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$backup=Join-Path $PcRuntime ('qualification\'+$run)
$null=New-Item -ItemType Directory -Path $backup
Copy-Item -LiteralPath $entry -Destination (Join-Path $backup 'previous-server.mjs')
$bindingPath=Join-Path $PcRuntime 'host-commander.binding.v1.json'
if(Test-Path $bindingPath){throw 'EXISTING_BINDING_REVIEW_REQUIRED'}
$old|ConvertTo-Json -Depth 8|Set-Content (Join-Path $backup 'health-before.json') -Encoding UTF8
$binding=[ordered]@{schemaVersion='leeway.commander.binding.v1';owner='4citeB4U/LEEWAY-DEVICE-BRIDGE';provider='LEEWAY_NATIVE_HOST_COMMANDER';bodyId='pc-primary';port=8891;workspaceRoot=$Workspace;sourcePath=$server;sourceSha256=(Get-FileHash $server -Algorithm SHA256).Hash;policyPath=$policy;policySha256=(Get-FileHash $policy -Algorithm SHA256).Hash;remoteExposure=$false}
$binding|ConvertTo-Json|Set-Content $bindingPath -Encoding UTF8
$loader=@'
/*
REGION: LEEWAY.PC.BOOT_COMPATIBILITY
TAG: LEEWAY_DEVICES_COMMANDER_LOADER
WHO: Creator-authorized Agent Lee; WHAT: Load the existing Device Bridge-owned Commander.
WHEN: Existing PC boot entry; WHERE: compatibility entry only, no duplicate executor.
WHY: Preserve startup while moving implementation ownership into LeeWay Devices.
HOW: Pinned source/policy hashes and explicit body/root configuration, loopback only.
LICENSE: MIT
*/
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url));
const binding=JSON.parse(fs.readFileSync(path.join(here,'host-commander.binding.v1.json'),'utf8').replace(/^\uFEFF/,''));
if(binding.owner!=='4citeB4U/LEEWAY-DEVICE-BRIDGE'||binding.provider!=='LEEWAY_NATIVE_HOST_COMMANDER'||binding.remoteExposure!==false)throw Error('COMMANDER_OWNER_BINDING_INVALID');
for(const [file,expected] of [[binding.sourcePath,binding.sourceSha256],[binding.policyPath,binding.policySha256]]){
 if(createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase()!==expected)throw Error('COMMANDER_SOURCE_HASH_MISMATCH');
}
if(!path.isAbsolute(binding.workspaceRoot)||!fs.statSync(binding.workspaceRoot).isDirectory())throw Error('COMMANDER_WORKSPACE_UNAVAILABLE');
process.env.LEEWAY_HOST_COMMANDER_ROOT=binding.workspaceRoot;
process.env.LEEWAY_HOST_COMMANDER_PORT=String(binding.port);
process.env.LEEWAY_BODY_ID=binding.bodyId;
await import(pathToFileURL(binding.sourcePath).href);
'@
[IO.File]::WriteAllText($entry,$loader,(New-Object Text.UTF8Encoding($false)))
& node --check $entry
if($LASTEXITCODE -ne 0){Copy-Item (Join-Path $backup 'previous-server.mjs') $entry -Force;throw 'LOADER_PARSE_FAILED_LIVE_UNCHANGED'}
$newProc=$null
try {
 Stop-Process -Id $proc.ProcessId
 $newProc=Start-Process -FilePath $proc.ExecutablePath -ArgumentList ('"'+$entry+'"') -WorkingDirectory $PcRuntime -WindowStyle Hidden -RedirectStandardOutput (Join-Path $backup 'stdout.log') -RedirectStandardError (Join-Path $backup 'stderr.log') -PassThru
 $after=$null
 for($i=0;$i -lt 40;$i++){try{$after=Invoke-RestMethod 'http://127.0.0.1:8891/health' -TimeoutSec 1;if($after.root -eq $Workspace -and $after.bodyId -eq 'pc-primary'){break}}catch{};Start-Sleep -Milliseconds 250}
 if(!$after -or $after.root -ne $Workspace -or $after.deviceAuthority -ne '4citeB4U/LEEWAY-DEVICE-BRIDGE'){throw 'POST_BIND_HEALTH_FAILED'}
 $req=@{capability='leeway.files.hash';args=@{path=$server}}|ConvertTo-Json -Compress
 $execution=Invoke-RestMethod 'http://127.0.0.1:8891/execute' -Method Post -ContentType 'application/json' -Body $req -TimeoutSec 5
 if($execution.result.hash.ToUpperInvariant() -ne $binding.sourceSha256){throw 'NATIVE_READBACK_HASH_MISMATCH'}
 $execution|ConvertTo-Json -Depth 8|Set-Content (Join-Path $backup 'native-hash-receipt.json') -Encoding UTF8
 $after|ConvertTo-Json -Depth 8|Set-Content (Join-Path $backup 'health-after.json') -Encoding UTF8
 [ordered]@{status='NATIVE_COMMANDER_REBOUND_AND_READBACK_VERIFIED';owner=$binding.owner;provider=$binding.provider;bodyId=$binding.bodyId;root=$after.root;nativePid=$newProc.Id;sourceSha256=$binding.sourceSha256;executionReceiptHash=$execution.receiptHash;remotePairing='NOT_QUALIFIED';phoneInstalled=$false;formulaExecution='NOT_EXECUTED';learningLedgerUpdated=$false}|ConvertTo-Json -Depth 8|Tee-Object -FilePath (Join-Path $backup 'binding-receipt.json')
} catch {
 $failure=$_.Exception.Message
 if($newProc){Stop-Process -Id $newProc.Id -ErrorAction SilentlyContinue}
 Copy-Item (Join-Path $backup 'previous-server.mjs') $entry -Force
 $env:LEEWAY_ROOT=$old.root
 $null=Start-Process -FilePath $proc.ExecutablePath -ArgumentList ('"'+$entry+'"') -WorkingDirectory $PcRuntime -WindowStyle Hidden -PassThru
 throw ('COMMANDER_REBIND_FAILED_ROLLED_BACK:'+ $failure)
}
