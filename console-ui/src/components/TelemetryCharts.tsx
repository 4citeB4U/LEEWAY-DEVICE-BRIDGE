import React, { useMemo, useState } from 'react';
import {
  Activity,
  Cpu,
  Gauge,
  Radio,
  RefreshCw,
} from 'lucide-react';
import {
  PlatformKey,
  PlatformLane,
  TelemetryPoint,
  TimeWindow,
} from '../data/bridgeData';
import {
  BrowserProbeResult,
  getSeriesThroughputForPlatform,
} from '../utils/telemetryLogic';
import { StatusIndicator } from './StatusBadge';

interface TelemetryChartsProps {
  series: TelemetryPoint[];
  selectedPlatform: PlatformKey | 'all';
  onSelectPlatform: (p: PlatformKey | 'all') => void;
  timeWindow: TimeWindow;
  onChangeTimeWindow: (w: TimeWindow) => void;
  platformLanes: PlatformLane[];
  browserProbe: BrowserProbeResult | null;
  onMeasureBrowser: () => void;
  unverifiedPosture: boolean;
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({
  series,
  selectedPlatform,
  onSelectPlatform,
  timeWindow,
  onChangeTimeWindow,
  platformLanes,
  browserProbe,
  onMeasureBrowser,
  unverifiedPosture,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const chartDimensions = { width: 640, height: 220, padL: 44, padR: 40, padT: 18, padB: 28 };
  const plotW = chartDimensions.width - chartDimensions.padL - chartDimensions.padR;
  const plotH = chartDimensions.height - chartDimensions.padT - chartDimensions.padB;

  const {
    throughputPath,
    areaPath,
    latencyPath,
    maxThroughput,
    minThroughput,
    maxLatency,
    pointsCoords,
  } = useMemo(() => {
    if (series.length === 0) {
      return {
        throughputPath: '',
        areaPath: '',
        latencyPath: '',
        maxThroughput: 1000,
        minThroughput: 0,
        maxLatency: 20,
        pointsCoords: [] as Array<{ x: number; yT: number; yL: number; pt: TelemetryPoint; tp: number }>,
      };
    }

    const tVals = series.map((pt) => getSeriesThroughputForPlatform(pt, selectedPlatform));
    const lVals = series.map((pt) => pt.latencyMs);

    const rawMaxT = Math.max(...tVals);
    const rawMinT = Math.min(...tVals);
    const maxT = Math.ceil((rawMaxT * 1.12) / 50) * 50;
    const minT = Math.max(0, Math.floor((rawMinT * 0.85) / 50) * 50);
    const maxL = Math.max(15, Math.ceil(Math.max(...lVals) * 1.25));

    const coords = series.map((pt, idx) => {
      const tp = getSeriesThroughputForPlatform(pt, selectedPlatform);
      const x =
        chartDimensions.padL +
        (series.length > 1 ? (idx / (series.length - 1)) * plotW : plotW / 2);
      const tNorm = maxT > minT ? (tp - minT) / (maxT - minT) : 0.5;
      const lNorm = pt.latencyMs / maxL;
      const yT = chartDimensions.padT + plotH - tNorm * plotH;
      const yL = chartDimensions.padT + plotH - lNorm * plotH;
      return { x, yT, yL, pt, tp };
    });

    const tLine = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.yT.toFixed(1)}`)
      .join(' ');
    const lLine = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.yL.toFixed(1)}`)
      .join(' ');
    const area =
      coords.length > 0
        ? `${tLine} L ${coords[coords.length - 1].x.toFixed(1)} ${(chartDimensions.padT + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(chartDimensions.padT + plotH).toFixed(1)} Z`
        : '';

    return {
      throughputPath: tLine,
      areaPath: area,
      latencyPath: lLine,
      maxThroughput: maxT,
      minThroughput: minT,
      maxLatency: maxL,
      pointsCoords: coords,
    };
  }, [series, selectedPlatform, plotW, plotH, chartDimensions.padL, chartDimensions.padT]);

  const activePoint =
    hoverIdx !== null && pointsCoords[hoverIdx]
      ? pointsCoords[hoverIdx]
      : pointsCoords[pointsCoords.length - 1];

  const maxLaneRate = useMemo(
    () => Math.max(...platformLanes.map((l) => l.metrics.syncRateMbps), 1),
    [platformLanes],
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Real-Time Dual-Series Interactive Trend Chart */}
      <section className="rounded-xl border border-slate-800 bg-[#0B121B] p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Real-Time Sync Throughput &amp; Latency
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hover chart to inspect cross-platform packet delivery &amp; latency trends
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {(['15m', '1h', '24h'] as TimeWindow[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onChangeTimeWindow(w)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  timeWindow === w
                    ? 'bg-slate-800 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Lane Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-1 flex-wrap">
            {(['all', 'apple', 'android', 'windows', 'linux'] as Array<PlatformKey | 'all'>).map(
              (lane) => (
                <button
                  key={lane}
                  type="button"
                  onClick={() => onSelectPlatform(lane)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedPlatform === lane
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {lane === 'all' ? 'All Lanes' : lane}
                </button>
              ),
            )}
          </div>

          {activePoint && (
            <div className="flex items-center gap-3 text-xs tabular-nums font-mono">
              <span className="text-cyan-300">
                {activePoint.tp} MB/s
              </span>
              <span className="text-amber-300">
                {activePoint.pt.latencyMs.toFixed(1)} ms
              </span>
              <span className="text-emerald-400 hidden sm:inline">
                {activePoint.pt.packetIntegrityPct}% ok
              </span>
              <span className="text-slate-500">{activePoint.pt.label}</span>
            </div>
          )}
        </div>

        {/* Interactive SVG Chart */}
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
            className="w-full h-[195px] overflow-visible select-none"
            role="img"
            aria-label="Real-time throughput and latency trend chart"
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="throughputAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = chartDimensions.padT + plotH * (1 - t);
              const tpVal = Math.round(minThroughput + (maxThroughput - minThroughput) * t);
              const latVal = Math.round(maxLatency * t);
              return (
                <g key={t}>
                  <line
                    x1={chartDimensions.padL}
                    x2={chartDimensions.width - chartDimensions.padR}
                    y1={y}
                    y2={y}
                    stroke="rgba(148, 163, 184, 0.12)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={chartDimensions.padL - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-500 text-[10px] font-mono tabular-nums"
                  >
                    {tpVal}
                  </text>
                  <text
                    x={chartDimensions.width - chartDimensions.padR + 6}
                    y={y + 3}
                    textAnchor="start"
                    className="fill-amber-400/70 text-[10px] font-mono tabular-nums"
                  >
                    {latVal}ms
                  </text>
                </g>
              );
            })}

            {/* Area & Throughput Line */}
            {areaPath && <path d={areaPath} fill="url(#throughputAreaGrad)" />}
            {throughputPath && (
              <path
                d={throughputPath}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2.2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {/* Latency Dashed Line */}
            {latencyPath && (
              <path
                d={latencyPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.8"
                strokeDasharray="4 3"
                strokeLinejoin="round"
              />
            )}

            {/* X-Axis Timestamps */}
            {pointsCoords.map((c, idx) => {
              if (idx % 5 !== 0 && idx !== pointsCoords.length - 1) return null;
              return (
                <text
                  key={c.pt.timestamp + idx}
                  x={c.x}
                  y={chartDimensions.height - 6}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-mono tabular-nums"
                >
                  {c.pt.label}
                </text>
              );
            })}

            {/* Active Hover Crosshair */}
            {activePoint && (
              <g>
                <line
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1={chartDimensions.padT}
                  y2={chartDimensions.padT + plotH}
                  stroke="rgba(34, 211, 238, 0.35)"
                  strokeWidth="1"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.yT}
                  r="4"
                  className="fill-cyan-300 stroke-[#0B121B]"
                  strokeWidth="2"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.yL}
                  r="3.5"
                  className="fill-amber-400 stroke-[#0B121B]"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Invisible Hover Hit Columns */}
            {pointsCoords.map((c, idx) => {
              const colW = plotW / Math.max(1, pointsCoords.length);
              return (
                <rect
                  key={idx}
                  x={c.x - colW / 2}
                  y={chartDimensions.padT}
                  width={colW}
                  height={plotH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIdx(idx)}
                />
              );
            })}
          </svg>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                Throughput (MB/s)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-400 inline-block" />
                Sync Latency (ms)
              </span>
            </div>
            <span className="font-mono text-slate-500">Live 2.5s stream</span>
          </div>
        </div>
      </section>

      {/* OS Lane Sync Distribution + Browser Runtime Diagnostics */}
      <section className="rounded-xl border border-slate-800 bg-[#0B121B] p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              Cross-OS Sync Throughput &amp; Browser Probe
            </h3>
            <button
              type="button"
              onClick={onMeasureBrowser}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 hover:bg-cyan-500/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Measure This Browser
            </button>
          </div>

          <div className="space-y-2.5">
            {platformLanes.map((lane) => {
              const pct = Math.round((lane.metrics.syncRateMbps / maxLaneRate) * 100);
              const barColor =
                lane.status === 'verified'
                  ? 'bg-emerald-500'
                  : lane.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-sky-500';
              const isSelected = selectedPlatform === lane.id;

              return (
                <button
                  key={lane.id}
                  type="button"
                  onClick={() => onSelectPlatform(isSelected ? 'all' : lane.id)}
                  className={`w-full text-left rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/80 ring-1 ring-cyan-500/50'
                      : 'hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-200 capitalize">{lane.id}</span>
                      <StatusIndicator status={lane.status} label={lane.statusLabel} compact />
                    </div>
                    <span className="font-mono tabular-nums text-slate-300">
                      {lane.metrics.syncRateMbps} MB/s · {lane.metrics.avgLatencyMs} ms
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Diagnostics / Runtime Readout */}
        <div className="border-t border-slate-800/80 pt-3 grid grid-cols-3 gap-2">
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg px-2.5 py-2">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-emerald-400" />
              Health
            </div>
            <div className="text-sm font-semibold font-mono tabular-nums text-slate-100 mt-0.5">
              {unverifiedPosture
                ? 'Unverified'
                : browserProbe
                  ? `${browserProbe.healthPct}%`
                  : '98.4%'}
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg px-2.5 py-2">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              Uptime
            </div>
            <div className="text-sm font-semibold font-mono tabular-nums text-slate-100 mt-0.5">
              {unverifiedPosture
                ? 'Not measured'
                : browserProbe
                  ? browserProbe.uptimeLabel
                  : '99.94%'}
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg px-2.5 py-2">
            <div className="text-[11px] text-slate-400">Browser RTT</div>
            <div className="text-sm font-semibold font-mono tabular-nums text-cyan-300 mt-0.5">
              {unverifiedPosture
                ? '—'
                : browserProbe
                  ? `${browserProbe.latencyMs.toFixed(1)} ms`
                  : '4.8 ms'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
