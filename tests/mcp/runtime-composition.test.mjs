import test from 'node:test';
import assert from 'node:assert/strict';
import {
  requireHostInjectedC3Composition,
  requireTrustedRuntimeComposition,
} from '../../apps/desktop/runtime-composition.mjs';

const allow = async () => true;
const receiptSink = async () => {};

test('trusted MCP startup refuses missing authority or evidence providers',()=>{
 const admission=async()=>true,receiptSink=async()=>{};
 assert.throws(()=>requireTrustedRuntimeComposition(),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
 assert.throws(()=>requireTrustedRuntimeComposition({admission}),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
 assert.throws(()=>requireTrustedRuntimeComposition({receiptSink}),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
 const result=requireTrustedRuntimeComposition({admission,receiptSink});
 assert.equal(result.admission,admission);assert.equal(result.receiptSink,receiptSink);assert.equal(result.mode,'direct');assert.equal(Object.isFrozen(result),true);
});

test('trusted MCP startup composes Formula and Veritas owner gates through C3',()=>{
 const admission=async()=>true;
 const formulaPreGate=async()=>({passed:true});
 const veritasPreGate=async()=>true;
 const receiptSink=async()=>{};
 const result=requireTrustedRuntimeComposition({formulaPreGate,veritasPreGate,receiptSink,adapterRegistry:{adapters:[]}});
 assert.equal(result.mode,'c3');
 assert.equal(result.formulaPreGate,formulaPreGate);
 assert.equal(result.veritasPreGate,veritasPreGate);
 assert.equal(result.receiptSink,receiptSink);
 assert.throws(()=>requireTrustedRuntimeComposition({formulaPreGate,receiptSink}),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
 assert.throws(()=>requireTrustedRuntimeComposition({admission,formulaPreGate,veritasPreGate,receiptSink}),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
 assert.throws(()=>requireTrustedRuntimeComposition({admission,receiptSink,unreviewed:true}),/TRUSTED_RUNTIME_COMPOSITION_INVALID/);
 const accessor={receiptSink};
 Object.defineProperty(accessor,'admission',{get(){return admission;}});
 assert.throws(()=>requireTrustedRuntimeComposition(accessor),/TRUSTED_RUNTIME_COMPOSITION_INVALID/);
});

test('trusted Runtime card provider requires its validation gate',()=>{
 const admission=async()=>true,receiptSink=async()=>{};
 const complianceCardProvider=async()=>({taskId:'task'});
 const complianceCardGate=async()=>({valid:true});
 const composition=requireTrustedRuntimeComposition({admission,receiptSink,complianceCardProvider,complianceCardGate});
 assert.equal(composition.complianceCardProvider,complianceCardProvider);
 assert.equal(composition.complianceCardGate,complianceCardGate);
 assert.throws(()=>requireTrustedRuntimeComposition({admission,receiptSink,complianceCardProvider}),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
});

test('trusted Runtime card provider is accepted only with a matching validation gate',()=>{
 const admission=async()=>true,receiptSink=async()=>{};
 const complianceCardProvider=async()=>({taskId:'task'});
 const complianceCardGate=async()=>({valid:true});
 const result=requireTrustedRuntimeComposition({admission,receiptSink,complianceCardProvider,complianceCardGate});
 assert.equal(result.complianceCardProvider,complianceCardProvider);
 assert.equal(result.complianceCardGate,complianceCardGate);
 assert.throws(()=>requireTrustedRuntimeComposition({admission,receiptSink,complianceCardProvider}),/TRUSTED_RUNTIME_COMPOSITION_REQUIRED/);
});

test('candidate execution seam requires the complete host-injected C3 dependency set', () => {
 const deviceRegistry = new Map([['pc-primary', { platform: 'windows' }]]);
 const adapterRegistry = { adapters: [{ platform: 'windows', capabilities: { 'device.info': { state: 'AVAILABLE' } } }] };
 const trustedIssuerRegistry = { 'issuer.test': { issuerId: 'issuer.test' } };
 const replayGuard = { has: () => false, consume: () => true };
 const full = {
   deviceRegistry, adapterRegistry,
   formulaPreGate: allow, veritasPreGate: allow,
   receiptSink, trustedIssuerRegistry, replayGuard,
   consentProvider: async () => null,
 };

 const actual = requireHostInjectedC3Composition(full);
 assert.equal(actual.mode, 'c3');
 assert.equal(actual.deviceRegistry, deviceRegistry);
 assert.equal(actual.adapterRegistry, adapterRegistry);
 assert.equal(actual.trustedIssuerRegistry, trustedIssuerRegistry);
 assert.equal(actual.replayGuard, replayGuard);
 assert.equal(typeof actual.consentProvider, 'function');

 for (const key of Object.keys(full)) {
   if (key === 'deviceRegistry' || key === 'adapterRegistry' || key === 'formulaPreGate' ||
       key === 'veritasPreGate' || key === 'receiptSink' || key === 'trustedIssuerRegistry' ||
       key === 'replayGuard' || key === 'consentProvider') {
     const incomplete = { ...full };
     delete incomplete[key];
     assert.throws(() => requireHostInjectedC3Composition(incomplete), /TRUSTED_RUNTIME_/);
   }
 }
 assert.throws(() => requireHostInjectedC3Composition({ admission: allow, receiptSink }), /TRUSTED_RUNTIME_C3_COMPOSITION_REQUIRED/);
 assert.throws(() => requireHostInjectedC3Composition({ ...full, ownerApproved: true }), /TRUSTED_RUNTIME_COMPOSITION_INVALID/);
});

test('candidate execution seam rejects authority supplied as config-shaped data', () => {
 const base = {
   deviceRegistry: new Map([['pc-primary', { platform: 'windows' }]]),
   adapterRegistry: { adapters: [] },
   formulaPreGate: allow, veritasPreGate: allow, receiptSink,
   trustedIssuerRegistry: { issuer: {} },
   replayGuard: { has: () => false, consume: () => true },
   consentProvider: async () => null,
 };
 assert.throws(() => requireHostInjectedC3Composition({ ...base, configPath: 'authority.json' }), /TRUSTED_RUNTIME_COMPOSITION_INVALID/);
 assert.throws(() => requireHostInjectedC3Composition({ ...base, request: { veritas: true } }), /TRUSTED_RUNTIME_COMPOSITION_INVALID/);
});
