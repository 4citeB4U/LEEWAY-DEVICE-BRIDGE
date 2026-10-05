import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { validateCommandEnvelope } from "../verification/command-envelope.mjs";

const hashArguments = async (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const args={ power:"on" };
const argumentsHash=await hashArguments(args);
const base={
 version:"1.0.0",commandId:"cmd-1",sessionId:"session-1",deviceId:"device-1",
 capabilityId:"device.test.set",providerId:"test-provider",
 createdAt:"2026-10-05T22:00:00.000Z",expiresAt:"2026-10-05T22:00:10.000Z",
 nonce:"nonce-1",sequence:1,argumentsHash,authorityTier:"LOW",
 formulaDecisionRef:"receipt://formula/1",timeoutPolicyRef:"timeout://1",
 expectedStateHash:"state://1",failSafePolicyRef:"failsafe://1",
 replayPolicy:"COMMAND_ID_NONCE_SEQUENCE_FIRST_SEEN_REQUIRED",
 integrity:{algorithm:"TEST",stamp:"ok"}
};
const common={nowMs:Date.parse("2026-10-05T22:00:01Z"),argumentsValue:args,hashArguments,maxLifetimeMs:15000,maxClockSkewMs:1000,verifyIntegrity:async()=>true};

test("replay store is mandatory",async()=>{
 await assert.rejects(()=>validateCommandEnvelope({envelope:base,...common}),/REPLAY_STORE_REQUIRED/);
});
test("arguments are bound to argumentsHash",async()=>{
 await assert.rejects(()=>validateCommandEnvelope({envelope:base,...common,firstSeen:async()=>true,argumentsValue:{power:"off"}}),/ARGUMENTS_HASH_MISMATCH/);
});
test("maximum envelope lifetime is enforced",async()=>{
 await assert.rejects(()=>validateCommandEnvelope({envelope:{...base,expiresAt:"2026-10-05T22:01:00Z"},...common,firstSeen:async()=>true}),/LIFETIME_EXCEEDED/);
});
test("valid bounded envelope passes",async()=>{
 const r=await validateCommandEnvelope({envelope:base,...common,firstSeen:async()=>true});
 assert.equal(r.ok,true);
});
