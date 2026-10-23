/*
REGION: 🟢 CORE / OPERATOR
TAG: LEEWAY-C3-ADMISSION-BINDING
WHO: Agent Lee / authorized LeeWay runtimes
WHAT: Canonical C3 admission gate for Bridge.call(), replacing placeholder admission: async () => true.
WHEN: Before every command dispatch across universal device adapters (iOS, Android, Windows, macOS, Linux).
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/operator
WHY: Prevent unauthorized, unavailable, or non-consensual operations from executing.
     Enforces platform capability state, authority tiers (READ vs MUTATE vs ADMIN),
     enrolled trusted issuer consent tokens, and mandatory Veritas pre-gate compliance; denies by default.
HOW: Bridge admission callback -> device platform lookup -> admitCommand() evaluation ->
     signed consent verification (verifyConsentEvidence) -> mandatory Veritas Pre-Gate attestation.
LICENSE: MIT
*/
import { loadAdapterRegistry, admitCommand } from "./device-operator.mjs";
import {
  verifyConsentEvidence,
  computeArgsDigest,
  loadTrustedIssuerRegistry,
  DEFAULT_REPLAY_GUARD
} from "./trusted-issuer-registry.mjs";
import { mathematicalEligibility } from "./c3-mathematical-foundation.mjs";

/**
 * Extract capability metadata strictly from registry.
 * Never trust caller-supplied _authorityTier or _humanConfirmed.
 */
function resolveCapabilityMetadata(platform, capability, registry) {
  let adapter = null;
  if (Array.isArray(registry?.adapters)) {
    adapter = registry.adapters.find((item) => item.platform === platform);
  } else if (registry?.adapters && typeof registry.adapters === "object") {
    adapter = registry.adapters[platform];
  }
  if (!adapter) return null;
  const cap = adapter.capabilities?.[capability];
  if (!cap) return null;

  let tier = "READ";
  if (cap.requiresHumanConsent || capability.includes(".write") || capability.includes(".install") || capability.includes(".terminate") || capability.includes(".create")) {
    tier = "MUTATE";
  } else if (capability.startsWith("device.ui.") || capability.includes(".execute") || capability.includes(".inference") || capability.includes(".speak")) {
    tier = "OPERATE";
  }

  return {
    state: cap.state,
    requiresHumanConsent: Boolean(cap.requiresHumanConsent),
    authorityTier: tier
  };
}

/**
 * Create a canonical C3 admission callback for Bridge instances.
 *
 * @param {object} options
 * @param {Map<string, { platform: string }> | Array<{ id: string, platform?: string }>} [options.deviceRegistry]
 * @param {object} [options.registry] - Custom adapter registry, defaults to operator/adapter-registry.json
 * @param {object} [options.trustedIssuerRegistry] - Enrolled public-key trust registry
 * @param {object} [options.replayGuard] - Anti-replay manager
 * @param {Function} options.veritasPreGate - Mandatory Veritas pre-gate verification hook
 * @param {Function} [options.consentProvider] - Dynamic provider for leeway.consent-evidence.v1 tokens
 * @returns {function({ deviceId: string, capability: string, args: object }): Promise<boolean>}
 */
export function createC3AdmissionBinding({
  deviceRegistry = new Map(),
  registry = loadAdapterRegistry(),
  trustedIssuerRegistry = null,
  replayGuard = DEFAULT_REPLAY_GUARD,
  veritasPreGate,
  consentProvider = null,
  formulaPreGate = null
} = {}) {
  // Normalize device map
  const deviceMap = deviceRegistry instanceof Map
    ? deviceRegistry
    : new Map(deviceRegistry.map(d => [d.id, d]));

  // Load enrolled trust registry if not explicitly provided
  let issuers = trustedIssuerRegistry;
  if (!issuers) {
    try {
      issuers = loadTrustedIssuerRegistry();
    } catch {
      issuers = null;
    }
  }

  return async function c3Admission({ deviceId, capability, args = {} }) {
    // 1. Mandatory Veritas Pre-Gate presence check (fail closed if not configured)
    if (!veritasPreGate || typeof veritasPreGate !== "function") {
      return false;
    }

    // 2. Mandatory Formula Pre-Gate presence check (fail closed if not configured)
    if (!formulaPreGate || typeof formulaPreGate !== "function") {
      return false;
    }

    // 3. Fail closed if device is unregistered
    const device = deviceMap.get(deviceId);
    if (!device) return false;

    // 4. Platform must be explicit; unknown platform fails closed
    const platform = device.platform;
    if (!platform || typeof platform !== "string") {
      return false;
    }

    // 5. Derive capability metadata strictly from registry
    const meta = resolveCapabilityMetadata(platform, capability, registry);
    if (!meta) return false;

    // Reject if capability is BLOCKED, UNAVAILABLE, or UNKNOWN
    if (["BLOCKED", "UNAVAILABLE", "UNKNOWN"].includes(meta.state)) {
      return false;
    }

    const authorityTier = meta.authorityTier;
    let humanConfirmed = false;
    let verifiedConsent = null;

    // 6. Query consent evidence if consentProvider is configured OR if operation requires consent
    if (consentProvider && typeof consentProvider === "function") {
      const argsDigest = computeArgsDigest(args);
      let consentToken = null;
      try {
        consentToken = await consentProvider({
          deviceId,
          platform,
          capability,
          argsDigest,
          authorityTier
        });
      } catch {
        consentToken = null;
      }

      if (consentToken && typeof consentToken === "object" && issuers) {
          // Only the trusted issuer verifier may establish owner consent.
          // A caller-supplied valid flag, nonce or unsigned object is not evidence.
          try {
            verifiedConsent = verifyConsentEvidence({
              consentEvidence: consentToken,
              expectedDeviceId: deviceId,
              expectedPlatform: platform,
              expectedCapability: capability,
              expectedArgsDigest: argsDigest,
              trustedIssuerRegistry: issuers,
              replayGuard
            });
            humanConfirmed = verifiedConsent.valid === true;
          } catch {
            verifiedConsent = null;
          }
      }
    }

    // Fail closed if consequential operation lacks verified consent
    if ((meta.requiresHumanConsent || authorityTier === "MUTATE" || authorityTier === "ADMIN") && !humanConfirmed) {
      return false;
    }

    // 7. Evaluate Device Operator kernel
    const decision = admitCommand({
      platform,
      capability,
      authorityTier,
      humanConfirmed
    }, registry);

    if (!decision.admitted) {
      return false;
    }

    // 8. Mandatory Formula Pre-Gate Verification (Transformation 2)
    let formulaOk = false;
    let formulaEvidence = null;
    try {
      const formulaRes = await formulaPreGate({
        deviceId,
        platform,
        capability,
        authorityTier,
        decision,
        verifiedConsent
      });
      formulaOk = formulaRes === true || (formulaRes && formulaRes.passed === true);
      if (formulaRes && typeof formulaRes === "object") {
        formulaEvidence = formulaRes;
      }
    } catch {
      return false;
    }
    if (!formulaOk) return false;

    // 9. Mandatory Veritas Pre-Gate Attestation (Transformation 3)
    let veritasOk = false;
    try {
      const vRes = await veritasPreGate({
        deviceId,
        platform,
        capability,
        authorityTier,
        decision,
        verifiedConsent,
        formulaEvidence
      });
      veritasOk = vRes === true;
    } catch {
      return false;
    }
    if (!veritasOk) return false;

    // 10. Qualified Gate Vector Conjunction: Bind each mathematical bit to an independently authenticated evidence record
    // Bit 0: Device Platform Registration Authority
    const bit0 = (device && typeof platform === "string" && ["ios", "android", "windows", "macos", "linux"].includes(platform)) ? 1 : 0;
    const evidenceBit0 = {
      bitIndex: 0,
      authority: "DEVICE_REGISTRATION",
      qualified: bit0 === 1,
      evidenceSource: "DEVICE_REGISTRY",
      deviceId,
      platform,
      enrolled: Boolean(device)
    };

    // Bit 1: Capability Lifecycle State Authority
    const bit1 = (meta && !["BLOCKED", "UNAVAILABLE", "UNKNOWN"].includes(meta.state)) ? 1 : 0;
    const evidenceBit1 = {
      bitIndex: 1,
      authority: "CAPABILITY_SPECIFICATION",
      qualified: bit1 === 1,
      evidenceSource: "ADAPTER_REGISTRY",
      capability,
      state: meta?.state || "UNKNOWN",
      authorityTier
    };

    // Bit 2: Operator Kernel Policy Authority
    const bit2 = (decision && decision.admitted === true) ? 1 : 0;
    const evidenceBit2 = {
      bitIndex: 2,
      authority: "OPERATOR_KERNEL_POLICY",
      qualified: bit2 === 1,
      evidenceSource: "DEVICE_OPERATOR_KERNEL",
      admitted: Boolean(decision?.admitted),
      reason: decision?.reason || null
    };

    // Bit 3: Sovereign Authority & Consent Provenance
    let bit3 = 0;
    let evidenceBit3 = null;
    if (verifiedConsent && verifiedConsent.valid === true) {
      bit3 = 1;
      evidenceBit3 = {
        bitIndex: 3,
        authority: "SOVEREIGN_OWNER_CONSENT",
        provenanceType: "VERIFIED_CARRIER_TOKEN",
        qualified: true,
        evidenceSource: "TRUSTED_ISSUER_REGISTRY",
        issuer: verifiedConsent.issuer,
        keyId: verifiedConsent.keyId
      };
    } else if (!meta.requiresHumanConsent && authorityTier === "READ" && decision.admitted === true) {
      bit3 = 1;
      evidenceBit3 = {
        bitIndex: 3,
        authority: "AUTONOMOUS_READ_POLICY_DISPOSITION",
        provenanceType: "BOUNDED_READ_TIER_ADMITTED",
        qualified: true,
        evidenceSource: "CAPABILITY_POLICY_RULE",
        tier: "READ",
        requiresHumanConsent: false
      };
    } else {
      bit3 = 0;
      evidenceBit3 = {
        bitIndex: 3,
        authority: "SOVEREIGN_OWNER_CONSENT",
        provenanceType: "CONSENT_REQUIRED_OR_INVALID",
        qualified: false,
        evidenceSource: "TRUSTED_ISSUER_REGISTRY",
        reason: "MISSING_OR_INVALID_CONSENT"
      };
    }

    // Bit 4: Centralized Golden Formula Mathematical Authority
    const bit4 = formulaOk ? 1 : 0;
    const evidenceBit4 = {
      bitIndex: 4,
      authority: "CENTRALIZED_GOLDEN_FORMULA",
      qualified: bit4 === 1,
      evidenceSource: "FORMULA_SERVICE_EVALUATE",
      formulaId: formulaEvidence?.formulaId || "LEEWAY-FORMULA-v1.0",
      receiptSha256: formulaEvidence?.formulaReceiptSha256 || null
    };

    // Bit 5: Veritas Pre-Gate Compliance Authority
    const bit5 = veritasOk ? 1 : 0;
    const evidenceBit5 = {
      bitIndex: 5,
      authority: "VERITAS_PRE_GATE_ATTESTATION",
      qualified: bit5 === 1,
      evidenceSource: "TRUSTED_DEVICE_READ_VERITAS",
      status: "PASS"
    };

    // Bit 6: Replay Defense & Nonce Integrity Authority
    let bit6 = 0;
    let evidenceBit6 = null;
    if (verifiedConsent && verifiedConsent.valid === true && typeof verifiedConsent.tokenNonce === "string") {
      bit6 = 1;
      evidenceBit6 = {
        bitIndex: 6,
        authority: "REPLAY_DEFENSE_INTEGRITY",
        status: "NONCE_VERIFIED_AND_CONSUMED",
        qualified: true,
        evidenceSource: "CONSENT_REPLAY_GUARD",
        tokenNonce: verifiedConsent.tokenNonce,
        sessionNonce: verifiedConsent.sessionNonce
      };
    } else if (!verifiedConsent && !meta.requiresHumanConsent && authorityTier === "READ") {
      bit6 = 1;
      evidenceBit6 = {
        bitIndex: 6,
        authority: "REPLAY_DEFENSE_INTEGRITY",
        status: "STATELESS_READ_NO_NONCE_REQUIRED",
        qualified: true,
        evidenceSource: "CAPABILITY_POLICY_RULE",
        tier: "READ"
      };
    } else {
      bit6 = 0;
      evidenceBit6 = {
        bitIndex: 6,
        authority: "REPLAY_DEFENSE_INTEGRITY",
        status: "NONCE_MISSING_OR_INVALID",
        qualified: false,
        evidenceSource: "CONSENT_REPLAY_GUARD"
      };
    }

    const gateBits = [bit0, bit1, bit2, bit3, bit4, bit5, bit6];
    const eligibility = mathematicalEligibility(gateBits);

    const admissionEvidence = {
      admissionVector: gateBits,
      eligibility,
      admitted: eligibility === 1,
      records: [evidenceBit0, evidenceBit1, evidenceBit2, evidenceBit3, evidenceBit4, evidenceBit5, evidenceBit6]
    };
    c3Admission.lastAdmissionEvidence = admissionEvidence;

    if (eligibility !== 1) return false;

    return true;
  };
}
