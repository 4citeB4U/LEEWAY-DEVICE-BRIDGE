<#
LEEWAY_HEADER - DO NOT REMOVE
REGION: LEEWAY.DEVICES.DESKTOP_COMMANDER.QUALIFICATION
TAG: NATIVE_COMMANDER_FROZEN_GATE
5WH: WHAT=Repeat real native-provider portability tests against frozen bytes;
WHY=Separate source presence, runtime behavior and platform qualification;
WHO=Creator-authorized isolated Harness; WHERE=scripts/Invoke-NativeCommanderPortabilityGate.ps1;
WHEN=2026-10-06; HOW=Owner check -> hashes -> native tests -> rehash -> receipt. No live binding changes.
LICENSE: MIT
#>
[CmdletBinding()]
param([ValidateRange(1,3)][int]$Cycles=2)
$ErrorActionPreference='Stop'
$r=(Resolve-Path(Join-Path $PSScriptRoot '..')).Path
if((git -C $r remote get-url origin).Trim() -ne 'https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE.git'){throw 'NATIVE_OWNER_MISMATCH'}
$source=@('providers/desktop-commander/native-host/server.mjs','providers/desktop-commander/native-host/command-policy.mjs','tests/native-commander-portability.test.mjs','scripts/Invoke-NativeCommanderPortabilityGate.ps1')
$proof=Join-Path $r ('receipts/native-commander/portability-'+[guid]::NewGuid().ToString('N'));[IO.Directory]::CreateDirectory($proof)|Out-Null
$utf8=[Text.UTF8Encoding]::new($false)
function Save([string]$p,[string]$text){$f=[IO.File]::Open($p,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write);try{$b=$utf8.GetBytes($text);$f.Write($b,0,$b.Length);$f.Flush($true)}finally{$f.Dispose()}}
function HashSet{$h=[ordered]@{};foreach($p in $source){$h[$p]=(Get-FileHash(Join-Path $r $p)-Algorithm SHA256).Hash.ToLowerInvariant()};$h}
$before=HashSet;Save(Join-Path $proof 'source-before.json')($before|ConvertTo-Json)
$results=[Collections.Generic.List[object]]::new();$ok=$true
Push-Location $r
try{
 foreach($f in $source|Where-Object {$_ -like '*.mjs'}){& node --check $f;if($LASTEXITCODE -ne 0){throw 'SOURCE_PARSE_FAILED'}}
 for($i=1;$i -le $Cycles;$i++){
  $log=Join-Path $proof ('cycle-'+$i+'.tap');& node --test --test-reporter=tap tests/native-commander-portability.test.mjs *> $log;$code=$LASTEXITCODE
  $text=[IO.File]::ReadAllText($log);$counts=[ordered]@{}
  foreach($key in @('tests','pass','fail','cancelled','skipped','todo')){$m=[regex]::Matches($text,'(?m)^# '+$key+' (\d+)\s*$');if($m.Count){$counts[$key]=[int]$m[$m.Count-1].Groups[1].Value}else{$counts[$key]=$null}}
  $accepted=($code -eq 0 -and $counts.tests -gt 0 -and $counts.tests -eq $counts.pass -and $counts.fail -eq 0 -and $counts.cancelled -eq 0 -and $counts.skipped -eq 0 -and $counts.todo -eq 0)
  if(-not $accepted){$ok=$false};$results.Add(@{cycle=$i;exitCode=$code;accepted=$accepted;counts=$counts;log=[IO.Path]::GetFileName($log);logSha256=(Get-FileHash $log -Algorithm SHA256).Hash.ToLowerInvariant()});Write-Output ('NATIVE_CYCLE_'+$i+'='+$counts.pass+'/'+$counts.tests+' accepted='+$accepted)
 }
}finally{Pop-Location}
$after=HashSet;$stable=(($before|ConvertTo-Json -Compress)-eq($after|ConvertTo-Json -Compress));if(-not $stable){$ok=$false};Save(Join-Path $proof 'source-after.json')($after|ConvertTo-Json)
$identity=(& node -e 'console.log(JSON.stringify({platform:process.platform,architecture:process.arch,node:process.version}))')|ConvertFrom-Json
$receipt=[ordered]@{receiptType='LEEWAY_NATIVE_COMMANDER_PORTABILITY_QUALIFICATION';status=$(if($ok){'PASS'}else{'FAIL'});owner='4citeB4U/LEEWAY-DEVICE-BRIDGE';provider='LEEWAY_NATIVE_HOST_COMMANDER';baseCommit=(git -C $r rev-parse HEAD).Trim();branch=(git -C $r branch --show-current).Trim();sourceStable=$stable;sourceBefore=$before;sourceAfter=$after;results=$results.ToArray();runtime=$identity;scope='ISOLATED_REAL_LOOPBACK_PROVIDER';workspaceFreeStartup='TESTED';logicalResourceRelocation='TESTED';liveDeployment='NOT_PERFORMED';remotePairing='NOT_QUALIFIED';independentChatFailover='NOT_PROVEN';otherPlatforms='REQUIRE_SEPARATE_EXECUTION_EVIDENCE';formulaExecution='NOT_EXECUTED';learningLedger='NOT_UPDATED';signatureState='UNSIGNED_HASH_INTEGRITY_ONLY';at=[DateTime]::UtcNow.ToString('o')}
Save(Join-Path $proof 'receipt.json')($receipt|ConvertTo-Json -Depth 10)
Write-Output ('STATUS='+$receipt.status);Write-Output ('SOURCE_STABLE='+$stable);Write-Output ('RECEIPT='+$proof);Write-Output ('RECEIPT_SHA256='+(Get-FileHash(Join-Path $proof 'receipt.json')-Algorithm SHA256).Hash)
if(-not $ok){exit 1}
