/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE
TAG: LEEWAY.DEVICE.BRIDGE.VISION_PROVIDER
5WH:
  WHAT = Canonical Vision Sensory Provider for Leeway Device Bridge
  WHY = Enable any authenticated, authorized LLM connected via Device Bridge to discover and stream from physical optical sensors without simulated telemetry
  WHO = Leeway Industries / Creator-authorized Agent Lee runtimes
  WHERE = providers/vision/index.mjs
  WHEN = 2026-11-07
  HOW = Bridges the verified VisionBridgeConnector into Device Bridge capability discovery and execution routes
LICENSE: Internal LeeWay governance.
*/

function requireNonEmpty(val, err) {
  if (typeof val !== 'string' || !val.trim()) {
    throw new Error(err);
  }
  return val.trim();
}

export class VisionSensoryProvider {
  /**
   * @param {Object} options
   * @param {string} options.bridgeSessionId
   * @param {string} options.ownerId
   * @param {Object} [options.authorityValidator]
   * @param {Object} [options.connector]
   */
  constructor(options = {}) {
    this.providerId = 'leeway-vision-sensory';
    this.class = 'sensory';
    this.status = 'AVAILABLE';
    this.bridgeSessionId = requireNonEmpty(options.bridgeSessionId, 'BRIDGE_SESSION_ID_REQUIRED');
    this.ownerId = requireNonEmpty(options.ownerId, 'OWNER_ID_REQUIRED');
    this.authorityValidator = options.authorityValidator || null;
    this.connector = options.connector || null;
  }

  /**
   * Bind an external verified VisionBridgeConnector.
   */
  bindConnector(connector) {
    if (!connector || typeof connector !== 'object') {
      throw new Error('INVALID_CONNECTOR');
    }
    this.connector = connector;
    this.status = 'ACTIVE';
  }

  /**
   * Enumerate provider capabilities adhering to contracts/provider.schema.json.
   */
  describe() {
    return {
      providerId: this.providerId,
      class: this.class,
      status: this.status,
      transports: ['webrtc', 'loopback', 'direct-show'],
      capabilities: [
        'vision.sources.list',
        'vision.session.start',
        'vision.frames.observe',
        'vision.scene.describe',
        'vision.objects.detect',
        'vision.session.stop'
      ],
      requiresPhysicalAdapter: true,
      lastVerifiedAt: null
    };
  }

  /**
   * Health probe adhering to canonical bridge provider contract.
   */
  async health() {
    const isBound = this.connector !== null;
    return {
      providerId: this.providerId,
      ok: true,
      statusCode: 200,
      path: '/health',
      body: {
        healthy: true,
        connectorBound: isBound,
        status: isBound ? 'ACTIVE' : 'AVAILABLE'
      },
      authority: 'LEEWAY_VISION_SENSORY_PROVIDER'
    };
  }

  /**
   * Execute capability routes requested by an authenticated LLM.
   */
  async execute(route, args = {}) {
    if (!this.connector) {
      throw new Error('VISION_CONNECTOR_NOT_BOUND: Sensory connector is not bound');
    }

    const clientId = requireNonEmpty(args.clientId, 'CLIENT_ID_REQUIRED');

    switch (route) {
      case 'vision.sources.list': {
        const sources = this.connector.listSources(clientId);
        return {
          ok: true,
          route,
          sources,
          capabilities: this.connector.getCapabilities(clientId)
        };
      }
      case 'vision.session.start': {
        const deviceId = requireNonEmpty(args.deviceId, 'DEVICE_ID_REQUIRED');
        const physicalSensorId = requireNonEmpty(args.physicalSensorId, 'SENSOR_ID_REQUIRED');
        const session = this.connector.startSession(clientId, { deviceId, physicalSensorId });
        return { ok: true, route, session };
      }
      case 'vision.frames.observe': {
        const sessionId = requireNonEmpty(args.sessionId, 'SESSION_ID_REQUIRED');
        const frame = this.connector.observeFrame(clientId, sessionId);
        return { ok: true, route, frame };
      }
      case 'vision.session.stop': {
        const sessionId = requireNonEmpty(args.sessionId, 'SESSION_ID_REQUIRED');
        const result = this.connector.stopSession(clientId, sessionId);
        return { ok: true, route, ...result };
      }
      default:
        throw new Error(`UNSUPPORTED_VISION_ROUTE: Route ${route} is not implemented`);
    }
  }
}
