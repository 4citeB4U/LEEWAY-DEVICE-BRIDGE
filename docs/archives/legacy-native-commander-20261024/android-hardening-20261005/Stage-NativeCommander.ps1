<#
REGION: LEEWAY.DEVICES.COMMANDER
TAG: STAGE_NATIVE_COMMANDER_OWNERSHIP
WHO: Creator-authorized Agent Lee
WHAT: Move the existing native Commander implementation under its Device Bridge provider owner.
WHEN: Unified APK / host repair; WHERE: canonical Device Bridge qualification checkout.
WHY: Reuse native execution, fix obsolete root inheritance, and keep remote authority separate.
HOW: Verify source hash and Git origin; preserve source provenance; stage bounded repairs and tests.
LICENSE: MIT
#>
[CmdletBinding()]
param([string]$ExistingServer='E:\LeeWay-Work\pc-consciousness-live\host-commander-server.mjs')
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$r=$PSScriptRoot
if((& git -C $r remote get-url origin | Out-String).Trim() -ne 'https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE.git'){throw 'DEVICE_BRIDGE_ORIGIN_REQUIRED'}
if((& git -C $r rev-parse HEAD | Out-String).Trim() -ne '42d785b76aa4f2dade27544188b8ab424d5abb81'){throw 'DEVICE_BRIDGE_BASE_CHANGED'}
$expected='B1818C305544273C5102FB9C2AC270064427F13B9294F9247BC779385F7D275A'
if((Get-FileHash -LiteralPath $ExistingServer -Algorithm SHA256).Hash -ne $expected){throw 'EXISTING_COMMANDER_CHANGED_REVIEW_REQUIRED'}
$dest=Join-Path $r 'providers\desktop-commander\native-host'
if(Test-Path $dest){throw 'NATIVE_COMMANDER_TARGET_EXISTS_REVIEW_REQUIRED'}
& git -C $r checkout -b 'integration/native-commander-owner-and-android-20261005'
if($LASTEXITCODE -ne 0){throw 'ISOLATED_BRANCH_REQUIRED'}
$null=New-Item -ItemType Directory -Path $dest
$src=[IO.File]::ReadAllText($ExistingServer).TrimStart([char]0xFEFF)
$src=$src.Replace('REGION: LEEWAY.RUNTIME.HOST_COMMANDER','REGION: LEEWAY.DEVICES.DESKTOP_COMMANDER')
$src=$src.Replace('WHO = LeeWay Runtime Fabric / Tool Gateway','WHO = LeeWay Device Bridge / Tool Gateway')
$src=$src.Replace('WHERE = host-commander/server.mjs','WHERE = providers/desktop-commander/native-host/server.mjs')
$oldRoot="const ROOT=process.env.LEEWAY_ROOT||'E:\\LeeWay-Work';"
$newRoot=@'
const ROOT=process.env.LEEWAY_HOST_COMMANDER_ROOT||process.env.LEEWAY_ROOT;
if(!ROOT||!path.isAbsolute(ROOT)||!fs.existsSync(ROOT)||!fs.statSync(ROOT).isDirectory())throw new Error('COMMANDER_ROOT_BINDING_REQUIRED');
const BODY=process.env.LEEWAY_BODY_ID||'UNBOUND_BODY';
'@
if(!$src.Contains($oldRoot)){throw 'ROOT_REPAIR_BOUNDARY_MISSING'}
$src=$src.Replace($oldRoot,$newRoot)
$oldPath="function insideRoot(p){const full=path.resolve(p);return full.toLowerCase().startsWith(path.resolve(ROOT).toLowerCase()+path.sep)||full.toLowerCase()===path.resolve(ROOT).toLowerCase()}"
$newPath=@'
function insideRoot(p){
 if(typeof p!=='string'||!p)return false;
 try{const root=fs.realpathSync(ROOT),full=fs.realpathSync(p),relative=path.relative(root,full);return relative===''||(!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep))}catch{return false}
}
'@
if(!$src.Contains($oldPath)){throw 'PATH_REPAIR_BOUNDARY_MISSING'}
$src=$src.Replace($oldPath,$newPath)
$src=$src.Replace("const pre={at:new Date().toISOString(),capability:cap,authorityTier:CAPABILITIES[cap],root:ROOT};", "const pre={at:new Date().toISOString(),capability:cap,authorityTier:CAPABILITIES[cap],root:ROOT,bodyId:BODY,deviceAuthority:'4citeB4U/LEEWAY-DEVICE-BRIDGE'};")
$src=$src.Replace("{status:'PASS',provider:'LEEWAY_NATIVE_HOST_COMMANDER',root:ROOT,capabilities:CAPABILITIES}","{status:'PASS',provider:'LEEWAY_NATIVE_HOST_COMMANDER',root:ROOT,bodyId:BODY,deviceAuthority:'4citeB4U/LEEWAY-DEVICE-BRIDGE',transport:'LOOPBACK_ONLY',remotePairingQualified:false,capabilities:CAPABILITIES}")
$oldRoute="http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');"
$newRoute="http.createServer(async(req,res)=>{try{if(req.headers.origin||![('127.0.0.1:'+PORT),('localhost:'+PORT)].includes(req.headers.host))return json(res,403,{error:'LOCAL_NATIVE_CALLER_REQUIRED'});const u=new URL(req.url,'http://127.0.0.1');"
if(!$src.Contains($oldRoute)){throw 'HTTP_BOUNDARY_MISSING'}
$src=$src.Replace($oldRoute,$newRoute)
$src=$src.Replace("let b='';for await(const c of req)b+=c;", "if(!String(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'JSON_REQUIRED'});let b='',size=0;for await(const c of req){size+=c.length;if(size>65536)return json(res,413,{error:'REQUEST_TOO_LARGE'});b+=c;}")
$utf8=New-Object Text.UTF8Encoding($false)
$file=Join-Path $dest 'server.mjs'
[IO.File]::WriteAllText($file,$src,$utf8)
& node --check $file
if($LASTEXITCODE -ne 0){throw 'MIGRATED_COMMANDER_SYNTAX_FAILED'}
$provenance=[ordered]@{schemaVersion='leeway.commander.source-migration.v1';provider='LEEWAY_NATIVE_HOST_COMMANDER';owner='4citeB4U/LEEWAY-DEVICE-BRIDGE';governingSkill='leeway-host-commander';priorSourceSha256=$expected;sourceSha256=(Get-FileHash $file -Algorithm SHA256).Hash;priorRole='Runtime Fabric host capability';newPath='providers/desktop-commander/native-host/server.mjs';scope='EXISTING_LOOPBACK_EXECUTOR_REHOMED';remoteExposure=$false;runtimeActivated=$false;formulaExecution='NOT_EXECUTED'}
$provenance|ConvertTo-Json -Depth 5|Set-Content (Join-Path $dest 'source-lineage.json') -Encoding UTF8
$provenance|ConvertTo-Json -Depth 5
