import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  CircleUserRound,
  Cpu,
  FileCheck2,
  Layers3,
  ShieldCheck,
} from 'lucide-react';
import { LeeWayFooterBrand, LeeWayIndustriesBrand } from './LeeWayBrand';
import { PLATFORM_LANES } from '../data/bridgeData';

/**
 * A distinct full-page onboarding experience for a signed-in identity that has not
 * completed setup. It is NOT the sign-in gate and NOT the operations dashboard.
 * The owner configures their own workspace under their own name before any device
 * download or native action becomes reachable.
 *
 * This page records local setup choices only. Real device enrollment, signing and
 * Runtime authorization remain server-side gates and are not claimed here.
 */
interface OnboardingPageProps {
  displayName?: string;
  role: 'creator' | 'customer';
  onComplete: (input: { displayName: string; workspaceName: string; deviceLanes: string[] }) => Promise<boolean>;
  saving: boolean;
  error: string | null;
  onSignOut: () => void;
}

type Step = 0 | 1 | 2 | 3;

const STEP_LABELS = ['Your identity', 'Your workspace', 'Your devices', 'Review & finish'];

export function OnboardingPage({ displayName, role, onComplete, onSignOut, saving, error }: OnboardingPageProps) {
  const [step, setStep] = useState<Step>(0);
  const [ownerName, setOwnerName] = useState(displayName || '');
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedLanes, setSelectedLanes] = useState<string[]>([]);
  const [accepted, setAccepted] = useState(false);

  const canAdvance =
    step === 0 ? ownerName.trim().length >= 2 && ownerName.trim().length <= 120
      : step === 1 ? workspaceName.trim().length >= 2 && workspaceName.trim().length <= 120
        : step === 2 ? selectedLanes.length > 0
          : accepted;

  const toggleLane = (id: string) => {
    setSelectedLanes((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const next = () => {
    if (!canAdvance) return;
    if (step < 3) setStep((step + 1) as Step);
    else void onComplete({ displayName: ownerName.trim(), workspaceName: workspaceName.trim(), deviceLanes: selectedLanes });
  };

  return (
    <div className="min-h-screen bg-[#060B11] text-slate-100 flex flex-col">
      <div className="border-b border-amber-700/50 bg-amber-950/30 px-5 py-2 text-center text-xs font-semibold text-amber-200" role="status">
        Setup page — sign-in is verified. Complete onboarding to reach your workspace.
      </div>

      <header className="border-b border-slate-800/90 bg-[#060B11]">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <LeeWayIndustriesBrand compact />
          <button type="button" onClick={onSignOut} className="text-xs text-slate-400 hover:text-white underline cursor-pointer">
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-5 py-8">
        <div className="flex items-center gap-3 text-cyan-300 text-xs font-semibold uppercase tracking-wide">
          <Layers3 className="h-4 w-4" aria-hidden="true" /> Onboarding · Step {step + 1} of 4
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-display font-bold text-white">
          Set up your LeeWay system
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-2xl">
          Signed in as <span className="text-slate-200">{role === 'creator' ? 'Creator' : 'Customer'}</span>.
          Your setup must be confirmed and read back by the original LeeWay Runtime before workspace access.
        </p>

        <ol className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="Onboarding progress">
          {STEP_LABELS.map((label, index) => (
            <li
              key={label}
              className={`rounded-lg border px-3 py-2 text-xs ${
                index === step
                  ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-200'
                  : index < step
                    ? 'border-emerald-600/40 bg-emerald-500/5 text-emerald-300'
                    : 'border-slate-800 text-slate-500'
              }`}
              aria-current={index === step ? 'step' : undefined}
            >
              <span className="font-semibold">{index + 1}. {label}</span>
              {index < step && <Check className="inline h-3 w-3 ml-1" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <section className="mt-6 rounded-xl border border-slate-800 bg-[#0B121B] p-5 sm:p-6">
          {step === 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <CircleUserRound className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Your identity
              </div>
              <p className="text-xs text-slate-400">
                Enter the name this LeeWay workspace should be set up under. This is a local setup label, not a claim of verified identity.
              </p>
              <label className="block text-xs text-slate-400" htmlFor="onb-owner">Display name</label>
              <input
                id="onb-owner"
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                maxLength={120}
                placeholder="e.g. Leonard J. Lee"
                className="w-full rounded-lg border border-slate-700 bg-[#070C13] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Cpu className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Your workspace
              </div>
              <p className="text-xs text-slate-400">
                Name your private workspace. No device data is created until the original Runtime authorizes enrollment.
              </p>
              <label className="block text-xs text-slate-400" htmlFor="onb-workspace">Workspace name</label>
              <input
                id="onb-workspace"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                maxLength={120}
                placeholder="e.g. My LeeWay devices"
                className="w-full rounded-lg border border-slate-700 bg-[#070C13] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Layers3 className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Your devices
              </div>
              <p className="text-xs text-slate-400">Choose the device lanes you intend to use. Selection is a preference, not enrollment.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PLATFORM_LANES.map((lane) => (
                  <label
                    key={lane.id}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${
                      selectedLanes.includes(lane.id)
                        ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-100'
                        : 'border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLanes.includes(lane.id)}
                      onChange={() => toggleLane(lane.id)}
                      className="accent-cyan-400"
                    />
                    <span>{lane.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <FileCheck2 className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Review &amp; finish
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg border border-slate-800 bg-[#070C13] p-3">
                  <dt className="text-slate-500">Name</dt><dd className="mt-1 text-slate-200">{ownerName}</dd>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070C13] p-3">
                  <dt className="text-slate-500">Workspace</dt><dd className="mt-1 text-slate-200">{workspaceName}</dd>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070C13] p-3">
                  <dt className="text-slate-500">Lanes</dt><dd className="mt-1 text-slate-200">{selectedLanes.join(', ')}</dd>
                </div>
              </dl>
              <label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  className="mt-0.5 accent-cyan-400"
                />
                <span>
                  I understand this setup is local and that real device enrollment, downloads and actions require the
                  original LeeWay Runtime, verified identity and an owner-authorized receipt.
                </span>
              </label>
            </div>
          )}
        </section>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((step - 1) as Step)}
            disabled={step === 0}
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canAdvance || saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? 'Confirming with LeeWay Runtime…' : step === 3 ? 'Finish setup' : 'Continue'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-amber-200">{error}</p>}
        <p className="mt-6 flex items-center gap-2 text-[11px] text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Setup is scoped to this signed-in account. No shared owner token or device identity is created here.
        </p>
      </main>

      <footer className="border-t border-slate-800/80 bg-[#060B11] py-5 px-5">
        <div className="max-w-4xl mx-auto"><LeeWayFooterBrand compact /></div>
      </footer>
    </div>
  );
}
