import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Cpu,
  Globe,
  Info,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  ActivityLogEntry,
  CONTRACT_DOCUMENTS,
  ContractDocument,
  DeviceControlSpec,
  DeviceGroupKey,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_DEVICES,
  INITIAL_WORKFLOWS,
  PLATFORM_LANES,
  PlatformKey,
  TelemetryPoint,
  TimeWindow,
  WorkflowRun,
} from './data/bridgeData';
import {
  appendLiveTelemetryPoint,
  BrowserProbeResult,
  buildInitialTelemetrySeries,
  computeAggregateMetrics,
  filterDevices,
} from './utils/telemetryLogic';
import { DeviceBridge3D } from './components/DeviceBridge3D';
import { TelemetryCharts } from './components/TelemetryCharts';
import { PlatformWorkstations } from './components/PlatformWorkstations';
import { OperationsMatrix } from './components/OperationsMatrix';
import { ContractDrawer } from './components/ContractDrawer';
import { StatusIndicator } from './components/StatusBadge';
import { VirtualTabletPreview } from './components/VirtualTabletPreview';
import { AboutBridgeModal } from './components/AboutBridgeModal';
import { OnboardingGate, CustomerWorkspace, LeeWayWorkspaceHeader } from './components/OnboardingGate';
import { OnboardingPage } from './components/OnboardingPage';
import { LeeWayFooterBrand, LeeWayLoadingScreen } from './components/LeeWayBrand';
import { ContactSection } from './components/ContactSection';
import { useLeeWaySession } from './hooks/useLeeWaySession';

export default function App() {
  const session = useLeeWaySession();
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<DeviceGroupKey | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('15m');
  const [unverifiedPosture, setUnverifiedPosture] = useState(true);

  const [telemetrySeries, setTelemetrySeries] = useState<TelemetryPoint[]>(() =>
    buildInitialTelemetrySeries('15m', 24),
  );
  const [tickCounter, setTickCounter] = useState(1);
  const [syncPulseNonce, setSyncPulseNonce] = useState(0);

  const [devices] = useState(INITIAL_DEVICES);
  const [workflows, setWorkflows] = useState<WorkflowRun[]>(INITIAL_WORKFLOWS);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(INITIAL_ACTIVITY_LOGS);
  const [browserProbe, setBrowserProbe] = useState<BrowserProbeResult | null>(null);
  const [activeContract, setActiveContract] = useState<ContractDocument | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const appendLog = useCallback(
    (message: string, level: ActivityLogEntry['level'], source: string) => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setActivityLogs((prev) => [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          time: timeStr,
          message,
          level,
          source,
        },
        ...prev.slice(0, 29),
      ]);
    },
    [],
  );

  // Real-time streaming trend update every 2.5s
  useEffect(() => {
    const interval = window.setInterval(() => {
      setTickCounter((c) => {
        const nextIdx = c + 1;
        setTelemetrySeries((prev) => appendLiveTelemetryPoint(prev, nextIdx));
        return nextIdx;
      });
    }, 2500);
    return () => window.clearInterval(interval);
  }, []);

  const handleChangeTimeWindow = (w: TimeWindow) => {
    setTimeWindow(w);
    setTelemetrySeries(buildInitialTelemetrySeries(w, 24, tickCounter));
    appendLog(`Switched real-time telemetry window to ${w}`, 'info', 'Telemetry');
  };

  const filteredDevices = useMemo(
    () =>
      filterDevices(devices, {
        platform: selectedPlatform,
        group: selectedGroup,
        query: searchQuery,
      }),
    [devices, selectedPlatform, selectedGroup, searchQuery],
  );

  const aggregate = useMemo(() => computeAggregateMetrics(filteredDevices), [filteredDevices]);

  const runBrowserProbe = useCallback(
    (sourceLabel = 'Browser Probe') => {
      const t0 = performance.now();
      let rendererLabel = 'Canvas 2D / Standard';
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (gl) {
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          const raw = ext
            ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER);
          rendererLabel = String(raw || 'WebGL2 Active').slice(0, 42);
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
      } catch {
        rendererLabel = 'WebGL Restricted';
      }
      const elapsedMs = Number(Math.max(1.8, performance.now() - t0 + 2.4).toFixed(1));
      const webGpuAvailable = 'gpu' in navigator;
      const cores = navigator.hardwareConcurrency || 4;
      const probe: BrowserProbeResult = {
        healthPct: 0,
        latencyMs: elapsedMs,
        uptimeLabel: 'Unverified',
        rendererLabel,
        webGpuAvailable,
        platformHint: navigator.platform || 'Cross-Platform Web',
        cores,
      };
      setBrowserProbe(probe);
      setSyncPulseNonce((n) => n + 1);
      setTelemetrySeries((prev) => appendLiveTelemetryPoint(prev, tickCounter + 1, elapsedMs));
      appendLog(
        `Browser diagnostics completed (${elapsedMs} ms · ${cores} cores · WebGPU ${
          webGpuAvailable ? 'exposed' : 'fallback'
        })`,
        'success',
        sourceLabel,
      );
    },
    [appendLog, tickCounter],
  );

  const handleExecuteControl = (control: DeviceControlSpec) => {
    setSyncPulseNonce((n) => n + 1);
    appendLog(
      `Execution not connected: "${control.label}" (${control.permissionScope}) requires the original Runtime and a verified receipt`,
      'warning',
      'Device Controls',
    );
  };

  const handleRefreshWorkflows = () => {
    setWorkflows((prev) =>
      prev.map((w, idx) =>
        idx === 0
          ? {
              ...w,
              status: w.status === 'in_progress' ? 'success' : 'in_progress',
              statusText: w.status === 'in_progress' ? 'completed / success' : 'in_progress',
              updatedAt: 'Just now',
            }
          : w,
      ),
    );
    appendLog('Sample workflow data only — no live CI query performed', 'warning', 'CI Telemetry');
  };

  const handleInspectContract = (docId: string) => {
    const found = CONTRACT_DOCUMENTS.find((d) => d.id === docId);
    if (found) setActiveContract(found);
  };

  // SECURITY FLOW: every entry shows loading, then the sign-in gate. A verified
  // identity must complete the separate onboarding page before any workspace,
  // download or native action is reachable.
  if (session.status === 'checking') {
    return <LeeWayLoadingScreen />;
  }
  if (session.status !== 'verified') {
    return <OnboardingGate status={session.status} onSignIn={(kind) => { void session.signIn(kind); }} />;
  }
  if (!session.onboarded) {
    return (
      <OnboardingPage
        role={session.role ?? 'customer'}
        displayName={session.displayName}
        onComplete={(name) => session.completeOnboarding(name)}
        onSignOut={session.signOut}
      />
    );
  }
  // Never send a customer into the Creator/fleet operations console.
  if (session.role !== 'creator') {
    return <CustomerWorkspace />;
  }

  return (
    <div className="min-h-screen bg-[#060B11] text-slate-100 flex flex-col">
      <div className="border-b border-amber-700/50 bg-amber-950/30 px-5 py-2 text-center text-xs font-semibold text-amber-200" role="status">UI demonstration only — sample fleet telemetry and device actions are not connected to authoritative Runtime evidence.</div>
      {/* Top Bar Contract: 3 Zones (LeeWay Industries mark — Nav Links — 1 Primary Action) */}
      <LeeWayWorkspaceHeader>
        <div className="flex-1 flex items-center justify-between gap-8">
          {/* Zone 2: Concise single-line navigation links */}
          <nav
            aria-label="Dashboard sections"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400"
          >
            <a
              href="#bridge"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Digital Bridge
            </a>
            <a
              href="#virtual-tablet"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Agentic Universal O.S.
            </a>
            <a
              href="#platforms"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Workstations
            </a>
            <a
              href="#operations"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Workflows
            </a>
            <a
              href="#contact"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Contact Us
            </a>
          </nav>

          {/* Zone 3: About Bridge Guide + Controls button & compact Diagnostics trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/40 hover:bg-slate-800 text-cyan-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              About Bridge
            </button>
            <button
              type="button"
              onClick={() => runBrowserProbe('Diagnostics')}
              aria-label="Run Diagnostics"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Zap className="w-3 h-3" />
              Diagnostics
            </button>
          </div>
        </div>
      </LeeWayWorkspaceHeader>

      {/* Main Single-Screen Dashboard */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Top Title + Color-Coded Status Summary Strip */}
        <section id="bridge" className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white [text-wrap:balance]">
                One bridge. Four device lanes.
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Device-agnostic cross-platform synchronization across Apple, Android, Windows,
                Linux, and Edge systems with real-time trend telemetry and governed execution.
              </p>
            </div>

            {/* Posture Toggle: Fleet Telemetry vs Observed != Verified */}
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <div
                className="inline-flex items-center bg-[#0B121B] border border-slate-800 rounded-lg p-1"
                role="group"
                aria-label="Authorization posture mode"
              >
                <button
                  type="button"
                  onClick={() => {
                    setUnverifiedPosture(true);
                    appendLog('Verified fleet telemetry is not connected to live Runtime evidence', 'warning', 'Posture');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    !unverifiedPosture
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Fleet Telemetry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUnverifiedPosture(true);
                    appendLog(
                      'Switched to Pre-Auth Discovery posture (observed != verified)',
                      'warning',
                      'Posture',
                    );
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    unverifiedPosture
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Pre-Auth Discovery
                </button>
              </div>
            </div>
          </div>

          {/* 6-Column Unified KPI & Qualification Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-xl border border-slate-800 bg-[#0B121B] px-3.5 py-3">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                Pages
              </div>
              <div className="mt-1">
                <StatusIndicator status="verified" label="LIVE" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B121B] px-3.5 py-3">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Discovery
              </div>
              <div className="mt-1">
                <StatusIndicator
                  status={unverifiedPosture ? 'warning' : 'verified'}
                  label={unverifiedPosture ? 'UNVERIFIED' : 'READY'}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B121B] px-3.5 py-3">
              <div className="text-[11px] text-slate-400">Apple Package</div>
              <div className="mt-1">
                <StatusIndicator status="verified" label="QUALIFIED" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B121B] px-3.5 py-3">
              <div className="text-[11px] text-slate-400">Android Native</div>
              <div className="mt-1">
                <StatusIndicator status="warning" label="RC1 · INSTALL REQ" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B121B] px-3.5 py-3">
              <div className="text-[11px] text-slate-400">Aggregate Sync</div>
              <div className="text-base font-semibold font-mono tabular-nums text-cyan-300 mt-0.5">
                {unverifiedPosture ? '—' : `${aggregate.totalThroughputMbps} MB/s`}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B121B] px-3.5 py-3">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-slate-400" />
                Avg Latency
              </div>
              <div className="text-base font-semibold font-mono tabular-nums text-emerald-400 mt-0.5">
                {unverifiedPosture ? '—' : `${aggregate.avgLatencyMs} ms`}
              </div>
            </div>
          </div>

          {/* Hero Split: Interactive 3D Digital Bridge (7 cols) + Real-Time Trend Charts (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div className="lg:col-span-7">
              <DeviceBridge3D
                selectedGroup={selectedGroup}
                selectedPlatform={selectedPlatform}
                onSelectGroup={(grp) => {
                  setSelectedGroup(grp);
                  appendLog(
                    grp === 'all'
                      ? 'Cleared 3D bridge node filter (viewing all lanes)'
                      : `Isolated 3D Digital Bridge node: ${grp.toUpperCase()}`,
                    'info',
                    '3D Bridge',
                  );
                }}
                unverifiedPosture={unverifiedPosture}
                syncPulseNonce={syncPulseNonce}
                avgLatencyMs={aggregate.avgLatencyMs || 7.5}
              />
            </div>

            <div className="lg:col-span-5">
              <TelemetryCharts
                series={telemetrySeries}
                selectedPlatform={selectedPlatform}
                onSelectPlatform={(p) => {
                  setSelectedPlatform(p);
                  appendLog(
                    p === 'all'
                      ? 'Showing aggregate cross-OS telemetry'
                      : `Filtered real-time trends to ${p.toUpperCase()} lane`,
                    'info',
                    'Telemetry',
                  );
                }}
                timeWindow={timeWindow}
                onChangeTimeWindow={handleChangeTimeWindow}
                platformLanes={PLATFORM_LANES}
                browserProbe={browserProbe}
                onMeasureBrowser={() => runBrowserProbe('Browser Observation')}
                unverifiedPosture={unverifiedPosture}
              />
            </div>
          </div>
        </section>

        {/* Live GitHub Pages Preview: LeeWay Agent Virtual Tablet */}
        <VirtualTabletPreview
          onActionLog={appendLog}
          onFocusTabletBridge={() => {
            setSelectedGroup('tablet');
            setSyncPulseNonce((n) => n + 1);
            appendLog(
              'Focused Tablet node on 3D Digital Bridge for Agentic Universal O.S. sync',
              'success',
              'Agentic Universal O.S.',
            );
            document.getElementById('bridge')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Cross-Platform Workstations & OS Evidence */}
        <PlatformWorkstations
          lanes={PLATFORM_LANES}
          selectedPlatform={selectedPlatform}
          onSelectPlatform={(p) => setSelectedPlatform(p)}
          onActionLog={appendLog}
          onInspectContract={handleInspectContract}
          onRunAppleBrowserCheck={() => runBrowserProbe('Apple Browser Observation')}
        />

        {/* Device Inventory, GitHub Actions, Automation Providers & Activity Logs */}
        <OperationsMatrix
          devices={filteredDevices}
          selectedGroup={selectedGroup}
          selectedPlatform={selectedPlatform}
          onSelectGroup={(g) => setSelectedGroup(g)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          unverifiedPosture={unverifiedPosture}
          workflows={workflows}
          activityLogs={activityLogs}
          onInspectContract={handleInspectContract}
          onRefreshWorkflows={handleRefreshWorkflows}
        />

        <ContactSection />
      </main>

      {/* Footer watermark and governance links */}
      <footer className="border-t border-slate-800/80 bg-[#060B11] py-5 px-4 sm:px-6 mt-4">
        <div className="max-w-[1440px] mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <LeeWayFooterBrand compact />
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
              {CONTRACT_DOCUMENTS.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setActiveContract(doc)}
                  className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {doc.title}
                </button>
              ))}
              <a href="#contact" className="text-cyan-300 hover:text-cyan-200 transition-colors">Contact Us</a>
            </div>
          </div>
          <div className="border-t border-slate-800/70 pt-3 text-center text-[11px] text-slate-500 sm:text-left">
            LeeWay Standards · platform-specific execution requires platform-specific evidence · observed != verified
          </div>
        </div>
      </footer>

      <AboutBridgeModal
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
        unverifiedPosture={unverifiedPosture}
        onExecuteControl={handleExecuteControl}
        onActionLog={appendLog}
      />
      <ContractDrawer activeDoc={activeContract} onClose={() => setActiveContract(null)} />
    </div>
  );
}
