$ErrorActionPreference='Stop'
$r=Split-Path $PSScriptRoot
$p=Join-Path $r 'providers/desktop-commander/native-host/server.mjs'
$text=[IO.File]::ReadAllText($p)
$old=@'
 const child=spawn(cmd,args,{cwd,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});
'@
$new=@'
 // A scoped standalone command must not inherit Node's parent test-runner channel.
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const child=spawn(cmd,args,{cwd,windowsHide:true,shell:false,env,stdio:['ignore','pipe','pipe']});
'@
if(-not $text.Contains($old)){throw 'NATIVE_CHILD_ANCHOR_MISSING'}
[IO.File]::Copy($p,(Join-Path $PSScriptRoot 'server.before-child-context.mjs'),$false)
[IO.File]::WriteAllText($p,$text.Replace($old,$new),[Text.UTF8Encoding]::new($false))
& node --check $p;if($LASTEXITCODE -ne 0){throw 'SERVER_PARSE_FAILED'}
Push-Location $r;try{node --test --test-reporter=tap tests/native-commander-portability.test.mjs *> .native-portability/native-context-retest.tap;$c=$LASTEXITCODE;Get-Content .native-portability/native-context-retest.tap -Tail 12;if($c -ne 0){throw 'NATIVE_TEST_FAILED'}}finally{Pop-Location}
