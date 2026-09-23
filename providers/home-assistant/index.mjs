function normalizeBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string" || !/^https?:\/\//i.test(baseUrl)) {
    throw new Error("HOME_ASSISTANT_BASE_URL_REQUIRED");
  }
  return baseUrl.replace(/\/+$/, "");
}

function requireToken(token) {
  if (typeof token !== "string" || token.trim().length === 0) {
    throw new Error("HOME_ASSISTANT_TOKEN_REQUIRED");
  }
  return token.trim();
}

export class HomeAssistantProvider {
  constructor({ baseUrl, token }) {
    this.providerId = "home-assistant";
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.token = requireToken(token);
  }

  headers() {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer " + this.token
    };
  }

  async request(path, init = {}) {
    const response = await fetch(this.baseUrl + path, {
      ...init,
      headers: { ...this.headers(), ...(init.headers || {}) }
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return {
      providerId: this.providerId,
      ok: response.ok,
      statusCode: response.status,
      path,
      body,
      authority: "HOME_ASSISTANT_API_PROVIDER"
    };
  }

  health() {
    return this.request("/api/");
  }

  async listStates() {
    const result = await this.request("/api/states");
    return { ...result, capability: "device.list-states" };
  }

  async readState(entityId) {
    if (!entityId) throw new Error("HOME_ASSISTANT_ENTITY_ID_REQUIRED");
    const result = await this.request("/api/states/" + encodeURIComponent(entityId));
    return { ...result, capability: "device.read-state", entityId };
  }

  async callService(domain, service, serviceData = {}) {
    if (!domain || !service) throw new Error("HOME_ASSISTANT_SERVICE_REQUIRED");
    const path = "/api/services/" + encodeURIComponent(domain) + "/" + encodeURIComponent(service);
    const result = await this.request(path, {
      method: "POST",
      body: JSON.stringify(serviceData)
    });
    return {
      ...result,
      capability: "device.service-call",
      domain,
      service,
      physicalPostStateVerified: false
    };
  }
}
