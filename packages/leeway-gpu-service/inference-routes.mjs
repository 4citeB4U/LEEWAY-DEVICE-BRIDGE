// Transport for the existing LeeWay GPU service. Execution and verification
// belong to the trusted startup provider; request JSON cannot supply authority.
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/;
const SHA = /^[a-f0-9]{64}$/;
const SERVICE = 'leeway.gpu.service';
export function createInferenceRoutes({provider, authenticateClient, enabled, reply}) {
  const capabilities = provider?.capabilities?.bind(provider);
  const activate = provider?.activateModel?.bind(provider);
  const generate = provider?.generate?.bind(provider);
  const authenticate = typeof authenticateClient === 'function' ? authenticateClient : null;
  const pending = new Set();
  async function describe() {
    if (!capabilities) return {schema: 'leeway.gpu.inference.v1', serviceId: SERVICE,
      modelInference: false, gpuVerified: false, models: [], status: 'UNBOUND'};
    const result = await capabilities();
    if (result?.schema !== 'leeway.gpu.inference.v1' || result.serviceId !== SERVICE ||
        !Array.isArray(result.models) || result.models.length > 128 || result.models.some(id => !ID.test(id)))
      throw Error('GPU_PROVIDER_CAPABILITY_IDENTITY_MISMATCH');
    // Capability discovery cannot authorize a request. The provider still
    // verifies the complete per-request Runtime chain before returning output.
    return {...result, executionAuthorization: 'PER_REQUEST_REQUIRED'};
  }
  async function body(req) {
    let length = 0; const chunks = [];
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 64 * 1024) throw Object.assign(Error('GPU_REQUEST_TOO_LARGE'), {httpStatus: 413});
      chunks.push(chunk);
    }
    let value;
    try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Object.assign(Error('GPU_REQUEST_JSON_INVALID'), {httpStatus: 400}); }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Object.assign(Error('GPU_REQUEST_JSON_INVALID'), {httpStatus: 400});
    return value;
  }
  return Object.freeze({describe, cancelAll() { for(const controller of pending) controller.abort(); }, async handle(req, res, url, host) {
    const operation = url.pathname === '/v1/models/activate' ? 'activate' : url.pathname === '/v1/generate' ? 'generate' : null;
    if (req.method === 'GET' && url.pathname === '/v1/capabilities') {
      try { reply(res, 200, await describe()); } catch { reply(res, 503, {code: 'GPU_PROVIDER_CAPABILITIES_UNAVAILABLE'}); }
      return true;
    }
    if (!operation || req.method !== 'POST') return false;
    const controller = new AbortController();
    pending.add(controller);
    const cancel = () => { if (!res.writableFinished) controller.abort(); };
    req.once('aborted', cancel); res.once('close', cancel);
    try {
      if (!activate || !generate || !authenticate) throw Error('GPU_CANONICAL_INFERENCE_PROVIDER_UNBOUND');
      if (req.headers.origin !== undefined && req.headers.origin !== 'http://' + host)
        throw Object.assign(Error('GPU_INFERENCE_ORIGIN_REJECTED'), {httpStatus: 403});
      if (req.headers['content-type']?.split(';')[0] !== 'application/json')
        throw Object.assign(Error('GPU_INFERENCE_JSON_REQUIRED'), {httpStatus: 415});
      const identity = await authenticate({request: req, operation, signal: controller.signal});
      if (!ID.test(identity?.clientId || '')) throw Object.assign(Error('GPU_CLIENT_AUTHENTICATION_REQUIRED'), {httpStatus: 401});
      if (!enabled()) throw Object.assign(Error('GPU_SERVICE_OPTED_OUT'), {httpStatus: 403});
      const value = await body(req);
      const allowed = operation === 'activate' ? new Set(['modelId']) : new Set(['modelId', 'prompt', 'requestId', 'sessionId', 'maxNewTokens']);
      if (Object.keys(value).some(key => !allowed.has(key)) || !ID.test(value.modelId || '') ||
          (operation === 'generate' && (typeof value.prompt !== 'string' || !value.prompt.trim() || value.prompt.length > 4096)) ||
          ['requestId', 'sessionId'].some(key => value[key] !== undefined && !ID.test(value[key])) ||
          (value.maxNewTokens !== undefined && (!Number.isSafeInteger(value.maxNewTokens) || value.maxNewTokens < 1 || value.maxNewTokens > 64)))
        throw Object.assign(Error('GPU_INFERENCE_REQUEST_INVALID'), {httpStatus: 400});
      const result = await (operation === 'activate' ? activate : generate)(value, {client: Object.freeze({clientId: identity.clientId}), signal: controller.signal});
      if (controller.signal.aborted || !enabled()) throw Error('GPU_INFERENCE_CANCELLED');
      if (result?.serviceId !== SERVICE || result.modelId !== value.modelId || result.backend !== 'LEEWAY_GPU')
        throw Error('GPU_INFERENCE_RESULT_IDENTITY_MISMATCH');
      if (operation === 'generate') {
        const evidence = result.executionBinding;
        const hashes = ['requestHash', 'resultHash', 'modelSha256', 'tokenizerSha256', 'implementationSha256',
          'formulaReceiptSha256', 'formulaReplaySha256', 'ldWmdReceiptSha256', 'continuumReceiptSha256',
          'postReceiptSha256', 'commitAttestationSha256', 'receiptLedgerReceiptSha256', 'learningLedgerReceiptSha256'];
        if (result.canonicalReceiptIssued !== true || typeof result.text !== 'string' || result.text.length > 1024 * 1024 ||
            !ID.test(result.requestId || '') || !ID.test(result.sessionId || '') ||
            evidence?.requestId !== result.requestId || evidence?.sessionId !== result.sessionId ||
            (value.requestId !== undefined && value.requestId !== result.requestId) ||
            (value.sessionId !== undefined && value.sessionId !== result.sessionId) ||
            hashes.some(key => !SHA.test(evidence?.[key] || ''))) throw Error('GPU_INFERENCE_AUDIT_EVIDENCE_INCOMPLETE');
      }
      reply(res, 200, result);
    } catch (error) {
      const code = /^[A-Z0-9_]+$/.test(error?.code || error?.message || '') ? (error.code || error.message) : 'GPU_INFERENCE_FAILED';
      if (!res.destroyed) reply(res, error.httpStatus || 503, {code, dispatchAccepted: false});
    } finally { pending.delete(controller); req.removeListener('aborted', cancel); res.removeListener('close', cancel); }
    return true;
  }});
}
