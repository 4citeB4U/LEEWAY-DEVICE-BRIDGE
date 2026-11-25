import {
  DeviceGroupKey,
  DeviceNode,
  PlatformKey,
  TelemetryPoint,
  TimeWindow,
} from '../data/bridgeData';

export interface AggregateMetrics {
  avgLatencyMs: number;
  totalThroughputMbps: number;
  avgUptimePct: number;
  verifiedCount: number;
  warningCount: number;
  unverifiedCount: number;
  totalQueueDepth: number;
  healthScorePct: number;
}

export interface BrowserProbeResult {
  healthPct: number;
  latencyMs: number;
  uptimeLabel: string;
  rendererLabel: string;
  webGpuAvailable: boolean;
  platformHint: string;
  cores: number;
}

/**
 * Generates deterministic initial time-series points for real-time trend charts.
 */
export function buildInitialTelemetrySeries(
  windowSize: TimeWindow,
  pointsCount = 24,
  seedOffset = 0,
): TelemetryPoint[] {
  const stepMinutes = windowSize === '15m' ? 0.65 : windowSize === '1h' ? 2.5 : 60;
  const now = new Date('2026-11-24T04:30:00-08:00').getTime();
  const series: TelemetryPoint[] = [];

  for (let i = pointsCount - 1; i >= 0; i--) {
    const idx = pointsCount - 1 - i + seedOffset;
    const ts = new Date(now - i * stepMinutes * 60 * 1000);
    const waveA = Math.sin(idx * 0.48) * 110 + Math.cos(idx * 0.23) * 65;
    const waveB = Math.cos(idx * 0.37) * 1.9 + Math.sin(idx * 0.71) * 0.8;

    const appleMbps = Math.round(920 + Math.sin(idx * 0.42) * 85);
    const androidMbps = Math.round(220 + Math.cos(idx * 0.51) * 38);
    const windowsMbps = Math.round(330 + Math.sin(idx * 0.31 + 1.1) * 45);
    const linuxMbps = Math.round(620 + Math.cos(idx * 0.29 + 0.7) * 72);

    const throughputMbps = Math.max(
      420,
      Math.round(appleMbps + androidMbps + windowsMbps + linuxMbps + waveA * 0.25),
    );
    const latencyMs = Number(Math.max(2.4, 7.6 + waveB).toFixed(1));
    const packetIntegrityPct = Number(
      Math.min(100, Math.max(98.4, 99.65 + Math.sin(idx * 0.4) * 0.25)).toFixed(2),
    );

    const hours = String(ts.getHours()).padStart(2, '0');
    const mins = String(ts.getMinutes()).padStart(2, '0');

    series.push({
      timestamp: ts.toISOString(),
      label: `${hours}:${mins}`,
      throughputMbps,
      latencyMs,
      packetIntegrityPct,
      appleMbps,
      androidMbps,
      windowsMbps,
      linuxMbps,
    });
  }

  return series;
}

/**
 * Appends a fresh real-time telemetry point while keeping series length fixed.
 */
export function appendLiveTelemetryPoint(
  series: TelemetryPoint[],
  tickIndex: number,
  overrideLatencyMs?: number,
): TelemetryPoint[] {
  const prev = series[series.length - 1];
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');

  const jitterA = Math.sin(tickIndex * 0.7) * 42 + Math.cos(tickIndex * 1.1) * 24;
  const appleMbps = Math.max(500, Math.round((prev?.appleMbps ?? 940) + Math.sin(tickIndex * 0.6) * 28));
  const androidMbps = Math.max(120, Math.round((prev?.androidMbps ?? 215) + Math.cos(tickIndex * 0.8) * 16));
  const windowsMbps = Math.max(180, Math.round((prev?.windowsMbps ?? 335) + Math.sin(tickIndex * 0.5) * 22));
  const linuxMbps = Math.max(320, Math.round((prev?.linuxMbps ?? 635) + Math.cos(tickIndex * 0.45) * 30));

  const throughputMbps = Math.max(
    600,
    Math.round(appleMbps + androidMbps + windowsMbps + linuxMbps + jitterA * 0.15),
  );
  const baseLatency = (prev?.latencyMs ?? 7.4) + Math.sin(tickIndex * 0.85) * 0.7;
  const latencyMs = Number(
    Math.max(2.1, Math.min(22, overrideLatencyMs ?? baseLatency)).toFixed(1),
  );
  const packetIntegrityPct = Number(
    Math.min(100, Math.max(98.5, 99.7 + Math.cos(tickIndex * 0.5) * 0.22)).toFixed(2),
  );

  const nextPoint: TelemetryPoint = {
    timestamp: now.toISOString(),
    label: `${hours}:${mins}:${secs}`,
    throughputMbps,
    latencyMs,
    packetIntegrityPct,
    appleMbps,
    androidMbps,
    windowsMbps,
    linuxMbps,
  };

  return [...series.slice(1), nextPoint];
}

/**
 * Filters devices by platform, device group, and free-text query.
 */
export function filterDevices(
  devices: DeviceNode[],
  options: {
    platform?: PlatformKey | 'all';
    group?: DeviceGroupKey | 'all';
    query?: string;
  },
): DeviceNode[] {
  const normalizedQuery = (options.query ?? '').trim().toLowerCase();
  return devices.filter((device) => {
    if (options.platform && options.platform !== 'all' && device.platform !== options.platform) {
      return false;
    }
    if (options.group && options.group !== 'all' && device.group !== options.group) {
      return false;
    }
    if (normalizedQuery) {
      const haystack = `${device.name} ${device.osVersion} ${device.groupLabel} ${device.transport} ${device.statusLabel}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Computes aggregate health, latency, throughput, and status counts for a slice of devices.
 */
export function computeAggregateMetrics(devices: DeviceNode[]): AggregateMetrics {
  if (devices.length === 0) {
    return {
      avgLatencyMs: 0,
      totalThroughputMbps: 0,
      avgUptimePct: 0,
      verifiedCount: 0,
      warningCount: 0,
      unverifiedCount: 0,
      totalQueueDepth: 0,
      healthScorePct: 0,
    };
  }

  let latencySum = 0;
  let throughputSum = 0;
  let uptimeSum = 0;
  let verifiedCount = 0;
  let warningCount = 0;
  let unverifiedCount = 0;
  let totalQueueDepth = 0;

  for (const d of devices) {
    latencySum += d.latencyMs;
    throughputSum += d.throughputMbps;
    uptimeSum += d.uptimePct;
    totalQueueDepth += d.syncQueueDepth;
    if (d.status === 'verified') verifiedCount++;
    else if (d.status === 'warning') warningCount++;
    else unverifiedCount++;
  }

  const count = devices.length;
  const avgLatencyMs = Number((latencySum / count).toFixed(1));
  const avgUptimePct = Number((uptimeSum / count).toFixed(2));
  const healthScorePct = Math.round(
    ((verifiedCount * 1 + warningCount * 0.72 + unverifiedCount * 0.45) / count) * 100,
  );

  return {
    avgLatencyMs,
    totalThroughputMbps: throughputSum,
    avgUptimePct,
    verifiedCount,
    warningCount,
    unverifiedCount,
    totalQueueDepth,
    healthScorePct,
  };
}

/**
 * Returns the selected platform series value for a telemetry point.
 */
export function getSeriesThroughputForPlatform(
  point: TelemetryPoint,
  platform: PlatformKey | 'all',
): number {
  switch (platform) {
    case 'apple':
      return point.appleMbps;
    case 'android':
      return point.androidMbps;
    case 'windows':
      return point.windowsMbps;
    case 'linux':
      return point.linuxMbps;
    default:
      return point.throughputMbps;
  }
}

/**
 * Formats an OS/platform key into a human-readable label.
 */
export function formatPlatformLabel(platform: PlatformKey): string {
  switch (platform) {
    case 'apple':
      return 'Apple';
    case 'android':
      return 'Android';
    case 'windows':
      return 'Windows';
    case 'linux':
      return 'Linux';
  }
}
