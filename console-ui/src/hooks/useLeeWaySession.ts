import { useCallback, useEffect, useRef, useState } from 'react';

export type SessionStatus = 'checking' | 'unverified' | 'verified';
export type SessionRole = 'creator' | 'customer';

/** A session is only trusted when it was obtained from an explicit sign-in action. */
export interface VerifiedSession {
  authenticated: true;
  role: SessionRole;
  onboarded: boolean;
  displayName?: string;
}

const env = import.meta.env;

/** Minimum time the loading screen is shown on every application entry. */
const MIN_LOADING_MS = Number(env.VITE_LEEWAY_MIN_LOADING_MS || 900);

export const endpoints = {
  creator: env.VITE_LEEWAY_CREATOR_SIGNIN_URL as string | undefined,
  customer: env.VITE_LEEWAY_CUSTOMER_SIGNIN_URL as string | undefined,
  invitation: env.VITE_LEEWAY_INVITATION_URL as string | undefined,
  pairing: env.VITE_LEEWAY_DEVICE_PAIR_URL as string | undefined,
  session: env.VITE_LEEWAY_SESSION_URL as string | undefined,
  tablet: env.VITE_LEEWAY_TABLET_URL as string | undefined,
  onboarding: env.VITE_LEEWAY_ONBOARDING_URL as string | undefined,
};

/** Only same-origin relative routes and HTTPS destinations are ever navigated to. */
export function approvedUrl(input?: string): string | null {
  if (!input) return null;
  try {
    const url = new URL(input, window.location.href);
    if (url.origin === window.location.origin || url.protocol === 'https:') return url.href;
  } catch { /* no valid target */ }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Read a server-verified LeeWay session.
 *
 * SECURITY CONTRACT (explicit Creator requirement):
 * - Every application entry starts with the loading screen, then ALWAYS lands on the
 *   sign-in/sign-up gate. There is no automatic login from a cookie, URL parameter,
 *   localStorage or browser-local setting.
 * - A session is only accepted after an explicit sign-in action calls the approved
 *   server endpoint and receives `{ authenticated: true, role, onboarded }`.
 * - An authenticated but not-yet-onboarded identity must complete the separate
 *   onboarding page before the dashboard is reachable.
 * - No fixture, dev stub or cached state can promote a caller to Creator here.
 */
export function useLeeWaySession() {
  const [status, setStatus] = useState<SessionStatus>('checking');
  const [session, setSession] = useState<VerifiedSession | null>(null);
  const startedAt = useRef<number>(Date.now());

  /**
   * Entry sequence. Always shows the loading screen, then always shows the gate.
   * It deliberately does NOT read a persisted session.
   */
  useEffect(() => {
    let active = true;
    async function enter() {
      setStatus('checking');
      setSession(null);
      const remaining = MIN_LOADING_MS - (Date.now() - startedAt.current);
      if (remaining > 0) await sleep(remaining);
      if (!active) return;
      setStatus('unverified');
    }
    void enter();
    return () => { active = false; };
  }, []);

  /**
   * Explicit sign-in. Calls the approved session endpoint; never grants a role from
   * the client. If a real sign-in URL is configured, the caller may navigate to it
   * instead (see OnboardingGate). `kind` is sent only as a requested role hint and
   * is never trusted as an authorization decision.
   */
  const signIn = useCallback(async (kind: SessionRole = 'creator'): Promise<boolean> => {
    const endpoint = approvedUrl(endpoints.session);
    if (!endpoint) {
      setSession(null);
      setStatus('unverified');
      return false;
    }
    setStatus('checking');
    try {
      const target = new URL(endpoint);
      target.searchParams.set('requestedRole', kind);
      const response = await fetch(target.toString(), {
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('SIGN_IN_ENDPOINT_DENIED');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('authenticated' in data) ||
          data.authenticated !== true || !('role' in data) ||
          (data.role !== 'creator' && data.role !== 'customer')) {
        throw new Error('SIGN_IN_NOT_VERIFIED');
      }
      const record = data as Record<string, unknown>;
      const verified: VerifiedSession = {
        authenticated: true,
        role: record.role as SessionRole,
        onboarded: record.onboarded === true,
        displayName: typeof record.displayName === 'string' && record.displayName.trim().length > 0
          ? record.displayName.trim().slice(0, 120)
          : undefined,
      };
      setSession(verified);
      setStatus('verified');
      return true;
    } catch {
      setSession(null);
      setStatus('unverified');
      return false;
    }
  }, []);

  /** Called by the separate onboarding page after the owner completes setup. */
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingSaving, setOnboardingSaving] = useState(false);

  /**
   * Only the original Runtime may make onboarding durable. A browser-local label
   * is never proof of completion. The POST must be CSRF-protected server-side,
   * owner-scoped, idempotent, and independently read back from the session API.
   */
  const completeOnboarding = useCallback(async (input: {
    displayName: string; workspaceName: string; deviceLanes: string[];
  }): Promise<boolean> => {
    const writeUrl = approvedUrl(endpoints.onboarding);
    const readUrl = approvedUrl(endpoints.session);
    // Cross-origin credentialed onboarding is not an allowed public UI contract.
    if (!writeUrl || !readUrl ||
        new URL(writeUrl).origin !== window.location.origin ||
        new URL(readUrl).origin !== window.location.origin) {
      setOnboardingError('LeeWay Runtime onboarding is not configured.');
      return false;
    }
    if (!session?.authenticated || session.onboarded ||
        input.displayName.trim().length < 2 || input.workspaceName.trim().length < 2 ||
        input.deviceLanes.length < 1) {
      setOnboardingError('Verified sign-in and complete setup details are required.');
      return false;
    }
    setOnboardingSaving(true);
    setOnboardingError(null);
    try {
      const response = await fetch(writeUrl, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json',
                   'X-LeeWay-Request': 'onboarding' },
        body: JSON.stringify({
          displayName: input.displayName.trim().slice(0, 120),
          workspaceName: input.workspaceName.trim().slice(0, 120),
          deviceLanes: input.deviceLanes,
        }),
      });
      if (!response.ok) throw new Error('ONBOARDING_WRITE_DENIED');
      const persisted: unknown = await response.json();
      if (!persisted || typeof persisted !== 'object' ||
          !('onboarded' in persisted) || persisted.onboarded !== true) {
        throw new Error('ONBOARDING_WRITE_UNVERIFIED');
      }
      const readback = await fetch(readUrl, {
        method: 'GET', credentials: 'same-origin', cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!readback.ok) throw new Error('ONBOARDING_READBACK_DENIED');
      const confirmed: unknown = await readback.json();
      if (!confirmed || typeof confirmed !== 'object' ||
          !('authenticated' in confirmed) || confirmed.authenticated !== true ||
          !('onboarded' in confirmed) || confirmed.onboarded !== true ||
          !('role' in confirmed) || confirmed.role !== session.role) {
        throw new Error('ONBOARDING_READBACK_UNVERIFIED');
      }
      const record = confirmed as Record<string, unknown>;
      setSession({ ...session, onboarded: true,
        displayName: typeof record.displayName === 'string'
          ? record.displayName.slice(0, 120) : input.displayName.trim().slice(0, 120) });
      return true;
    } catch {
      setOnboardingError('LeeWay Runtime did not confirm your setup. Nothing was marked complete.');
      return false;
    } finally {
      setOnboardingSaving(false);
    }
  }, [session]);

  /** Explicit sign-out returns to the gate; no silent re-authentication follows. */
  const signOut = useCallback(() => {
    setSession(null);
    setStatus('unverified');
  }, []);

  return {
    status,
    role: session?.role ?? null,
    onboarded: session?.onboarded ?? false,
    displayName: session?.displayName ?? undefined,
    signIn,
    completeOnboarding,
    onboardingError,
    onboardingSaving,
    signOut,
    endpoints,
  };
}
