<#
REGION: LEEWAY.DEVICES.COMMANDER.PORTABILITY
TAG: REMOVE_VERIFIED_OBSOLETE_USER_ROOT
WHO: Creator-authorized Agent Lee / host adapter
WHAT: Remove only the inspected obsolete user-level root override.
WHEN: After active native Commander has an explicit non-stale binding.
WHERE: Authorized Windows adapter; no universal drive, user, model or body default.
WHY: A destroyed host location must not propagate into future LeeWay processes.
HOW: Dry run, exact-value guard, backup, remove, native read-back, rollback on failure.
LICENSE: MIT
#>
[CmdletBinding(SupportsShouldProcess=$true)]
param(
 [Parameter(Mandatory=$true)][uri]$CommanderBaseUri,
 [Parameter(Mandatory=$true)][string]$ExpectedStaleRoot,
 [Parameter(Mandatory=$true)][string]$EvidenceDirectory
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($CommanderBaseUri.Scheme -ne 'http' -or $CommanderBaseUri.Host -notin @('127.0.0.1','localhost') -or $CommanderBaseUri.UserInfo -or $CommanderBaseUri.Query -or $CommanderBaseUri.Fragment){throw 'NATIVE_LOOPBACK_COMMANDER_REQUIRED'}
$endpoint=$CommanderBaseUri.AbsoluteUri.TrimEnd('/')
$before=[Environment]::GetEnvironmentVariable('LEEWAY_ROOT','User')
if($before -cne $ExpectedStaleRoot){throw 'USER_ROOT_CHANGED_REVIEW_REQUIRED'}
if(Test-Path -LiteralPath $ExpectedStaleRoot){throw 'ROOT_STILL_EXISTS_REVIEW_REQUIRED'}
$health=Invoke-RestMethod ($endpoint+'/health') -TimeoutSec 5
if($health.provider -ne 'LEEWAY_NATIVE_HOST_COMMANDER' -or $health.deviceAuthority -ne '4citeB4U/LEEWAY-DEVICE-BRIDGE' -or $health.status -ne 'PASS' -or $health.root -eq $ExpectedStaleRoot -or !(Test-Path -LiteralPath $health.root -PathType Container)){throw 'INDEPENDENT_LIVE_BINDING_NOT_PROVEN'}
if(!$PSCmdlet.ShouldProcess('User LEEWAY_ROOT','Back up and remove exact obsolete override; do not replace with another fixed path')){
 [ordered]@{state='DRY_RUN_VALIDATED';setting='LEEWAY_ROOT';scope='User';expectedStaleValue=$before;activeCommanderBody=$health.bodyId;activeCommanderRoot=$health.root;willRestartServices=$false;willModifyMachineEnvironment=$false}|ConvertTo-Json
 return
}
$run='stale-root-removal-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$dir=Join-Path $EvidenceDirectory $run
$null=New-Item -ItemType Directory -Path $dir
$backup=Join-Path $dir 'environment-before.json'
[ordered]@{schemaVersion='leeway.host-setting-backup.v1';name='LEEWAY_ROOT';scope='User';value=$before;capturedAt=[DateTime]::UtcNow.ToString('o');restoreCommand='[Environment]::SetEnvironmentVariable(backup.name, backup.value, backup.scope)'}|ConvertTo-Json|Set-Content -LiteralPath $backup -Encoding UTF8
$changed=$false
try {
 if([Environment]::GetEnvironmentVariable('LEEWAY_ROOT','User') -cne $ExpectedStaleRoot){throw 'USER_ROOT_CHANGED_BEFORE_MUTATION'}
 [Environment]::SetEnvironmentVariable('LEEWAY_ROOT',$null,'User');$changed=$true
 $after=[Environment]::GetEnvironmentVariable('LEEWAY_ROOT','User')
 if($null -ne $after){throw 'STALE_USER_OVERRIDE_NOT_REMOVED'}
 $post=Invoke-RestMethod ($endpoint+'/health') -TimeoutSec 5
 if($post.provider -ne $health.provider -or $post.root -ne $health.root -or $post.bodyId -ne $health.bodyId -or $post.status -ne 'PASS'){throw 'NATIVE_BINDING_CHANGED_UNEXPECTEDLY'}
 $request=@{capability='leeway.files.hash';args=@{path=$PSCommandPath}}|ConvertTo-Json -Compress
 $readback=Invoke-RestMethod ($endpoint+'/execute') -Method Post -ContentType 'application/json' -Body $request -TimeoutSec 5
 $sourceHash=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
 if($readback.result.hash.ToUpperInvariant() -ne $sourceHash){throw 'NATIVE_HASH_READBACK_FAILED'}
 $readback|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $dir 'native-execution.json') -Encoding UTF8
 $receipt=[ordered]@{schemaVersion='leeway.host-setting-repair.v1';runId=$run;status='VERIFIED_STALE_USER_OVERRIDE_REMOVED';scope='User';name='LEEWAY_ROOT';beforeValue=$before;afterValue=$after;replacementGlobalRoot=$null;backupSha256=(Get-FileHash $backup -Algorithm SHA256).Hash;scriptSha256=$sourceHash;nativeProvider=$post.provider;nativeBodyId=$post.bodyId;nativeRootUnchanged=$true;nativeExecutionReceiptHash=$readback.receiptHash;phoneModified=$false;servicesRestarted=$false;existingProcessEnvironmentsRewritten=$false;fullPortability='NOT_PROVEN';formulaExecution='NOT_EXECUTED';learningLedgerUpdated=$false}
 $receiptPath=Join-Path $dir 'repair-receipt.json'
 $receipt|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $receiptPath -Encoding UTF8
 $receipt|ConvertTo-Json -Depth 8
 Write-Output ('RECEIPT_PATH='+$receiptPath)
 Write-Output ('RECEIPT_SHA256='+(Get-FileHash $receiptPath -Algorithm SHA256).Hash)
} catch {
 if($changed){[Environment]::SetEnvironmentVariable('LEEWAY_ROOT',$before,'User')}
 throw
}
