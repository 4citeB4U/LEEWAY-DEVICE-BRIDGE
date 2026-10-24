/*
REGION: LEEWAY.DEVICES.COMMANDER.QUALIFICATION
TAG: ANDROID_COMMANDER_SIGNATURE_AND_AUTHORITY_TEST
WHO: Agent Lee qualification; WHAT: Execute real JVM cryptography and session-boundary tests.
WHEN: Before APK admission; WHERE: Android module JVM suite.
WHY: Source names and a connection do not prove owner authorization.
HOW: Ephemeral test keys, actual signatures, expiry/tamper/scope/replay counterexamples.
LICENSE: MIT
*/
package industries.leeway.devices.commander

import org.json.JSONObject
import org.json.JSONArray
import org.junit.Assert.*
import org.junit.Test
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64

class CommanderProtocolTest {
    private val now=2000000000000L
    private fun keys()=KeyPairGenerator.getInstance("EC").apply{initialize(ECGenParameterSpec("secp256r1"))}.generateKeyPair()
    private fun der(k:KeyPair)=Base64.getEncoder().encodeToString(k.public.encoded)
    private fun sign(k:KeyPair,b:ByteArray)=Signature.getInstance("SHA256withECDSA").run{initSign(k.private);update(b);sign()}
    private fun envelope(k:KeyPair,b:JSONObject)=CommanderProtocol.sign(b){sign(k,it)}.put("targetPublicKeyDerBase64",der(k))
    private fun grantBody(client:KeyPair)=JSONObject().put("schema","leeway.commander.grant.v1").put("state","PAIRED")
        .put("pairingId","pair-1").put("sessionId","session-1").put("deviceId","target-pc").put("clientId","client-phone")
        .put("clientPublicKeyDerBase64",der(client)).put("clientPublicKeyFingerprintSha256",CommanderProtocol.sha(client.public.encoded))
        .put("requestNonce","request-1").put("issuedAtMs",now).put("expiresAtMs",now+60000).put("ownerApprovalEventId","owner-click-1")
        .put("relayUrl","wss://example.invalid/approved-relay").put("capabilities",JSONArray().put("device.health").put("device.files.read"))
    private fun parse(target:KeyPair,client:KeyPair,body:JSONObject=grantBody(client))=CommanderGrant.parse(envelope(target,body),CommanderProtocol.sha(target.public.encoded),"client-phone",CommanderProtocol.sha(client.public.encoded),now,"request-1")
    private fun reject(reason:String,call:()->Unit){try{call();fail("Expected rejection: "+reason)}catch(e:IllegalArgumentException){assertEquals(reason,e.message)}}
    private fun result(p:CommanderPending)=JSONObject(p.request.toString()).put("schema","leeway.commander.result.v1").put("status","PASS").put("value",JSONObject().put("state","ok"))

    @Test fun ownerSignedGrantAdmitsOnlyItsClientAndScope(){val t=keys();val c=keys();val g=parse(t,c);assertEquals("target-pc",g.deviceId);assertEquals(setOf("device.health","device.files.read"),g.capabilities)}
    @Test fun wrongTargetPinIsRejected(){val t=keys();val c=keys();reject("COMMANDER_TARGET_IDENTITY_MISMATCH"){CommanderGrant.parse(envelope(t,grantBody(c)),"0".repeat(64),"client-phone",CommanderProtocol.sha(c.public.encoded),now)}}
    @Test fun wrongClientIsRejected(){val t=keys();val c=keys();reject("COMMANDER_WRONG_CLIENT"){CommanderGrant.parse(envelope(t,grantBody(c)),CommanderProtocol.sha(t.public.encoded),"other-phone",CommanderProtocol.sha(c.public.encoded),now)}}
    @Test fun tamperedSignedGrantIsRejected(){val t=keys();val c=keys();val b=envelope(t,grantBody(c));b.put("payloadBase64",Base64.getEncoder().encodeToString(grantBody(c).put("deviceId","attacker").toString().toByteArray()));reject("COMMANDER_SIGNATURE_INVALID"){CommanderGrant.parse(b,CommanderProtocol.sha(t.public.encoded),"client-phone",CommanderProtocol.sha(c.public.encoded),now)}}
    @Test fun expiryAndUnboundedLifetimeAreRejected(){val t=keys();val c=keys();reject("COMMANDER_GRANT_EXPIRED_OR_UNBOUNDED"){parse(t,c,grantBody(c).put("expiresAtMs",now))};reject("COMMANDER_GRANT_EXPIRED_OR_UNBOUNDED"){parse(t,c,grantBody(c).put("expiresAtMs",now+86400001))}}
    @Test fun pairingNonceCannotBeReplaced(){val t=keys();val c=keys();reject("COMMANDER_PAIRING_CHALLENGE_MISMATCH"){parse(t,c,grantBody(c).put("requestNonce","different"))}}
    @Test fun unsignedScopeEscalationAndWritesAreRejected(){val t=keys();val c=keys();reject("COMMANDER_GRANT_SCOPE_INVALID"){parse(t,c,grantBody(c).put("capabilities",JSONArray().put("device.files.write")))};val g=parse(t,c);reject("COMMANDER_CAPABILITY_NOT_GRANTED"){g.command("device.files.write",JSONObject(),now){sign(c,it)}}}
    @Test fun targetMustDeclarePairedState(){val t=keys();val c=keys();reject("COMMANDER_SIGNED_GRANT_REQUIRED"){parse(t,c,grantBody(c).put("state","OWNER_APPROVAL_REQUIRED"))}}
    @Test fun plaintextAndSupersededRelayAreRejected(){reject("COMMANDER_WSS_ENDPOINT_REQUIRED"){CommanderProtocol.endpoint("ws://example.invalid/relay")};reject("SUPERSEDED_COMMANDER_ENDPOINT_REJECTED"){CommanderProtocol.endpoint("wss://agent-lee-x.vercel.app/api/device-relay")};reject("COMMANDER_WSS_ENDPOINT_REQUIRED"){CommanderProtocol.endpoint("wss://user:token@example.invalid/relay")}}
    @Test fun generatedCommandSignatureIsRealAndTargetBound(){val t=keys();val c=keys();val g=parse(t,c);val p=g.command("device.health",JSONObject(),now){sign(c,it)};val body=CommanderProtocol.verify(p.signed,c.public);assertEquals("target-pc",body.getString("deviceId"));assertEquals(15000,body.getLong("expiresAtMs")-body.getLong("issuedAtMs"))}
    @Test fun matchingSignedResultIsAdmittedOnce(){val t=keys();val c=keys();val p=parse(t,c).command("device.health",JSONObject(),now){sign(c,it)};val response=envelope(t,result(p));assertEquals("PASS",p.accept(response,now+10).getString("status"));reject("COMMANDER_RESULT_REPLAYED"){p.accept(response,now+11)}}
    @Test fun wrongCommandResultIsRejected(){val t=keys();val c=keys();val p=parse(t,c).command("device.health",JSONObject(),now){sign(c,it)};reject("COMMANDER_RESULT_IDENTITY_MISMATCH"){p.accept(envelope(t,result(p).put("commandId","other-command")),now+10)}}
    @Test fun lateResultCannotBecomeSuccess(){val t=keys();val c=keys();val p=parse(t,c).command("device.health",JSONObject(),now){sign(c,it)};reject("COMMANDER_RESULT_STALE"){p.accept(envelope(t,result(p)),now+15001)}}
    @Test fun requesterCannotForgeTargetReply(){val t=keys();val c=keys();val p=parse(t,c).command("device.health",JSONObject(),now){sign(c,it)};reject("COMMANDER_SIGNATURE_INVALID"){p.accept(envelope(c,result(p)),now+10)}}
    @Test fun signedFailureDoesNotBecomeHealthy(){val t=keys();val c=keys();val p=parse(t,c).command("device.health",JSONObject(),now){sign(c,it)};reject("COMMANDER_TARGET_REJECTED_OR_FAILED"){p.accept(envelope(t,result(p).put("status","FAILED")),now+10)}}
    @Test fun resultMatchingFieldsCannotBeMutatedAfterCreation(){val t=keys();val c=keys();val p=parse(t,c).command("device.health",JSONObject(),now){sign(c,it)};val id=p.request.getString("commandId");p.request.put("commandId","mutated");assertEquals(id,p.request.getString("commandId"))}
}
