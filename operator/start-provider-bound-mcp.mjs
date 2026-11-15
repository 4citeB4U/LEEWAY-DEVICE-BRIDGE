/*
LEEWAY HEADER — DO NOT REMOVE
WHO: Owner-authorized Runtime host operator.
WHAT: Start canonical MCP with measured local files and authority handoff bound.
WHEN: 2026-11-15.
WHERE: operator/start-provider-bound-mcp.mjs.
HOW: Pin and load an existing Runtime provider module, then bind Formula and keys from host config.
WHY: Supply the previously missing startup plug without replacing Runtime admission.
*/
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {createConfiguredBridge,createServer} from '../apps/desktop/mcp-server.mjs';
import {bindProviderSpine} from '../apps/desktop/runtime-composition.mjs';
import {createMeasuredFileProvider} from './measured-file-formula-provider.mjs';
const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const load=async(file,expected)=>{if(!path.isAbsolute(file)||createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==expected)throw Error('HOST_PROVIDER_SOURCE_HASH_MISMATCH');return import(pathToFileURL(file));};
const runtimeModule=await load(config.runtimeProviderModule,config.runtimeProviderSha256);
const runtimeInput=runtimeModule.runtimeInput ?? await runtimeModule.createRuntimeInput(config.runtime);
const {transitionG3ToG4}=await load(config.formulaHandoffModule,config.formulaHandoffSha256);
const measured=createMeasuredFileProvider(config.measuredFiles);
const composition=bindProviderSpine(runtimeInput,{formulaEvidenceProvider:measured.formulaEvidenceProvider,transitionG3ToG4,bindings:config.bindings});
const {mode,...bridgeInput}=composition;
const bridge=await createConfiguredBridge(config.bridgeConfig,bridgeInput);
for(const id of config.measuredDeviceIds){const device=bridge.devices.get(id);if(!device||device.type!=='desktop')throw Error('HOST_MEASURED_LOCAL_ADAPTER_REQUIRED');device.adapter=measured.wrap(device.adapter);}
await createServer(bridge,{deviceRegistry:composition.deviceRegistry,complianceCardProvider:composition.complianceCardProvider}).connect(new StdioServerTransport());
