import React, { useEffect, useMemo, useState } from 'react';
import {
  AppWindow,
  ArrowRight,
  Check,
  Copy,
  Cpu,
  Download,
  FolderOpen,
  Info,
  Layers,
  Monitor,
  Play,
  PlusCircle,
  Power,
  RefreshCw,
  RotateCw,
  Server,
  Shield,
  ShieldCheck,
  Terminal,
  UserCheck,
  UserPlus,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { DEVICE_CONTROLS, DeviceControlSpec } from '../data/bridgeData';
import { formatPlatformLabel } from '../utils/telemetryLogic';

interface AboutBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  unverifiedPosture: boolean;
  onExecuteControl: (control: DeviceControlSpec) => void;
  onActionLog: (message: string, level: 'info' | 'success' | 'warning', source: string) => void;
}

function getControlIcon(id: string) {
  switch (id) {
    case 'remote-view':
      return <Monitor className="w-4 h-4 text-cyan-400" />;
    case 'open-shell':
      return <Terminal className="w-4 h-4 text-cyan-400" />;
    case 'file-access':
      return <FolderOpen className="w-4 h-4 text-cyan-400" />;
    case 'app-control':
      return <AppWindow className="w-4 h-4 text-cyan-400" />;
    case 'power':
      return <Power className="w-4 h-4 text-amber-400" />;
    case 'restart':
      return <RotateCw className="w-4 h-4 text-amber-400" />;
    case 'shutdown':
      return <Power className="w-4 h-4 text-rose-400" />;
    case 'wake':
      return <Wifi className="w-4 h-4 text-emerald-400" />;
    case 'services':
      return <Server className="w-4 h-4 text-sky-400" />;
    case 'processes':
      return <Cpu className="w-4 h-4 text-sky-400" />;
    case 'install-update':
      return <Download className="w-4 h-4 text-emerald-400" />;
    default:
      return <Zap className="w-4 h-4 text-cyan-400" />;
  }
}

const ARCHITECTURE_STEPS = [
  {
    step: '01',
    title: 'Discover',
    badge: 'Browser / Local Relay',
    detail:
      'Detects browser compute (WebGL/WebGPU) and active platform surfaces without assuming device enrollment.',
  },
  {
    step: '02',
    title: 'Verify',
    badge: 'Owner Authorization',
    detail:
      'Enforces explicit owner approval, iLoader certificates, or SHA-256 package digests (observed != verified).',
  },
  {
    step: '03',
    title: 'Synchronize',
    badge: '< 15 ms Fabric',
    detail:
      'Routes bi-directional state over QUIC, WebRTC DataChannel, WireGuard gRPC, and MQTT-TLS.',
  },
  {
    step: '04',
    title: 'Execute & Audit',
    badge: 'Scoped Controls',
    detail:
      'Runs permission-scoped remote actions across qualified OS lanes and records every operation.',
  },
];

const EXISTING_USER_LANES = [
  {
    os: 'Apple (iPhone / iPad / Mac)',
    note: 'Open Home Screen PWA or pair via existing iLoader certificate & pairing record.',
  },
  {
    os: 'Android (Phone / Tablet)',
    note: 'Install 0.10.0-agent-update-rc1 directly over current app without wiping data.',
  },
  {
    os: 'Windows / Linux / Edge',
    note: 'Attach new machine to existing Codespaces workplane, WireGuard gRPC, or MQTT-TLS relay.',
  },
];

const PAIR_NEW_DEVICE_CMD = 'leeway bridge pair --new-device --existing-owner';
const NEW_USER_INIT_CMD = 'leeway account setup --create-owner --init-cert';

export const AboutBridgeModal: React.FC<AboutBridgeModalProps> = ({
  isOpen,
  onClose,
  unverifiedPosture,
  onExecuteControl,
  onActionLog,
}) => {
  const [selectedControlId, setSelectedControlId] = useState<string>('remote-view');
  const [copiedCmd, setCopiedCmd] = useState<'pair' | 'setup' | null>(null);
  const [newUserAccountReady, setNewUserAccountReady] = useState(false);

  const selectedControl = useMemo(
    () => DEVICE_CONTROLS.find((c) => c.id === selectedControlId) ?? DEVICE_CONTROLS[0],
    [selectedControlId],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyCommand = async (cmd: string, kind: 'pair' | 'setup') => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCmd(kind);
      onActionLog(
        kind === 'pair'
          ? 'Copied existing-owner new-device pairing command'
          : 'Copied first-time owner account setup command',
        'info',
        'About Bridge',
      );
      window.setTimeout(() => setCopiedCmd(null), 1800);
    } catch {
      onActionLog('Bridge command ready for manual copy', 'info', 'About Bridge');
    }
  };

  const handleJumpToWorkstations = () => {
    onClose();
    window.setTimeout(() => {
      document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-bridge-title"
      data-testid="about-bridge-drawer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl bg-[#0B121B] border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800 bg-[#070C13]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 shrink-0">
              <Info className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h2
                id="about-bridge-title"
                className="text-base sm:text-lg font-display font-semibold text-slate-100 truncate"
              >
                About LeeWay Device Bridge &amp; Controls
              </h2>
              <p className="text-xs text-slate-400 truncate">
                How the bridge works, separated onboarding paths, and governed device controls
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close About LeeWay Device Bridge"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Section 1: What LeeWay Device Bridge Is */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                What the LeeWay Device Bridge Is
              </h3>
              <span className="text-[11px] font-mono text-emerald-400 inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                observed != verified
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              LeeWay Device Bridge is a pure, device-agnostic digital connection plane built for
              low-latency cross-platform synchronization across mobile and desktop operating systems.
              Rather than storing credentials in the browser or forcing every device into one OS
              runtime, it separates <strong className="text-slate-100">browser observation</strong>{' '}
              from <strong className="text-slate-100">verified native execution</strong> across Apple,
              Android, Windows, Linux, and Edge nodes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-800 bg-[#070C13] p-3 space-y-1">
                <div className="text-xs font-semibold text-cyan-300">Device &amp; OS Agnostic</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Unites desktop workstations, laptops, phones, tablets, servers, and ARM edge relays
                  under one control surface.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#070C13] p-3 space-y-1">
                <div className="text-xs font-semibold text-emerald-300">Zero Silent Credentials</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Workstation links open routes directly without storing tokens in browser storage or
                  silently provisioning environments.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#070C13] p-3 space-y-1">
                <div className="text-xs font-semibold text-sky-300">Sub-15 ms Mesh Sync</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Negotiates the lowest-latency transport per device lane (QUIC, WebRTC, gRPC,
                  WireGuard, or MQTT-TLS).
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: How It Works (Visual Pipeline) */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              How It Works
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {ARCHITECTURE_STEPS.map((item, index) => (
                <div
                  key={item.step}
                  className="relative rounded-lg border border-slate-800 bg-[#070C13] p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold text-cyan-400">
                      STEP {item.step}
                    </span>
                    {index < ARCHITECTURE_STEPS.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 hidden lg:block" />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-100">{item.title}</div>
                  <div className="text-[10px] font-mono text-slate-400">{item.badge}</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Separated Connection Paths (Existing User vs Brand New User) */}
          <section className="space-y-3" data-testid="connection-paths-split">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                How to Connect · Choose Your Onboarding Path
              </h3>
              <span className="text-[11px] text-slate-400">
                Separated for continual owners vs. brand-new setups
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Track 1: Continual User with a New Device */}
              <div
                className="rounded-xl border border-emerald-500/35 bg-[#070C13] p-4 flex flex-col justify-between gap-3.5"
                data-testid="existing-user-track"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-100">
                          Continual User · Connect New Device
                        </div>
                        <div className="text-[11px] font-mono text-emerald-400">
                          ACCOUNT READY · SKIP ACCOUNT SETUP
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Your LeeWay owner account and signing identity are already configured. Skip
                    account setup and pair your new phone, tablet, laptop, or server directly.
                  </p>

                  <div className="space-y-2">
                    {EXISTING_USER_LANES.map((item) => (
                      <div
                        key={item.os}
                        className="rounded-lg border border-slate-800 bg-[#0B121B] px-3 py-2 space-y-0.5"
                      >
                        <div className="text-[11px] font-semibold text-slate-100">{item.os}</div>
                        <div className="text-[11px] text-slate-400 leading-snug">{item.note}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#060B11] px-2.5 py-1.5">
                    <code className="text-[11px] font-mono text-emerald-200 truncate">
                      {PAIR_NEW_DEVICE_CMD}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyCommand(PAIR_NEW_DEVICE_CMD, 'pair')}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200 hover:bg-slate-800 shrink-0 cursor-pointer"
                    >
                      {copiedCmd === 'pair' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onActionLog(
                      'Opened direct new-device pairing flow for continual LeeWay owner (skipped account setup)',
                      'success',
                      'Device Pairing',
                    );
                    handleJumpToWorkstations();
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Connect New Device to Existing Account
                </button>
              </div>

              {/* Track 2: Brand New User — Account Setup First, Then Downloads */}
              <div
                className="rounded-xl border border-amber-500/35 bg-[#070C13] p-4 flex flex-col justify-between gap-3.5"
                data-testid="new-user-track"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30">
                        <UserPlus className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-100">
                          New User · Account Setup First
                        </div>
                        <div className="text-[11px] font-mono text-amber-400">
                          STEP 1: ACCOUNT → STEP 2: DOWNLOADS
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    First time using LeeWay Device Bridge? Set up your owner account and pairing
                    credentials before downloading platform packages or extensions.
                  </p>

                  <ol className="space-y-2 text-[11px]">
                    <li className="rounded-lg border border-slate-800 bg-[#0B121B] px-3 py-2 space-y-0.5">
                      <div className="font-semibold text-amber-300">
                        Step 1 · Set Up Owner Account &amp; Credentials
                      </div>
                      <p className="text-slate-400 leading-snug">
                        Authorize your GitHub Codespaces / LeeWay owner account and preserve your
                        signing certificate (enable Save Credentials in iLoader if on Apple).
                      </p>
                    </li>
                    <li className="rounded-lg border border-slate-800 bg-[#0B121B] px-3 py-2 space-y-0.5">
                      <div
                        className={`font-semibold ${
                          newUserAccountReady ? 'text-emerald-300' : 'text-slate-200'
                        }`}
                      >
                        Step 2 · Start Platform Downloads &amp; Install
                      </div>
                      <p className="text-slate-400 leading-snug">
                        Once your account is ready, download the Android RC1 extension
                        (0.10.0-agent-update-rc1), Apple Metal IPA, or open your cloud workstation.
                      </p>
                    </li>
                  </ol>

                  <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#060B11] px-2.5 py-1.5">
                    <code className="text-[11px] font-mono text-amber-200 truncate">
                      {NEW_USER_INIT_CMD}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyCommand(NEW_USER_INIT_CMD, 'setup')}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200 hover:bg-slate-800 shrink-0 cursor-pointer"
                    >
                      {copiedCmd === 'setup' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewUserAccountReady(true);
                      onActionLog(
                        'Step 1 complete: Owner account setup verified — platform downloads unlocked',
                        'success',
                        'Account Onboarding',
                      );
                    }}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      newUserAccountReady
                        ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    {newUserAccountReady ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        1. Account Ready
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        1. Complete Account Setup
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={!newUserAccountReady}
                    onClick={() => {
                      onActionLog(
                        'Proceeding to platform downloads & workstation setup after account verification',
                        'info',
                        'Account Onboarding',
                      );
                      handleJumpToWorkstations();
                    }}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      newUserAccountReady
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer'
                        : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    2. Start Downloads
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Device Controls & Capability Inspector */}
          <section className="rounded-xl border border-slate-800 bg-[#070C13] p-4 space-y-3.5">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Device Controls &amp; Capability Inspector
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select any control to inspect permissions, latency budget, and supported OS lanes
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEVICE_CONTROLS.map((ctrl) => {
                const active = ctrl.id === selectedControl.id;
                return (
                  <button
                    key={ctrl.id}
                    type="button"
                    onClick={() => setSelectedControlId(ctrl.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-colors cursor-pointer ${
                      active
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                        : 'bg-[#0B121B] border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {getControlIcon(ctrl.id)}
                    <span className="text-xs font-medium whitespace-nowrap">{ctrl.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Capability Detail & Dispatch Panel */}
            <div className="rounded-lg border border-slate-800 bg-[#0B121B] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-100">
                  {selectedControl.label} · {selectedControl.category}
                </div>
                <span className="text-[11px] font-mono text-cyan-300 tabular-nums">
                  Budget ≤ {selectedControl.latencyBudgetMs} ms
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{selectedControl.description}</p>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                <span>Scope: {selectedControl.permissionScope}</span>
                <span>
                  OS: {selectedControl.supportedPlatforms.map(formatPlatformLabel).join(' · ')}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <code className="text-[11px] font-mono text-slate-300 truncate bg-slate-900/90 px-2.5 py-1.5 rounded border border-slate-800 flex-1">
                  {selectedControl.commandPreview}
                </code>
                <button
                  type="button"
                  disabled={unverifiedPosture && selectedControl.requiresOwnerAuth}
                  onClick={() => onExecuteControl(selectedControl)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    unverifiedPosture && selectedControl.requiresOwnerAuth
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 cursor-pointer'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  {unverifiedPosture && selectedControl.requiresOwnerAuth
                    ? 'Auth Required'
                    : 'Run Control'}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#070C13] flex items-center justify-between text-xs text-slate-400">
          <span>LeeWay Device Bridge · Device-Agnostic Governed Sync</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
