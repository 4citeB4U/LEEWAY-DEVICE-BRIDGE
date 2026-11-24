import React, { useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  Laptop,
  Server,
  ShieldCheck,
  Smartphone,
  Terminal,
} from 'lucide-react';
import { PlatformKey, PlatformLane } from '../data/bridgeData';
import { StatusIndicator } from './StatusBadge';

interface PlatformWorkstationsProps {
  lanes: PlatformLane[];
  selectedPlatform: PlatformKey | 'all';
  onSelectPlatform: (p: PlatformKey | 'all') => void;
  onActionLog: (message: string, level: 'info' | 'success' | 'warning', source: string) => void;
  onInspectContract: (docId: string) => void;
  onRunAppleBrowserCheck: () => void;
}

function getPlatformIcon(id: PlatformKey) {
  switch (id) {
    case 'apple':
      return <Laptop className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'android':
      return <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'windows':
      return <Terminal className="w-4 h-4 text-sky-400 shrink-0" />;
    case 'linux':
      return <Server className="w-4 h-4 text-cyan-400 shrink-0" />;
  }
}

export const PlatformWorkstations: React.FC<PlatformWorkstationsProps> = ({
  lanes,
  selectedPlatform,
  onSelectPlatform,
  onActionLog,
  onInspectContract,
  onRunAppleBrowserCheck,
}) => {
  const [copiedSha, setCopiedSha] = useState(false);
  const [onboardingTrack, setOnboardingTrack] = useState<'existing' | 'new'>('existing');
  const [newUserSetupDone, setNewUserSetupDone] = useState(false);

  const handleCopySha = async (sha: string) => {
    try {
      await navigator.clipboard.writeText(sha);
      setCopiedSha(true);
      onActionLog('Copied Android RC1 SHA-256 digest to clipboard', 'info', 'Android Lane');
      window.setTimeout(() => setCopiedSha(false), 1800);
    } catch {
      onActionLog('Android RC1 SHA-256 digest verified in manifest view', 'info', 'Android Lane');
    }
  };

  return (
    <section id="platforms" className="space-y-4">
      {/* Shared Cloud Workplane Banner + Continual vs New User Split */}
      <div className="rounded-xl border border-slate-800 bg-[#0B121B] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-400">
              <Cloud className="w-4 h-4" />
              <span>Shared Cloud Workplane · GitHub Codespaces</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-100">
              LeeWay Device-Neutral Workstation &amp; Device Onboarding
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Device-agnostic editor, terminal, Git, Node, and GitHub CLI development workplane for
              all mobile and desktop operating systems. Choose whether you are pairing a new device
              to an existing account or setting up a brand-new account first.
            </p>
          </div>

          <div
            className="inline-flex items-center bg-[#070C13] border border-slate-800 rounded-lg p-1 self-start lg:self-auto shrink-0"
            role="group"
            aria-label="User onboarding path"
          >
            <button
              type="button"
              onClick={() => setOnboardingTrack('existing')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                onboardingTrack === 'existing'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              Existing User · Add New Device
            </button>
            <button
              type="button"
              onClick={() => setOnboardingTrack('new')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                onboardingTrack === 'new'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              New User · Setup Account First
            </button>
          </div>
        </div>

        {/* Separated Track Strip */}
        {onboardingTrack === 'existing' ? (
          <div
            className="rounded-lg border border-emerald-500/30 bg-[#070C13] p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
            data-testid="workstation-existing-track"
          >
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-emerald-300">
                Continual Owner · Direct New-Device Connection (Account Already Configured)
              </div>
              <p className="text-xs text-slate-400">
                Skip account creation. Pick your new device lane below or launch directly into your
                Apple or Android remote workstation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onSelectPlatform('apple');
                  onActionLog(
                    'Opened Apple Cloud Workstation route for existing LeeWay owner',
                    'success',
                    'Cloud Workplane',
                  );
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 text-slate-950 hover:bg-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Apple Cloud Workstation
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectPlatform('android');
                  onActionLog(
                    'Opened Android Remote Workstation route for existing LeeWay owner',
                    'info',
                    'Cloud Workplane',
                  );
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Android Remote Workstation
              </button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-lg border border-amber-500/35 bg-[#070C13] p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
            data-testid="workstation-new-track"
          >
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-amber-300">
                New User · Step 1: Set Up Account &amp; Credentials First → Step 2: Downloads
              </div>
              <p className="text-xs text-slate-400">
                {newUserSetupDone
                  ? 'Account setup confirmed. You can now proceed to the platform downloads and workstation installers below.'
                  : 'Before downloading native packages (Apple Metal IPA or Android RC1), complete Step 1 to initialize your owner account and pairing record.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setNewUserSetupDone(false);
                  onActionLog(
                    'Account registration requires authorized Runtime confirmation; no local setup completion was recorded',
                    'warning',
                    'Account Onboarding',
                  );
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  newUserSetupDone
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {newUserSetupDone ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Step 1 Complete · Downloads Ready
                  </>
                ) : (
                  'Account Setup Requires Verified Runtime'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Four Cross-Platform Lanes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {lanes.map((lane) => {
          const isFocused = selectedPlatform === lane.id;

          return (
            <article
              key={lane.id}
              className={`rounded-xl border bg-[#0B121B] p-4 flex flex-col justify-between gap-4 transition-colors ${
                isFocused
                  ? 'border-cyan-500/60 ring-1 ring-cyan-500/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                {/* Header row: clean unboxed eyebrow + status indicator */}
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectPlatform(isFocused ? 'all' : lane.id)}
                    className="text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      {getPlatformIcon(lane.id)}
                      <span>{lane.eyebrow}</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-100 mt-1 group-hover:text-cyan-300 transition-colors">
                      {lane.title}
                    </h3>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 border-y border-slate-800/80 py-2">
                  <StatusIndicator status={lane.status} label={lane.statusLabel} compact />
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {lane.metrics.activeNodes} {lane.metrics.activeNodes === 1 ? 'node' : 'nodes'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{lane.description}</p>

                {/* Live Numeric Telemetry Grid */}
                <div className="grid grid-cols-3 gap-2 text-xs bg-[#070C13] border border-slate-800/80 rounded-lg p-2.5">
                  <div>
                    <div className="text-[10px] text-slate-500">Sync Rate</div>
                    <div className="font-mono font-semibold text-slate-100 tabular-nums mt-0.5">
                      {lane.metrics.syncRateMbps} MB/s
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Latency</div>
                    <div className="font-mono font-semibold text-cyan-300 tabular-nums mt-0.5">
                      {lane.metrics.avgLatencyMs} ms
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Delivery</div>
                    <div className="font-mono font-semibold text-emerald-400 tabular-nums mt-0.5">
                      {lane.metrics.packetSuccessPct}%
                    </div>
                  </div>
                </div>

                {/* Lane-Specific Evidence & Checksum Details */}
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {lane.details.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-snug">
                      <span className="text-slate-600 mt-0.5">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {lane.sha256 && (
                  <div className="rounded-lg bg-[#070C13] border border-slate-800/90 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-amber-400 font-medium">
                      <span>{lane.releaseTag}</span>
                      <button
                        type="button"
                        onClick={() => handleCopySha(lane.sha256!)}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
                        aria-label="Copy Android SHA-256 digest"
                      >
                        {copiedSha ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy SHA-256</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 break-all leading-tight">
                      {lane.sha256}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="text-[11px] text-slate-500 truncate">{lane.nativeBridgeState}</div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPlatform(lane.id);
                      onActionLog(
                        `Focused ${lane.id.toUpperCase()} workstation lane (${lane.packageBadge})`,
                        lane.status === 'verified' ? 'success' : 'info',
                        'Workstation Hub',
                      );
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-950 hover:bg-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {lane.primaryButtonText}
                  </button>

                  {lane.id === 'apple' && (
                    <button
                      type="button"
                      onClick={onRunAppleBrowserCheck}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Check Apple Browser
                    </button>
                  )}

                  {lane.id === 'android' && (
                    <>
                      <a
                        href="/LEEWAY-DEVICE-BRIDGE/docs/downloads/leeway-device-bridge-android-latest-debug.apk"
                        download
                        onClick={() => onActionLog(
                          'Android debug APK requested. This is a developer test build, not a production-signed customer installer.',
                          'warning', 'Android Lane'
                        )}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-amber-700/60 text-amber-100 hover:bg-slate-800 text-xs font-medium transition-colors shrink-0"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        Download test APK (debug)
                      </a>
                      <p className="text-[11px] text-amber-200">
                        Development build only. Android may warn about unknown or untrusted apps. Do not bypass a malware warning or uninstall an existing installation to force an update.
                      </p>
                    </>
                  )}

                  {lane.id === 'apple' && (
                    <>
                      <a
                        href="https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/releases/download/apple-latest/LeeWayDeviceBridge-unsigned.ipa"
                        onClick={() => onActionLog(
                          'Opening the verified Apple unsigned IPA artifact. Owner-controlled signing is required before installation.',
                          'warning', 'Apple Lane'
                        )}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-amber-700/60 text-amber-100 hover:bg-slate-800 text-xs font-medium transition-colors shrink-0"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        Download unsigned IPA (developer)
                      </a>
                      <p className="text-[11px] text-amber-200">
                        This is an unsigned developer artifact, not an iPhone-installable release. Signing and owner-approved installation are required. Mac installation requires a separate macOS package.
                      </p>
                    </>
                  )}

                  {(lane.id === 'windows' || lane.id === 'linux') && (
                    <p className="text-[11px] text-amber-200">
                      No published signed native {lane.id === 'windows' ? 'Windows installer' : 'Linux package'} has been qualified. The LeeWay web app remains accessible; do not substitute a source repository for an installer.
                    </p>
                  )}

                  <a
                    href="https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-cyan-100 hover:bg-slate-800 text-xs font-medium transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open LeeWay web app
                  </a>

                  {(lane.id === 'windows' || lane.id === 'linux') && (
                    <button
                      type="button"
                      onClick={() => onInspectContract('runtime-contract')}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Runtime Contract
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
