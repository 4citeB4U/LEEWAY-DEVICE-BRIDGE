<#
REGION: LEEWAY.DEVICES.COMMANDER
TAG: NATIVE_COMMANDER_NO_SHELL_INJECTION
WHO: Agent Lee qualification; WHAT: Bind direct-argument command policy to existing executor.
WHEN: Before activation; WHERE: staged native provider only.
WHY: Reject shell suffixes and unapproved script execution.
HOW: Exact source hash, complete single-line replacement, parse and rehash.
LICENSE: MIT
#>
$ErrorActionPreference='Stop'
$p=Join-Path $PSScriptRoot 'server.mjs'
if((Get-FileHash $p -Algorithm SHA256).Hash -ne 'A93A73F21A5EB2D304CF6569B8E8C6703C512F9DF368B2D33D42E1ECCE967E43'){throw 'COMMANDER_SOURCE_CHANGED'}
$lines=[IO.File]::ReadAllLines($p)
$hits=@($lines|Where-Object {$_ -match "^ else if\(cap==='leeway.terminal.execute'\)"})
if($hits.Count -ne 1){throw 'TERMINAL_BRANCH_AMBIGUOUS'}
$new=@'
 else if(cap==='leeway.terminal.execute'){if(args.profile!=='governed-readonly')throw new Error('TERMINAL_PROFILE_NOT_ALLOWED');const plan=nativeCommandPlan({command:args.command,root:ROOT,cwd:args.cwd||ROOT,humanConfirmed:args.humanConfirmed});result=await run(plan.exe,plan.args,plan.cwd)}
'@
$s=[string]::Join("`n",$lines).Replace($hits[0],$new)
$s="import { nativeCommandPlan } from './command-policy.mjs';`n"+$s
[IO.File]::WriteAllText($p,$s,(New-Object Text.UTF8Encoding($false)))
& node --check $p
if($LASTEXITCODE -ne 0){throw 'COMMANDER_PARSE_FAILED'}
Get-FileHash $p -Algorithm SHA256|Format-List
