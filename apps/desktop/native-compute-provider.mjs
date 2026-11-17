/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP.COMPUTE
TAG: LEEWAY.NATIVE.COMPUTE.HOST_PROVIDER.V1
WHO: LeeWay Industries; WHAT: fixed-binary host provider for bounded native GPU evidence.
WHEN: 2026-11-16; WHERE: apps/desktop/native-compute-provider.mjs.
WHY: Route GPU work through Bridge admission without exposing arbitrary process execution.
HOW: Host-injected absolute executable, fixed subcommand, bounded JSON stdin/stdout.
AUTHORITY: Transport provider only; Bridge, Formula, Veritas, and receipt gates remain upstream.
LICENSE: MIT
*/
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';

const OPERATION_ID='LEEWAY_TENSOR_AFFINE_16X16_V1';
const CAPABILITY_ID='gpu.compute.native.probe';
const SHA256=/^[a-f0-9]{64}$/;
const DESCRIPTOR_MAX_TTL_MS=5*60*1000;
const CLOCK_SKEW_MS=30*1000;
const PLATFORM_BACKENDS=Object.freeze({
  windows:new Set(['Dx12','Vulkan']),
  linux:new Set(['Vulkan','Gl']),
  macos:new Set(['Metal']),
  android:new Set(['Vulkan']),
  ios:new Set(['Metal']),
});

function tensorHash(values) {
  const prefix=Buffer.from(OPERATION_ID+'\0','utf8');
  const bytes=Buffer.alloc(values.length*4);
  values.forEach((value,index)=>bytes.writeFloatLE(Math.fround(value),index*4));
  return createHash('sha256').update(prefix).update(bytes).digest('hex');
}

export class NativeComputeProvider {
  constructor(executablePath, { expectedSha256, platform, timeoutMs = 15000 } = {}) {
    if (typeof executablePath !== 'string' || !path.isAbsolute(executablePath)) throw new Error('NATIVE_COMPUTE_EXECUTABLE_ABSOLUTE_PATH_REQUIRED');
    if (typeof expectedSha256 !== 'string' || !SHA256.test(expectedSha256)) throw new Error('NATIVE_COMPUTE_EXPECTED_SHA256_REQUIRED');
    if (typeof platform !== 'string' || !PLATFORM_BACKENDS[platform]) throw new Error('NATIVE_COMPUTE_PLATFORM_REQUIRED');
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) throw new Error('NATIVE_COMPUTE_TIMEOUT_INVALID');
    this.executablePath = executablePath;
    this.expectedSha256 = expectedSha256;
    this.platform = platform;
    this.timeoutMs = timeoutMs;
    this.descriptor = null;
  }

  async binarySha256() {
    const stat=await fs.stat(this.executablePath);
    if(!stat.isFile()||stat.size<1||stat.size>512*1024*1024)throw new Error('NATIVE_COMPUTE_BINARY_INVALID');
    const digest=createHash('sha256').update(await fs.readFile(this.executablePath)).digest('hex');
    if(digest!==this.expectedSha256)throw new Error('NATIVE_COMPUTE_BINARY_HASH_MISMATCH');
    return digest;
  }

  async run(command,input='') {
    return new Promise((resolve, reject) => {
      const child = spawn(this.executablePath, [command], { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), settled = false;
      let timer = null;
      const finish = error => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : null; };
      const append = (prior, chunk) => {
        const next = Buffer.concat([prior, chunk]);
        if (next.length > 65536) throw new Error('NATIVE_COMPUTE_OUTPUT_LIMIT_EXCEEDED');
        return next;
      };
      child.stdout.on('data', chunk => { try { stdout = append(stdout, chunk); } catch (error) { child.kill(); finish(error); } });
      child.stderr.on('data', chunk => { try { stderr = append(stderr, chunk); } catch (error) { child.kill(); finish(error); } });
      child.on('error', () => finish(new Error('NATIVE_COMPUTE_SPAWN_FAILED')));
      child.on('close', code => {
        if (settled) return;
        clearTimeout(timer); settled = true;
        if (code !== 0) return reject(new Error(command==='compute-native-inventory'?'NATIVE_COMPUTE_DISCOVERY_FAILED':'NATIVE_COMPUTE_EXECUTION_FAILED'));
        try { resolve(JSON.parse(stdout.toString('utf8'))); }
        catch { reject(new Error('NATIVE_COMPUTE_ENVELOPE_INVALID')); }
      });
      timer = setTimeout(() => { child.kill(); finish(new Error('NATIVE_COMPUTE_TIMEOUT')); }, this.timeoutMs);
      child.stdin.end(input);
    });
  }

  async discover() {
    const binarySha256=await this.binarySha256();
    const descriptor=await this.run('compute-native-inventory');
    const discovered=Date.parse(descriptor?.discoveredUtc),expires=Date.parse(descriptor?.expiresUtc);
    const now=Date.now();
    if(descriptor?.descriptorVersion!==1||descriptor?.capabilityId!==CAPABILITY_ID||descriptor?.workloadExecuted!==false||
      descriptor?.memoryReserved!==false||!['READY_PHYSICAL','READY_SOFTWARE_OR_VIRTUAL'].includes(descriptor?.health)||
      !Number.isFinite(discovered)||!Number.isFinite(expires)||discovered>now+CLOCK_SKEW_MS||expires<=now||expires<=discovered||
      expires-discovered>DESCRIPTOR_MAX_TTL_MS+CLOCK_SKEW_MS||
      typeof descriptor?.backendId!=='string'||!PLATFORM_BACKENDS[this.platform].has(descriptor.backendId)||
      typeof descriptor?.adapterName!=='string'||!descriptor.adapterName||
      typeof descriptor?.adapterDeviceType!=='string'||!descriptor.adapterDeviceType||
      typeof descriptor?.driverName!=='string'||typeof descriptor?.driverInfo!=='string'||
      typeof descriptor?.providerVersion!=='string'||!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/.test(descriptor.providerVersion)||
      !Number.isInteger(descriptor?.maximumBufferBytes)||descriptor.maximumBufferBytes<1024||
      !Number.isInteger(descriptor?.maximumStorageBindingBytes)||descriptor.maximumStorageBindingBytes<1024||
      !Number.isInteger(descriptor?.maximumComputeWorkgroupsPerDimension)||descriptor.maximumComputeWorkgroupsPerDimension<1||
      descriptor?.memoryBudgetState!=='UNAVAILABLE_UNSUPPORTED'||typeof descriptor?.memoryBudgetReason!=='string'||!descriptor.memoryBudgetReason||
      (descriptor.health==='READY_PHYSICAL')!==descriptor.physicalHardwareClaimed||
      (descriptor.physicalHardwareClaimed&&!['IntegratedGpu','DiscreteGpu'].includes(descriptor.adapterDeviceType)))
      throw new Error('NATIVE_COMPUTE_DESCRIPTOR_INVALID');
    this.descriptor=Object.freeze({...descriptor,binarySha256,source:'QUALIFIED_PACKAGE_BINARY'});
    return this.descriptor;
  }

  async execute({ values }) {
    const descriptor=await this.discover();
    const input=JSON.stringify(values);
    if(Buffer.byteLength(input)>65536)throw new Error('NATIVE_COMPUTE_INPUT_LIMIT_EXCEEDED');
    const evidence=await this.run('compute-native-probe',input);
    if(evidence?.operationId!==OPERATION_ID||evidence?.canonicalReceiptIssued!==false||evidence?.laneCount!==256||
      evidence?.toleranceMismatchCount!==0||evidence?.absoluteTolerance!==0.000001||
      evidence?.inputSha256!==tensorHash(values)||!SHA256.test(evidence?.outputSha256||'')||!SHA256.test(evidence?.cpuOutputSha256||'')||
      evidence?.backendId!==descriptor.backendId||evidence?.adapterName!==descriptor.adapterName||
      evidence?.adapterDeviceType!==descriptor.adapterDeviceType||evidence?.physicalHardwareClaimed!==descriptor.physicalHardwareClaimed||
      !Number.isInteger(evidence?.exactMismatchCount)||evidence.exactMismatchCount<0||evidence.exactMismatchCount>256||
      !Number.isFinite(evidence?.maximumAbsoluteError)||evidence.maximumAbsoluteError<0||
      (evidence.exactMismatchCount===0&&evidence.outputSha256!==evidence.cpuOutputSha256))
      throw new Error('NATIVE_COMPUTE_EVIDENCE_INVALID');
    return {...evidence,providerDescriptor:descriptor};
  }
}

export async function bindDiscoveredNativeComputeProvider({localNodeId,enrolledDevices,executablePath,expectedSha256}) {
  if(typeof localNodeId!=='string'||!/^[A-Za-z0-9._:-]{1,128}$/.test(localNodeId))throw new Error('NATIVE_COMPUTE_LOCAL_NODE_ID_REQUIRED');
  const records=enrolledDevices instanceof Map?[...enrolledDevices.entries()]:[];
  const record=records.find(([id])=>id===localNodeId)?.[1];
  if(!record||record.identityVerified!==true||record.registrationState!=='TRUSTED_REGISTRY_READ')throw new Error('NATIVE_COMPUTE_LOCAL_NODE_NOT_ENROLLED');
  if(!['windows','linux','macos'].includes(record.platform))return new Map();
  const provider=new NativeComputeProvider(executablePath,{expectedSha256,platform:record.platform});
  await provider.discover();
  return new Map([[localNodeId,provider]]);
}
