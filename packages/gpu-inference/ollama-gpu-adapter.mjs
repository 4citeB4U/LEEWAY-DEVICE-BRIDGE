const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const PROMPT_LIMIT = 8192;

function fullyResidentInVram(model) {
  const size = Number(model?.size);
  const sizeVram = Number(model?.size_vram);
  return Number.isSafeInteger(size) && size > 0
    && Number.isSafeInteger(sizeVram) && sizeVram >= size;
}

export class OllamaGpuAdapter {
  constructor({baseUrl = 'http://127.0.0.1:21435', models = ['qwen3.5:4b'], fetchImpl = fetch, timeoutMs = 180_000, deviceName = 'NVIDIA GPU'} = {}) {
    const url = new URL(baseUrl);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw Error('OLLAMA_LOOPBACK_REQUIRED');
    if (!Array.isArray(models) || models.length < 1 || models.length > 16 || models.some(x => typeof x !== 'string' || !MODEL_ID.test(x))) throw Error('OLLAMA_MODEL_ALLOWLIST_INVALID');
    Object.assign(this, {baseUrl: url.origin, models: new Set(models), fetchImpl, timeoutMs, deviceName, mode: 'LOCAL_GPU_PREVIEW'});
  }

  async request(path, body) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : {'content-type': 'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw Error('OLLAMA_BACKEND_UNAVAILABLE');
    return response.json();
  }

  async status() {
    try {
      const tags = await this.request('/api/tags');
      const ps = await this.request('/api/ps');
      const available = (tags.models || []).filter(x => this.models.has(x.name)).map(x => x.name);
      const resident = (ps.models || []).filter(x => this.models.has(x.name) && fullyResidentInVram(x))
        .map(x => ({model: x.name, modelBytes: Number(x.size), vramBytes: Number(x.size_vram), residency: 'FULL_MODEL_IN_VRAM'}));
      return {available, resident, backend: 'Ollama CUDA preview', availableOk: available.length > 0};
    } catch {
      return {available: [], resident: [], backend: 'Ollama CUDA preview', availableOk: false};
    }
  }

  async infer(request) {
    if (!this.models.has(request.model)) throw Error('GPU_MODEL_NOT_ALLOWLISTED');
    if (typeof request.prompt !== 'string' || request.prompt.length < 1 || request.prompt.length > PROMPT_LIMIT
      || !Number.isInteger(request.maxTokens) || request.maxTokens < 1 || request.maxTokens > 1024) throw Error('GPU_INFERENCE_REQUEST_INVALID');
    const started = Date.now();
    let modelState = await this.request('/api/ps');
    let residentModel = (modelState.models || []).find(x => x.name === request.model);
    if (!fullyResidentInVram(residentModel)) {
      // Ollama's empty-prompt load path prepares the model without dispatching the user's prompt.
      await this.request('/api/generate', {
        model: request.model,
        prompt: '',
        stream: false,
        keep_alive: '10m',
        options: {num_gpu: 999, num_predict: 0},
      });
      modelState = await this.request('/api/ps');
      residentModel = (modelState.models || []).find(x => x.name === request.model);
    }
    if (!fullyResidentInVram(residentModel)) throw Error('GPU_FULL_VRAM_RESIDENCY_REQUIRED');

    const result = await this.request('/api/chat', {
      model: request.model,
      messages: [{role: 'user', content: request.prompt}],
      stream: false,
      think: false,
      keep_alive: '10m',
      options: {num_gpu: 999, num_predict: request.maxTokens},
    });
    const resident = await this.request('/api/ps');
    const model = (resident.models || []).find(x => x.name === request.model);
    if (!fullyResidentInVram(model)) throw Error('GPU_FULL_VRAM_RESIDENCY_LOST');
    const answer = result?.message?.content;
    if (typeof answer !== 'string' || answer.trim().length < 1 || answer.length > 16_384) throw Error('GPU_INFERENCE_RESPONSE_INVALID');
    return {
      requestId: request.requestId,
      model: request.model,
      response: answer,
      backend: 'Ollama CUDA preview',
      device: `${this.deviceName} (full model VRAM residency verified)`,
      modelBytes: Number(model.size),
      vramBytes: Number(model.size_vram),
      gpuResidency: 'FULL_MODEL_IN_VRAM',
      elapsedMs: Date.now() - started,
      authority: 'UNADMITTED_PREVIEW',
    };
  }
}
