import {createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes} from 'node:crypto';

export const GPU_PREVIEW_CAPABILITY = 'gpu.inference.preview.sealed';
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;

export function validateInferenceRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('GPU_INFERENCE_REQUEST_INVALID');
  const allowed = new Set(['requestId', 'model', 'prompt', 'maxTokens']);
  if (Object.keys(value).some(key => !allowed.has(key))
    || !REQUEST_ID.test(value.requestId || '')
    || !MODEL_ID.test(value.model || '')
    || typeof value.prompt !== 'string' || value.prompt.length < 1 || value.prompt.length > 8192
    || !Number.isSafeInteger(value.maxTokens) || value.maxTokens < 1 || value.maxTokens > 1024) {
    throw Error('GPU_INFERENCE_REQUEST_INVALID');
  }
  return Object.freeze({requestId: value.requestId, model: value.model, prompt: value.prompt, maxTokens: value.maxTokens});
}

export function canonicalInferenceRequest(value) {
  const request = validateInferenceRequest(value);
  return JSON.stringify({requestId: request.requestId, model: request.model, prompt: request.prompt, maxTokens: request.maxTokens});
}

export function inferenceWorkloadHash(value) {
  return createHash('sha256').update(canonicalInferenceRequest(value), 'utf8').digest('hex');
}

function keyFor({token, deviceId}) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 256
    || typeof deviceId !== 'string' || deviceId.length < 8 || deviceId.length > 128) {
    throw Error('GPU_PAIRING_IDENTITY_INVALID');
  }
  return Buffer.from(hkdfSync('sha256', Buffer.from(token, 'utf8'), Buffer.from(deviceId, 'utf8'), Buffer.from('LeeWay-GPU-inference-preview-v1'), 32));
}

function aadFor(id, direction) {
  if (typeof id !== 'string' || !REQUEST_ID.test(id) || !['request', 'response'].includes(direction)) throw Error('GPU_ENVELOPE_CONTEXT_INVALID');
  return Buffer.from(`${GPU_PREVIEW_CAPABILITY}\0${id}\0${direction}`, 'utf8');
}

export function sealInference(value, identity, {direction = 'request', id = value?.requestId} = {}) {
  const request = direction === 'request' ? validateInferenceRequest(value) : value;
  const plaintext = Buffer.from(JSON.stringify(request), 'utf8');
  if (plaintext.length > 32 * 1024) throw Error('GPU_ENVELOPE_TOO_LARGE');
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(identity), nonce);
  cipher.setAAD(aadFor(id, direction));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Object.freeze({version: 1, nonce: nonce.toString('base64url'), ciphertext: ciphertext.toString('base64url'), tag: cipher.getAuthTag().toString('base64url')});
}

export function openInference(envelope, identity, {direction = 'request', id} = {}) {
  if (!envelope || typeof envelope !== 'object' || envelope.version !== 1
    || typeof envelope.nonce !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(envelope.nonce)
    || typeof envelope.tag !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(envelope.tag)
    || typeof envelope.ciphertext !== 'string' || envelope.ciphertext.length < 1 || envelope.ciphertext.length > 48 * 1024
    || !/^[A-Za-z0-9_-]+$/.test(envelope.ciphertext)) throw Error('GPU_ENVELOPE_INVALID');
  if (!['request', 'response'].includes(direction)) throw Error('GPU_ENVELOPE_CONTEXT_INVALID');
  const aad = aadFor(id, direction);
  try {
    const decipher = createDecipheriv('aes-256-gcm', keyFor(identity), Buffer.from(envelope.nonce, 'base64url'));
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64url'));
    const clear = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64url')), decipher.final()]);
    const value = JSON.parse(clear.toString('utf8'));
    return direction === 'request' ? validateInferenceRequest(value) : value;
  } catch (error) {
    if (error?.message === 'GPU_PAIRING_IDENTITY_INVALID' || error?.message === 'GPU_ENVELOPE_CONTEXT_INVALID') throw error;
    throw Error('GPU_ENVELOPE_AUTHENTICATION_FAILED');
  }
}
