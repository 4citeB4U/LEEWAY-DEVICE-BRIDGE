import test from "node:test";
import assert from "node:assert/strict";
import { validateAppleVeritasDescriptor } from "../scripts/apple-veritas-descriptor-validation.mjs";

// Exact structural requirements transcribed from Runtime Fabric
// contracts/universal-adapter-contract.v1.json. Fixture is not a trust root.
const required = {
  identity:["id","version","domain","adapterClass"],
  capability:["contracts","operations"],
  binding:["provider","runtimeTarget","bindingMode"],
  portability:["contractPortable","adapterImplemented","platformTested"],
  governance:["authorizationClass","permissions"],
  evidence:["measurementSchema","veritasRequirements"],
  lifecycle:["health","cancel","failure","rollbackOrFallback"]
};
const contract = {id:"LEEWAY_UNIVERSAL_ADAPTER_CONTRACT_V1",
  runtimeOwner:"4citeB4U/Leeway-Runtime-Fabric",adapterClasses:["evidence-veritas"],required};
const descriptor = Object.fromEntries(Object.entries(required).map(([group,fields])=>
  [group,Object.fromEntries(fields.map(field=>[field,"fixture-only"]))]));
descriptor.identity.adapterClass="evidence-veritas";
for (const [section, field] of [["capability","contracts"],["capability","operations"],["governance","permissions"],["evidence","veritasRequirements"]]) descriptor[section][field]=["fixture-only"];
for (const field of ["contractPortable","adapterImplemented","platformTested"]) descriptor.portability[field]=false;

test("Complete descriptor is only shape valid, never authorized",()=>{
  const r=validateAppleVeritasDescriptor(descriptor,contract);
  assert.equal(r.state,"SHAPE_ONLY_UNTRUSTED");
  assert.equal(r.validShape,true); assert.equal(r.authorized,false); assert.equal(r.executable,false);
});
test("Missing canonical field is rejected",()=>{
  const r=validateAppleVeritasDescriptor({...descriptor, binding:{...descriptor.binding,provider:""}},contract);
  assert.equal(r.validShape,false);assert.ok(r.errors.includes("MISSING_FIELD:binding.provider"));
});
test("Missing section is rejected",()=>{
  const {governance,...partial}=descriptor;
  assert.ok(validateAppleVeritasDescriptor(partial,contract).errors.includes("MISSING_SECTION:governance"));
});
test("Wrong adapter class is rejected",()=>{
  assert.ok(validateAppleVeritasDescriptor({...descriptor,identity:{...descriptor.identity,adapterClass:"runtime-execution"}},contract).errors.includes("INVALID_ADAPTER_CLASS"));
});
test("Unrecognized contract cannot qualify even complete descriptor",()=>{
  const r=validateAppleVeritasDescriptor(descriptor,{...contract,runtimeOwner:"untrusted"});
  assert.equal(r.state,"CONTRACT_NOT_RECOGNIZED");assert.equal(r.authorized,false);
});
test("Self-asserted authorization and independent qualification never permit execution",()=>{
  const r=validateAppleVeritasDescriptor({...descriptor,independentlyQualified:true,authorized:true},contract);
  assert.equal(r.validShape,true);assert.equal(r.authorized,false);assert.equal(r.executable,false);
});

test("Non-array capability operations are rejected",()=>{
  const r=validateAppleVeritasDescriptor({...descriptor,capability:{...descriptor.capability,operations:"verify"}},contract);
  assert.ok(r.errors.includes("INVALID_LIST:capability.operations"));
});
test("Empty permissions list is rejected",()=>{
  const r=validateAppleVeritasDescriptor({...descriptor,governance:{...descriptor.governance,permissions:[]}},contract);
  assert.ok(r.errors.includes("INVALID_LIST:governance.permissions"));
});
test("String boolean cannot fake portability evidence",()=>{
  const r=validateAppleVeritasDescriptor({...descriptor,portability:{...descriptor.portability,platformTested:"true"}},contract);
  assert.ok(r.errors.includes("INVALID_BOOLEAN:portability.platformTested"));
});
test("Object-shaped provider binding cannot pass string identity",()=>{
  const r=validateAppleVeritasDescriptor({...descriptor,binding:{...descriptor.binding,provider:{providerId:"invented"}}},contract);
  assert.ok(r.errors.includes("INVALID_STRING:binding.provider"));
});
