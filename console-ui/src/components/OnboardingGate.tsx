import React, { useState } from 'react';
import { ArrowRight, MonitorSmartphone, ShieldCheck, UserRound, MailPlus, LogIn } from 'lucide-react';
import { BridgeScene } from './BridgeScene';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import { LeeWayFooterBrand, LeeWayIndustriesBrand, LEEWAY_LOCK_EMBLEM } from './LeeWayBrand';
import { approvedUrl, endpoints, type SessionRole, type SessionStatus } from '../hooks/useLeeWaySession';

interface OnboardingGateProps {
  status: SessionStatus;
  /** Explicit sign-in is mandatory on every application entry. */
  onSignIn: (kind: SessionRole) => void;
}

const signInChoices = [
  {
    id: 'creator' as const,
    title: 'Creator Sign In',
    detail: 'Sign in to your LeeWay account to manage your devices, workspaces, and access.',
    button: 'Creator Sign In',
    icon: UserRound,
  },
  {
    id: 'customer' as const,
    title: 'Customer Sign In',
    detail: 'Returning customer? Sign in with your existing LeeWay account to open your workspace.',
    button: 'Customer Sign In',
    icon: LogIn,
  },
];

const linkChoices = [
  {
    id: 'invitation' as const,
    title: 'Accept Invitation',
    detail: 'Have an invitation from a LeeWay workspace? Accept it here to get started.',
    button: 'Accept Invitation',
    icon: MailPlus,
  },
  {
    id: 'pairing' as const,
    title: 'Connect Another Device',
    detail: 'Link a new device to your existing LeeWay workspace for seamless access.',
    button: 'Connect Another Device',
    icon: MonitorSmartphone,
  },
];

export function OnboardingGate({ status, onSignIn }: OnboardingGateProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="lw-landing">
      <div className="lw-landing__circuits" aria-hidden="true" />
      <header className="lw-landing__header">
        <img src={LEEWAY_LOCK_EMBLEM} alt="LeeWay secure lock emblem" className="lw-landing__emblem" draggable={false} />
        <span className="lw-landing__divider" aria-hidden="true" />
        <span className="lw-landing__wordmark">
          <span className="lw-landing__wordmark-main">LEEWAY</span>
          <span className="lw-landing__wordmark-sub">DEVICE BRIDGE</span>
        </span>
      </header>

      <main className="lw-landing__main">
        <section className="lw-hero" aria-labelledby="lw-hero-title">
          <BridgeScene />
          <div className="lw-hero__content">
            <h1 id="lw-hero-title" className="lw-hero__title">LeeWay Device Bridge</h1>
            <div className="lw-hero__rule" aria-hidden="true">
              <span />
              <svg viewBox="0 0 24 24" className="lw-hero__wifi"><path d="M2 8.8a16 16 0 0 1 20 0M5 12.4a11 11 0 0 1 14 0M8.4 16a6 6 0 0 1 7.2 0M12 19.5h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <span />
            </div>
            <p className="lw-hero__subtitle">All users begin here to sign in, accept invitations, or connect another device.</p>
          </div>
        </section>

        <section className="lw-cards" aria-label="Sign in options">
          {signInChoices.map((choice) => {
            const isActive = selected === choice.id;
            const Icon = choice.icon;
            return (
              <article
                key={choice.id}
                className={`lw-card ${isActive ? 'lw-card--active' : ''}`}
                onMouseEnter={() => setSelected(choice.id)}
                onFocus={() => setSelected(choice.id)}
              >
                <span className="lw-card__glow" aria-hidden="true" />
                <span className="lw-card__icon"><Icon className="lw-card__icon-svg" aria-hidden="true" /></span>
                <h2 className="lw-card__title">{choice.title}</h2>
                <p className="lw-card__detail">{choice.detail}</p>
                <button
                  type="button"
                  className="lw-card__button"
                  onClick={() => { setSelected(choice.id); onSignIn(choice.id); }}
                >
                  {choice.button} <ArrowRight className="lw-card__button-arrow" aria-hidden="true" />
                </button>
              </article>
            );
          })}
          {linkChoices.map((choice) => {
            const target = approvedUrl(endpoints[choice.id]);
            const isActive = selected === choice.id;
            const Icon = choice.icon;
            return (
              <article
                key={choice.id}
                className={`lw-card ${isActive ? 'lw-card--active' : ''}`}
                onMouseEnter={() => setSelected(choice.id)}
                onFocus={() => setSelected(choice.id)}
              >
                <span className="lw-card__glow" aria-hidden="true" />
                <span className="lw-card__icon"><Icon className="lw-card__icon-svg" aria-hidden="true" /></span>
                <h2 className="lw-card__title">{choice.title}</h2>
                <p className="lw-card__detail">{choice.detail}</p>
                {target ? (
                  <a className="lw-card__button" href={target} onClick={() => setSelected(choice.id)}>
                    {choice.button} <ArrowRight className="lw-card__button-arrow" aria-hidden="true" />
                  </a>
                ) : (
                  <button
                    type="button"
                    className="lw-card__button lw-card__button--pending"
                    aria-disabled="true"
                    title="Awaiting connection to the LeeWay Runtime"
                    onClick={() => setSelected(choice.id)}
                  >
                    {choice.button} <ArrowRight className="lw-card__button-arrow" aria-hidden="true" />
                  </button>
                )}
              </article>
            );
          })}
        </section>

        <p className="lw-landing__status" role="status">
          <ShieldCheck className="lw-landing__status-icon" aria-hidden="true" />
          {status === 'checking' ? 'Verifying sign-in…' : 'Sign in required on every visit'}
          <span className="lw-landing__status-sep">·</span>
          <span>No session is remembered. Enrollment routes await the authorized LeeWay Runtime.</span>
        </p>
        <PwaInstallPrompt />
      </main>

      <footer className="lw-landing__footer">
        <LeeWayFooterBrand />
      </footer>
    </div>
  );
}

/** Workspace shell header shared by every page after onboarding. */
export function LeeWayWorkspaceHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="lw-workspace-header sticky top-0 z-30 border-b border-slate-800/90 bg-[#060B11]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-8">
        <a href="#bridge" className="lw-workspace-header__brand shrink-0" aria-label="LeeWay Industries — back to top">
          <LeeWayIndustriesBrand compact />
        </a>
        {children}
      </div>
    </header>
  );
}

export function CustomerWorkspace() {
  const tablet = approvedUrl(endpoints.tablet);
  return (
    <div className="min-h-screen bg-[#060B11] text-slate-100 flex flex-col">
      <LeeWayWorkspaceHeader />
      <main className="flex-1 w-full max-w-[1440px] mx-auto p-6 flex items-center justify-center">
        <section className="max-w-xl w-full rounded-xl border border-cyan-600/30 bg-[#0B121B] p-7">
          <ShieldCheck className="h-9 w-9 text-cyan-300" />
          <h1 className="mt-4 text-2xl font-bold">Your LeeWay workspace</h1>
          <p className="mt-3 text-slate-400">Your identity is verified. Your devices and applications belong to your private LeeWay account. Creator management tools are not available in this workspace.</p>
          {tablet ? <a className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-slate-950" href={tablet}>Open My Agentic Universal O.S. <ArrowRight className="h-4 w-4" /></a> : <p className="mt-6 text-amber-200 text-sm">The authorized Tablet route has not been configured.</p>}
        </section>
      </main>
    </div>
  );
}
