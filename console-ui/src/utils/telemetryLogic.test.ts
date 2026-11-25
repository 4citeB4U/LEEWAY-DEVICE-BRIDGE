import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendLiveTelemetryPoint,
  buildInitialTelemetrySeries,
  computeAggregateMetrics,
  filterDevices,
  getSeriesThroughputForPlatform,
} from './telemetryLogic';
import { INITIAL_DEVICES } from '../data/bridgeData';

test('buildInitialTelemetrySeries returns requested count with valid numeric ranges', () => {
  const series = buildInitialTelemetrySeries('15m', 24);
  assert.equal(series.length, 24);
  for (const pt of series) {
    assert.ok(pt.throughputMbps > 0);
    assert.ok(pt.latencyMs >= 2.0);
    assert.ok(pt.packetIntegrityPct >= 98 && pt.packetIntegrityPct <= 100);
    assert.ok(pt.label.includes(':'));
  }
});

test('appendLiveTelemetryPoint maintains window length and applies latency override', () => {
  const initial = buildInitialTelemetrySeries('15m', 20);
  const next = appendLiveTelemetryPoint(initial, 1, 5.4);
  assert.equal(next.length, 20);
  assert.equal(next[next.length - 1].latencyMs, 5.4);
  assert.notEqual(next[0].timestamp, initial[0].timestamp);
});

test('filterDevices filters accurately by platform, group, and query', () => {
  const appleOnly = filterDevices(INITIAL_DEVICES, { platform: 'apple' });
  assert.equal(appleOnly.length, 3);
  assert.ok(appleOnly.every((d) => d.platform === 'apple'));

  const mobileGroup = filterDevices(INITIAL_DEVICES, { group: 'mobile' });
  assert.equal(mobileGroup.length, 2);

  const queryMatch = filterDevices(INITIAL_DEVICES, { query: 'iLoader' });
  assert.equal(queryMatch.length, 1);
  assert.equal(queryMatch[0].id, 'dev-iphone-16');
});

test('computeAggregateMetrics calculates totals, averages, and status counts', () => {
  const metrics = computeAggregateMetrics(INITIAL_DEVICES);
  assert.equal(metrics.verifiedCount, 4);
  assert.equal(metrics.warningCount, 2);
  assert.equal(metrics.unverifiedCount, 1);
  assert.ok(metrics.totalThroughputMbps > 1500);
  assert.ok(metrics.avgLatencyMs > 0 && metrics.avgLatencyMs < 20);
  assert.ok(metrics.healthScorePct > 60 && metrics.healthScorePct <= 100);

  const emptyMetrics = computeAggregateMetrics([]);
  assert.equal(emptyMetrics.totalThroughputMbps, 0);
  assert.equal(emptyMetrics.healthScorePct, 0);
});

test('getSeriesThroughputForPlatform returns lane-specific metrics', () => {
  const [sample] = buildInitialTelemetrySeries('1h', 1);
  assert.equal(getSeriesThroughputForPlatform(sample, 'all'), sample.throughputMbps);
  assert.equal(getSeriesThroughputForPlatform(sample, 'apple'), sample.appleMbps);
  assert.equal(getSeriesThroughputForPlatform(sample, 'android'), sample.androidMbps);
  assert.equal(getSeriesThroughputForPlatform(sample, 'windows'), sample.windowsMbps);
  assert.equal(getSeriesThroughputForPlatform(sample, 'linux'), sample.linuxMbps);
});
