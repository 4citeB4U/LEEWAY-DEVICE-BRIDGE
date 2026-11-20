/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.OWNER_CONSENT
TAG: LEEWAY.RUNTIME.OWNER_INTERACTION_BOUND_CONSENT_V1
5WH:
WHAT = Adapt genuinely verified Runtime owner-interaction authorization into canonical Bridge consent evidence.
WHY = Remove the host bootstrap's unattended self-minting of a consent token for every mutation.
WHO = Trusted Windows Runtime startup under Creator authority, not a remote MCP caller.
WHERE = operator/identity/runtime-owner-consent-provider.mjs.
WHEN = 2026-11-20.
HOW = Require Runtime's request-bound signed owner authorization, its independent verifier,
      recorded proof custody, and exact argument hash before issuing Bridge's existing Ed25519 consent.
LICENSE = MIT.
AUTHORITY = Candidate integration only. This does NOT issue a production Veritas decision,
            an automatic owner approval, an additional trust root, or permission to start execution.
*/
import { createPrivateKey, createPublicKey, createHash, randomUUID } from 'node:crypto';
import { createConsentEvidenceToken, computeArgsDigest } from '../trusted-issuer-registry.mjs';

const hex64 = x => typeof x === 'string' && /^[a-f0-9]{64}$/i.test(x);
const digest = text => createHash('sha256').update(text).digest('hex');
const plain = obj => obj !== null && typeof obj === 'object' && !Array.isArray(obj);

/**
 * All callbacks are injected by source-pinned *trusted local Runtime startup*,
 * never config JSON, a ChatGPT command, or a bearer request.
 *
 * requestOwnerAuthorization: run real Windows Hello/user-prompt Authority 1
 *   and Authority 2 issuance; return its signed leeway.owner-authorization.v2.
 * verifyOwnerAuthorization: invoke Runtime Authority 3, including receipt signature,
 *   request binding, revocation and separate durable replay; return actual proof.
 * recordOwnerProof: append a hash-only reference to the original Receipt Authority
 *   custody channel, fail closed if unavailable.
 */
export function createRuntimeOwnerConsentProvider({
  requestOwnerAuthorization,
  verifyOwnerAuthorization,
  recordOwnerProof,
  trustedIssuerRegistry,
  consentIssuer,
  consentKeyId,
  consentPrivateKeyPem,
  randomId = randomUUID,
  now = Date.now,
} = {}) {
  if ([requestOwnerAuthorization, verifyOwnerAuthorization, recordOwnerProof, randomId, now]
    .some(fn => typeof fn !== 'function')) throw Error('RUNTIME_OWNER_CONSENT_PROVIDERS_REQUIRED');
  const issuer = trustedIssuerRegistry?.[consentIssuer];
  if (!issuer || issuer.issuerId !== consentIssuer || issuer.keyId !== consentKeyId ||
      issuer.status !== 'ACTIVE' || issuer.algorithm !== 'Ed25519' ||
      typeof issuer.publicKeySpki !== 'string' || !issuer.publicKeySpki.includes('BEGIN PUBLIC KEY')) {
    throw Error('RUNTIME_OWNER_CONSENT_ISSUER_NOT_ENROLLED');
  }
  if (typeof consentPrivateKeyPem !== 'string' || !consentPrivateKeyPem.includes('PRIVATE KEY')) {
    throw Error('RUNTIME_OWNER_CONSENT_SIGNING_KEY_REQUIRED');
  }
  // Prove the private signer is the one enrolled in the *existing* issuer registry.
  let matches = false;
  try {
    const expected = createPublicKey(issuer.publicKeySpki).export({ format:'der', type:'spki' });
    const actual = createPublicKey(createPrivateKey(consentPrivateKeyPem)).export({ format:'der', type:'spki' });
    matches = expected.equals(actual);
  } catch {}
  if (!matches) throw Error('RUNTIME_OWNER_CONSENT_SIGNING_KEY_MISMATCH');

  return async function consentForC3({
    deviceId, platform, capability, args, argsDigest, authorityTier,
  } = {}) {
    if (authorityTier === 'READ') return null;
    if (!['MUTATE', 'ADMIN', 'OPERATE'].includes(authorityTier) ||
        typeof deviceId !== 'string' || !deviceId.trim() ||
        typeof platform !== 'string' || !platform.trim() ||
        typeof capability !== 'string' || !capability.trim() ||
        !plain(args) || !hex64(argsDigest) ||
        computeArgsDigest(args) !== argsDigest) return null;

    const requestId = randomId();
    const request = Object.freeze({
      requestId, deviceId, targetId: deviceId, platform, capability,
      args: { ...args }, argsDigest, authorityTier,
    });
    try {
      const auth = await requestOwnerAuthorization(request);
      if (!plain(auth) || auth.schema !== 'leeway.owner-authorization.v2' ||
          auth.authorized !== true || auth.committed !== true ||
          auth.provenanceMode !== 'INTERACTIVE_AUTHENTICATED_OWNER_PROMPT' ||
          auth.requestId !== requestId || auth.targetId !== deviceId ||
          auth.capability !== capability || auth.argsDigest !== argsDigest ||
          !plain(auth.interactionEvidence) || !auth.interactionEvidence.sessionId ||
          !hex64(auth.interactionReceiptSha256)) return null;
      const issuedAt = Date.parse(auth.issuedAt);
      const expiresAt = Date.parse(auth.expiresAt);
      const clock = now();
      if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) ||
          issuedAt > clock + 10000 || expiresAt <= clock || expiresAt - issuedAt > 120000) return null;

      // The real Runtime verifier must independently authenticate this signed
      // owner token, Windows Hello receipt, revocation state, and replay guard.
      const verdict = await verifyOwnerAuthorization({
        ownerAuthorization: auth, expectedRequestId: requestId,
        expectedTargetId: deviceId, expectedCapability: capability,
        expectedArgsDigest: argsDigest,
      });
      if (verdict?.valid !== true ||
          verdict.requestId !== requestId || verdict.targetId !== deviceId ||
          verdict.capability !== capability ||
          verdict.provenanceMode !== 'INTERACTIVE_AUTHENTICATED_OWNER_PROMPT' ||
          verdict.platformAuthenticator?.userPresenceVerified !== true ||
          verdict.sessionId !== auth.interactionEvidence.sessionId ||
          !verdict.sessionNonce || typeof verdict.sessionNonce !== 'string') return null;

      // Never put the token, key, PII or interaction payload into a log.
      const proofRef = Object.freeze({
        schema: 'leeway.bridge.owner-consent-reference.v1',
        observedAt: new Date(clock).toISOString(),
        requestId, deviceId, platform, capability, argsDigest,
        ownerAuthorizationSha256: digest(JSON.stringify(auth)),
        interactionReceiptSha256: auth.interactionReceiptSha256,
        provenanceMode: verdict.provenanceMode,
        sessionId: verdict.sessionId,
        provider: 'RUNTIME_AUTHORITY_3',
      });
      const written = await recordOwnerProof(proofRef);
      if (written !== true) return null;

      return createConsentEvidenceToken({
        issuer: consentIssuer, keyId: consentKeyId, privateKeyPem: consentPrivateKeyPem,
        requestId, deviceId, platform, capability,
        args: { ...args }, sessionNonce: verdict.sessionNonce,
        tokenNonce: 'consent-' + randomId(),
        ttlMs: Math.min(60000, expiresAt - clock),
      });
    } catch {
      // Prompt cancellation, revoked or stale proof, unavailable custodian,
      // provider crash and failed key use all deny instead of self-approving.
      return null;
    }
  };
}
