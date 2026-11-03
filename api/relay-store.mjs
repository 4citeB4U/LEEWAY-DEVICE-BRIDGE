/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.RELAY.STORE
TAG: LEEWAY.VERCEL.DEVICE.RELAY.REDIS.STATE.V1
WHO: 4citeB4U/LEEWAY-DEVICE-BRIDGE
WHAT: Durable shared state adapter for the canonical WebSocket relay
WHY: Vercel WebSocket clients can land on different function instances
HOW: Store pairing, ownership, pending command metadata and bounded inboxes in Upstash Redis
AUTHORITY: Transport state only. The phone remains the execution and Formula boundary.
*/
import { Redis } from '@upstash/redis';

const KEY_PREFIX = 'leeway:device-relay:v1';
const DEFAULT_TTL_SECONDS = 90;
const PENDING_TTL_SECONDS = 300;
const COMPLETED_TTL_SECONDS = 600;
const INBOX_TTL_SECONDS = 120;

function keyPart(value) {
  return encodeURIComponent(value);
}

function key(kind, deviceId, suffix = '') {
  const base = `${KEY_PREFIX}:${kind}:${keyPart(deviceId)}`;
  return suffix ? `${base}:${suffix}` : base;
}

function redisValue(value) {
  return value == null ? null : String(value);
}

export function createRedisRelayStore({
  url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
  ttlSeconds = DEFAULT_TTL_SECONDS,
} = {}) {
  if (!url || !token) return null;
  const redis = new Redis({ url, token });

  return {
    kind: 'UPSTASH_REDIS_REST',
    durable: true,

    async claimToken(deviceId, tokenHash) {
      const tokenKey = key('token', deviceId);
      const created = await redis.set(tokenKey, tokenHash, { nx: true, ex: ttlSeconds });
      if (created === 'OK' || created === true) return true;
      const existing = redisValue(await redis.get(tokenKey));
      return existing === tokenHash;
    },

    async tokenMatches(deviceId, tokenHash) {
      return redisValue(await redis.get(key('token', deviceId))) === tokenHash;
    },

    async getOwner(deviceId, role) {
      return redisValue(await redis.get(key('owner', deviceId, role)));
    },

    async setOwner(deviceId, role, nodeId) {
      await redis.set(key('owner', deviceId, role), nodeId, { ex: ttlSeconds });
    },

    async removeOwner(deviceId, role, nodeId) {
      const ownerKey = key('owner', deviceId, role);
      const current = redisValue(await redis.get(ownerKey));
      if (current === nodeId) await redis.del(ownerKey);
    },

    async touch(deviceId, role) {
      const ownerKey = key('owner', deviceId, role);
      await redis.expire(ownerKey, ttlSeconds);
      await redis.expire(key('token', deviceId), ttlSeconds);
    },

    async claimPending(deviceId, id, value) {
      const pendingKey = key('pending', deviceId, keyPart(id));
      const created = await redis.set(pendingKey, JSON.stringify(value), {
        nx: true,
        ex: PENDING_TTL_SECONDS,
      });
      return created === 'OK' || created === true;
    },

    async takePending(deviceId, id) {
      const pendingKey = key('pending', deviceId, keyPart(id));
      const value = typeof redis.getdel === 'function'
        ? await redis.getdel(pendingKey)
        : await redis.get(pendingKey);
      if (typeof redis.getdel !== 'function') await redis.del(pendingKey);
      if (!value) return null;
      try {
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        return null;
      }
    },

    async markCompleted(deviceId, id) {
      const completedKey = key('completed', deviceId, keyPart(id));
      const created = await redis.set(completedKey, '1', {
        nx: true,
        ex: COMPLETED_TTL_SECONDS,
      });
      return created === 'OK' || created === true;
    },

    async pushInbox(nodeId, message) {
      const inboxKey = key('inbox', nodeId);
      await redis.rpush(inboxKey, JSON.stringify(message));
      await redis.expire(inboxKey, INBOX_TTL_SECONDS);
    },

    async popInbox(nodeId) {
      const value = await redis.lpop(key('inbox', nodeId));
      if (!value) return null;
      try {
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        return null;
      }
    },
  };
}

