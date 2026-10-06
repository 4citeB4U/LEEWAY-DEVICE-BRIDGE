<#
LEEWAY_HEADER - DO NOT REMOVE
REGION: LEEWAY.DEVICES.DESKTOP_COMMANDER.ADMISSION
TAG: NATIVE_COMMANDER_EXISTING_BOOT_ADMISSION
5WH: WHAT=Admit an exactly pinned native candidate through the existing loader/binding;
WHY=Activate the verified owner without another executor, port, public exposure or hard-coded install root;
WHO=Creator-authorized local maintainer; WHERE=scripts/Admit-NativeCommanderBinding.ps1;
WHEN=2026-10-06; HOW=Inspect -> backup -> native pretest -> CAS binding -> restart owned PID -> read-back -> restart replay -> receipt; rollback on failure.
LICENSE: MIT
#>
[CmdletBinding()]
param([Parameter(Mandatory)][string]$BindingFile,[Parameter(Mandatory)][string]$CandidateRoot,[Parameter(Mandatory)][string]$CandidateCommit,[switch]$Apply)
$ErrorActionPreference='Stop'
$owner='4citeB4U/LEEWAY-DEVICE-BRIDGE';$provider='LEEWAY_NATIVE_HOST_COMMANDER'
$BindingFile=(Resolve-Path -LiteralPath $BindingFile).Path;$CandidateRoot=(Resolve-Path -LiteralPath $CandidateRoot).Path
if((git -C $CandidateRoot remote get-url origin).Trim() -ne ('https://github.com/'+$owner+'.git')){throw 'CANDIDATE_OWNER_MISMATCH'}
if((git -C $CandidateRoot rev-parse HEAD).Trim() -ne $CandidateCommit){throw 'CANDIDATE_COMMIT_MISMATCH'}
if(git -C $CandidateRoot status --short --untracked-files=no){throw 'CANDIDATE_TRACKED_SOURCE_DIRTY'}
$b=Get-Content -LiteralPath $BindingFile -Raw|ConvertFrom-Json -AsHashtable
if($b.owner -ne $owner -or $b.provider -ne $provider -or $b.remoteExposure -ne $false){throw 'BINDING_AUTHORITY_MISMATCH'}
$boot=Split-Path $BindingFile;$loader=Join-Path $boot 'host-commander-server.mjs'
$loaderHash=(Get-FileHash $loader -Algorithm SHA256).Hash;$bindingHash=(Get-FileHash $BindingFile -Algorithm SHA256).Hash
foreach($pair in @(@($b.sourcePath,$b.sourceSha256),@($b.policyPath,$b.policySha256))){if((Get-FileHash $pair[0] -Algorithm SHA256).Hash -ne $pair[1]){throw 'OLD_BINDING_PIN_MISMATCH'}}
$source=Join-Path $CandidateRoot 'providers/desktop-commander/native-host/server.mjs'
$policy=Join-Path $CandidateRoot 'providers/desktop-commander/native-host/command-policy.mjs'
$qualified=Get-Content (Join-Path $CandidateRoot 'receipts/native-commander/g3-portability-windows.json') -Raw|ConvertFrom-Json -AsHashtable
if($qualified.qualification.status -ne 'PASS' -or -not $qualified.qualification.sourceStable){throw 'CANDIDATE_QUALIFICATION_UNACCEPTED'}
foreach($rel in $qualified.qualification.sourceAfter.Keys){if((Get-FileHash (Join-Path $CandidateRoot $rel) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $qualified.qualification.sourceAfter[$rel]){throw ('CANDIDATE_QUALIFICATION_DRIFT '+$rel)}}
$uri='http://127.0.0.1:'+([int]$b.port)
$processes=@(Get-CimInstance Win32_Process|Where-Object {$_.Name -eq 'node.exe' -and $_.CommandLine -like ('*'+$loader+'*')})
if($processes.Count -ne 1){throw 'OWNED_LIVE_PROCESS_AMBIGUOUS'}
$oldPid=[int]$processes[0].ProcessId;$node=$processes[0].ExecutablePath
$listeners=@(Get-NetTCPConnection -State Listen -LocalPort ([int]$b.port)|Where-Object OwningProcess -eq $oldPid)
if($listeners.Count -ne 1 -or $listeners[0].LocalAddress -ne '127.0.0.1'){throw 'LOOPBACK_OWNERSHIP_NOT_PROVEN'}
if(@(Get-NetTCPConnection -LocalPort ([int]$b.port)|Where-Object State -eq 'Established').Count){throw 'ACTIVE_COMMAND_CONNECTIONS_DRAIN_FIRST'}
$health=Invoke-RestMethod ($uri+'/health') -TimeoutSec 5
if($health.provider -ne $provider -or $health.deviceAuthority -ne $owner -or $health.bodyId -ne $b.bodyId){throw 'LIVE_IDENTITY_MISMATCH'}
$proof=Join-Path $CandidateRoot ('receipts/native-commander/admission-'+[guid]::NewGuid().ToString('N'));[IO.Directory]::CreateDirectory($proof)|Out-Null
$utf8=[Text.UTF8Encoding]::new($false)
function Save([string]$p,[string]$s){$f=[IO.File]::Open($p,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write);try{$bytes=$utf8.GetBytes($s);$f.Write($bytes,0,$bytes.Length);$f.Flush($true)}finally{$f.Dispose()}}
[IO.File]::Copy($BindingFile,(Join-Path $proof 'binding-before.json'),$false);[IO.File]::Copy($loader,(Join-Path $proof 'loader-before.mjs'),$false)
Save (Join-Path $proof 'prestate.json') (@{owner=$owner;provider=$provider;oldPid=$oldPid;oldBindingHash=$bindingHash;loaderSha256=$loaderHash;candidateCommit=$CandidateCommit;health=$health;scope='EXISTING_LOOPBACK_SERVICE_ONLY';authorization='Creator explicitly approved admission through existing boot/transport binding';rollback='Restore exact binding bytes and restart same loader';globalBootFabricChanged=$false}|ConvertTo-Json -Depth 6)
$pretest=Join-Path $proof 'candidate-native-pretest.tap'
Push-Location $CandidateRoot
try{& $node --test --test-reporter=tap tests/native-commander-portability.test.mjs *> $pretest;$exit=$LASTEXITCODE}finally{Pop-Location}
if($exit -ne 0 -or -not ([IO.File]::ReadAllText($pretest) -match '(?m)^# pass 30\s*$')){throw 'IMMEDIATE_CANDIDATE_PRETEST_FAILED'}
$new=@{};foreach($k in $b.Keys){$new[$k]=$b[$k]}
$new.sourcePath=$source;$new.sourceSha256=(Get-FileHash $source -Algorithm SHA256).Hash
$new.policyPath=$policy;$new.policySha256=(Get-FileHash $policy -Algorithm SHA256).Hash
$new.sourceCommit=$CandidateCommit;$new.admissionScope='PINNED_OWNER_CANDIDATE_EXISTING_LOOPBACK_BINDING'
Save (Join-Path $proof 'binding-after.json') ($new|ConvertTo-Json -Depth 6)
if(-not $Apply){Write-Output ('PREFLIGHT_PASS='+$proof);exit 0}
$changed=$false;$newPids=[Collections.Generic.List[int]]::new();$measurements=[Collections.Generic.List[object]]::new()
function Stop-Owned([int]$ProcessId){
 $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$ProcessId) -ErrorAction SilentlyContinue
 if($p){if($p.Name -ne 'node.exe' -or $p.CommandLine -notlike ('*'+$loader+'*')){throw 'PID_IDENTITY_CHANGED_DO_NOT_KILL'};Stop-Process -Id $ProcessId -Force;Wait-Process -Id $ProcessId -Timeout 5 -ErrorAction SilentlyContinue}
}
function Start-ExistingLoader([string]$suffix){
 $info=[Diagnostics.ProcessStartInfo]::new();$info.FileName=$node;$info.ArgumentList.Add($loader);$info.WorkingDirectory=$boot;$info.UseShellExecute=$false;$info.CreateNoWindow=$true
 $p=[Diagnostics.Process]::Start($info);$newPids.Add($p.Id);return $p.Id
}
function Wait-Health {
 for($i=0;$i -lt 60;$i++){try{$h=Invoke-RestMethod ($uri+'/health') -TimeoutSec 1;if($h.provider -eq $provider -and $h.portability.fixedRootRequired -eq $false){return $h}}catch{};Start-Sleep -Milliseconds 100};throw 'ADMITTED_SERVICE_UNHEALTHY'
}
function Native-Call([string]$cap,[hashtable]$arguments,[string]$name){
 $body=@{capability=$cap;args=$arguments}|ConvertTo-Json -Depth 6
 $res=Invoke-WebRequest ($uri+'/execute') -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 30
 $raw=[string]$res.Content;Save(Join-Path $proof ($name+'.native.json'))$raw
 return ($raw|ConvertFrom-Json)
}
try{
 if((Get-FileHash $BindingFile -Algorithm SHA256).Hash -ne $bindingHash -or (Get-FileHash $loader -Algorithm SHA256).Hash -ne $loaderHash){throw 'BOOT_CAS_CONFLICT'}
 $temp=Join-Path $boot ('binding-next-'+[guid]::NewGuid().ToString('N')+'.json');[IO.File]::Copy((Join-Path $proof 'binding-after.json'),$temp,$false)
 [IO.File]::Replace($temp,$BindingFile,(Join-Path $proof 'binding-replaced-original.json'));$changed=$true
 Stop-Owned $oldPid
 $firstPid=Start-ExistingLoader 'first';$h=Wait-Health
 if($h.bodyId -ne $b.bodyId -or $h.root -ne $b.workspaceRoot -or $h.transport -ne 'LOOPBACK_ONLY' -or $h.remotePairingQualified -ne $false){throw 'POST_ADMISSION_BOUNDARY_CHANGED'}
 $info=Native-Call 'leeway.host.info' @{} 'host-info';if($info.provider -ne $provider -or -not $info.result.OS){throw 'HOST_INFO_READBACK_FAILED'}
 $resource=[IO.Path]::GetRelativePath($b.workspaceRoot,$source).Replace('\','/')
 $hashed=Native-Call 'leeway.files.hash' @{scope='workspace';resource=$resource} 'admitted-source-hash'
 if($hashed.result.hash.ToUpperInvariant() -ne $new.sourceSha256){throw 'LIVE_NATIVE_SOURCE_HASH_MISMATCH'}
 $secondId='';Stop-Owned $firstPid;$secondId=Start-ExistingLoader 'restart';$h2=Wait-Health
 $hashed2=Native-Call 'leeway.files.hash' @{scope='workspace';resource=$resource} 'restart-source-hash'
 if($hashed2.result.hash.ToUpperInvariant() -ne $new.sourceSha256){throw 'RESTART_READBACK_FAILED'}
 $listeners=@(Get-NetTCPConnection -State Listen -LocalPort ([int]$b.port));if($listeners.Count -ne 1 -or $listeners[0].LocalAddress -ne '127.0.0.1' -or $listeners[0].OwningProcess -ne $secondId){throw 'SINGLE_LOOPBACK_PROCESS_NOT_PROVEN'}
 $matching=@(Get-CimInstance Win32_Process|Where-Object {$_.Name -eq 'node.exe' -and $_.CommandLine -like ('*'+$loader+'*')});if($matching.Count -ne 1){throw 'DUPLICATE_NATIVE_LOADER'}
 if((Get-FileHash $source -Algorithm SHA256).Hash -ne $new.sourceSha256 -or (Get-FileHash $loader -Algorithm SHA256).Hash -ne $loaderHash){throw 'POST_ADMISSION_SOURCE_CHANGED'}
 $receipt=[ordered]@{receiptType='LEEWAY_NATIVE_COMMANDER_LIVE_ADMISSION';status='PASS';owner=$owner;provider=$provider;sourceCommit=$CandidateCommit;sourceSha256=$new.sourceSha256;policySha256=$new.policySha256;oldPid=$oldPid;firstNewPid=$firstPid;restartPid=$secondId;singleLoopbackListener=$true;existingLoaderUnchanged=$true;sourceHashNativeReadback='PASS';restartNativeReadback='PASS';workspaceBindingPreserved=$true;bodyBindingPreserved=$true;oldBindingSha256=$bindingHash;newBindingSha256=(Get-FileHash $BindingFile -Algorithm SHA256).Hash;rollbackBackup='binding-before.json';portability='FIXED_PATH_FREE_CORE_WITH_AUTHORIZED_LOCAL_RESOURCE_BINDING';remoteExposure=$false;independentChatFailover='NOT_PROVEN';receiptAuthenticity='UNSIGNED_CONTENT_INTEGRITY_ONLY';formulaExecution='NOT_EXECUTED';learningLedger='NOT_UPDATED';mainMerge='NOT_PERFORMED';at=[DateTime]::UtcNow.ToString('o')}
 Save(Join-Path $proof 'receipt.json')($receipt|ConvertTo-Json -Depth 7)
 Write-Output ('ADMISSION_STATUS=PASS');Write-Output ('RECEIPT='+$proof);Write-Output ('SHA256='+(Get-FileHash(Join-Path $proof 'receipt.json')-Algorithm SHA256).Hash)
}catch{
 $failure=$_|Out-String;$rollback='NOT_NEEDED'
 if($changed){
  try{foreach($id in $newPids){Stop-Owned $id};$temp=Join-Path $boot ('binding-rollback-'+[guid]::NewGuid().ToString('N')+'.json');[IO.File]::Copy((Join-Path $proof 'binding-before.json'),$temp,$false);[IO.File]::Replace($temp,$BindingFile,(Join-Path $proof 'binding-replaced-failed.json'));$id=Start-ExistingLoader 'rollback';Start-Sleep -Milliseconds 500;$rh=Invoke-RestMethod ($uri+'/health')-TimeoutSec 5;if($rh.provider -ne $provider){throw 'ROLLBACK_HEALTH_FAILED'};$rollback='RESTORED_OLD_BINDING_AND_HEALTH'}catch{$rollback='ROLLBACK_FAILED: '+$_.Exception.Message}
 }
 Save(Join-Path $proof 'failure.json')(@{status='FAIL';failure=$failure;rollback=$rollback;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json)
 throw ('ADMISSION_FAILED '+$rollback+' '+$failure)
}
