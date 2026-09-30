#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const prefix=process.env.PREFIX || "/data/data/com.termux/files/usr";
const packageRoot=path.join(prefix,"lib","node_modules","@wonderwhy-er","desktop-commander");
const pkgPath=path.join(packageRoot,"package.json");
const expectedVersion=process.env.LEEWAY_DC_VERSION || "0.2.52";

if(!fs.existsSync(pkgPath)) throw new Error("Desktop Commander global package not found");
const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
if(pkg.version!==expectedVersion){
  throw new Error(`Refusing unqualified Desktop Commander version ${pkg.version}; expected ${expectedVersion}`);
}

function patchFile(rel, sentinel, transforms){
  const file=path.join(packageRoot,"dist",rel);
  let src=fs.readFileSync(file,"utf8");
  if(src.includes(sentinel)){
    console.log(`[LeeWay][OBSERVED] already patched: ${rel}`);
    return;
  }
  for(const [from,to] of transforms){
    if(!src.includes(from)) throw new Error(`Expected patch anchor missing in ${rel}`);
    src=src.replace(from,to);
  }
  fs.writeFileSync(file,src);
  console.log(`[LeeWay][PASS] patched ${rel}`);
}

const envBlock=`TERM: 'xterm-256color', // Better terminal compatibility
                    ...(process.platform === 'android' ? {
                        PREFIX: '/data/data/com.termux/files/usr',
                        LD_PRELOAD: '/data/data/com.termux/files/usr/lib/libtermux-exec.so',
                        PATH: '/data/data/com.termux/files/usr/bin:/system/bin'
                    } : {})`;

patchFile("terminal-manager.js","Google Play Termux package binaries are ELF binaries",[
  [
    "TERM: 'xterm-256color' // Better terminal compatibility",
    envBlock
  ],
  [
    `        // Spawn the process with appropriate arguments
        const childProcess = spawn(spawnConfig.executable, spawnConfig.args, spawnOptions);`,
    `        // Spawn the process with appropriate arguments.
        // Google Play Termux package binaries are ELF binaries launched through
        // Android's linker. Route Termux executables through process.execPath.
        let spawnExecutable = spawnConfig.executable;
        let spawnArgs = spawnConfig.args;
        if (process.platform === 'android'
            && typeof spawnExecutable === 'string'
            && spawnExecutable.startsWith('/data/data/com.termux/files/usr/bin/')) {
            spawnArgs = [spawnExecutable, ...spawnArgs];
            spawnExecutable = process.execPath;
        }
        const childProcess = spawn(spawnExecutable, spawnArgs, spawnOptions);`
  ]
]);

patchFile(path.join("tools","improved-process-tools.js"),"const nodeArgs = process.platform === 'android'",[
  [
    `        const result = await new Promise((resolve) => {
            const proc = spawn(process.execPath, [tempFile], {
                cwd: mcpRoot,
                timeout: timeout_ms,
                windowsHide: true // Prevent visible console windows on Windows
            });`,
    `        const result = await new Promise((resolve) => {
            const nodeArgs = process.platform === 'android'
                ? ['/data/data/com.termux/files/usr/bin/node', tempFile]
                : [tempFile];
            const proc = spawn(process.execPath, nodeArgs, {
                cwd: mcpRoot,
                timeout: timeout_ms,
                windowsHide: true,
                env: {
                    ...process.env,
                    ...(process.platform === 'android' ? {
                        PREFIX: '/data/data/com.termux/files/usr',
                        LD_PRELOAD: '/data/data/com.termux/files/usr/lib/libtermux-exec.so',
                        PATH: '/data/data/com.termux/files/usr/bin:/system/bin'
                    } : {})
                }
            });`
  ]
]);

patchFile(path.join("utils","ripgrep-resolver.js"),"commonPaths.push('/data/data/com.termux/files/usr/bin/rg')",[
  [
    `    const commonPaths = [];
    if (process.platform === 'win32') {`,
    `    const commonPaths = [];
    if (process.platform === 'android') {
        commonPaths.push('/data/data/com.termux/files/usr/bin/rg');
    }
    else if (process.platform === 'win32') {`
  ]
]);

patchFile("search-manager.js","Android/Termux package binaries must be launched through Android's linker",[
  [
    `        // Start ripgrep process
        const rgProcess = spawn(rgPath, args, { windowsHide: true }); // Prevent visible console windows on Windows`,
    `        // Start ripgrep process.
        // Android/Termux package binaries must be launched through Android's linker.
        const rgExecutable = process.platform === 'android' ? process.execPath : rgPath;
        const rgArgs = process.platform === 'android' ? [rgPath, ...args] : args;
        const rgProcess = spawn(rgExecutable, rgArgs, {
            windowsHide: true,
            env: {
                ...process.env,
                ...(process.platform === 'android' ? {
                    PREFIX: '/data/data/com.termux/files/usr',
                    LD_PRELOAD: '/data/data/com.termux/files/usr/lib/libtermux-exec.so',
                    PATH: '/data/data/com.termux/files/usr/bin:/system/bin'
                } : {})
            }
        }); // Prevent visible console windows on Windows`
  ]
]);

console.log("[LeeWay][PASS] DESKTOP_COMMANDER_ANDROID_COMPAT_PATCHED");
