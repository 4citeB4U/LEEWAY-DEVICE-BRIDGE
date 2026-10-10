/*
REGION: LeeWay Device Bridge provider adapters
TAG: LEEWAY-DEVICE-PROVIDER-GOVERNED-BASE
WHO: Agent Lee / authorized LeeWay runtimes
WHAT: Shared fail-closed wrapper contract for external/local device providers.
WHEN: Before provider discovery, observation, or actuation.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/providers/_shared
WHY: Normalize provider behavior without granting provider authority.
HOW: Explicit configuration + authority tier + human-confirmation gates + truthful evidence states.
LICENSE: MIT
*/

const CONSEQUENTIAL = new Set(["OPERATE", "MUTATE", "ADMIN"]);

export class GovernedProvider {
  constructor({ providerId, providerClass, transport = null, configured = false } = {}) {
    if (!providerId) throw new Error("PROVIDER_ID_REQUIRED");
    this.providerId = providerId;
    this.providerClass = providerClass || "external";
    this.transport = transport;
    this.configured = Boolean(configured || transport);
  }

  state(extra = {}) {
    return {
      providerId: this.providerId,
      providerClass: this.providerClass,
      configured: this.configured,
      transportAvailable: Boolean(this.transport),
      evidenceState: this.configured ? "AVAILABLE" : "UNVERIFIED",
      authority: "LEEWAY_DEVICE_BRIDGE_PROVIDER_DONOR_ONLY",
      ...extra
    };
  }

  requireConfigured() {
    if (!this.configured || !this.transport) {
      const error = new Error("PROVIDER_NOT_CONFIGURED:" + this.providerId);
      error.code = "PROVIDER_NOT_CONFIGURED";
      throw error;
    }
  }

  admit({ authorityTier = "READ", humanConfirmed = false } = {}) {
    if (CONSEQUENTIAL.has(authorityTier) && !humanConfirmed) {
      const error = new Error("HUMAN_CONFIRMATION_REQUIRED");
      error.code = "HUMAN_CONFIRMATION_REQUIRED";
      throw error;
    }
    return true;
  }

  async invoke(operation, payload = {}, gate = {}) {
    this.requireConfigured();
    this.admit(gate);
    if (typeof this.transport.invoke !== "function") {
      throw new Error("PROVIDER_TRANSPORT_INVOKE_REQUIRED:" + this.providerId);
    }
    return this.transport.invoke(operation, payload);
  }
}
