import React from 'react';
import { ExternalLink, Github, LifeBuoy, Mail, Phone, Globe, ShieldCheck } from 'lucide-react';
import { approvedUrl } from '../hooks/useLeeWaySession';

const ISSUES_URL = 'https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/issues';
const REPOSITORY_URL = 'https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE';
const TABLET_SOURCE_URL = 'https://github.com/4citeB4U/Leeway-Agent-Virtual-Tablet';

const env = import.meta.env;
const configuredEmail = (env.VITE_LEEWAY_CONTACT_EMAIL as string | undefined)?.trim() || '';
const configuredPhone = (env.VITE_LEEWAY_CONTACT_PHONE as string | undefined)?.trim() || '';
const configuredUrl = approvedUrl((env.VITE_LEEWAY_CONTACT_URL as string | undefined)?.trim());

/** Only a simple, verified-looking phone string is rendered when configured. */
const safePhone = /^\+?[0-9 ()-]{7,20}$/.test(configuredPhone) ? configuredPhone : null;

/**
 * Contact Us. Direct channels appear only when an approved value is configured.
 * No phone number or address is invented, and no personal contact detail is
 * published as an active link without verification.
 */
export function ContactSection() {
  return (
    <section id="contact" className="rounded-xl border border-slate-800 bg-[#0B121B] p-5 sm:p-6" aria-labelledby="contact-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="contact-title" className="flex items-center gap-2 text-base font-display font-semibold text-slate-100">
            <LifeBuoy className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            Contact Us
          </h2>
          <p className="mt-1.5 text-xs text-slate-400">
            LeeWay-owned support channels. No personal contact details are published here.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Authorized channels only
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-cyan-500/30 bg-[#070C13] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
            <Github className="h-4 w-4" aria-hidden="true" />
            Technical support &amp; issue reporting
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
            Report onboarding, device, or extension issues through the LeeWay Device Bridge issue tracker.
          </p>
          <a
            href={ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-cyan-300 hover:text-cyan-200"
          >
            Open LeeWay Device Bridge Issues <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>

        {configuredEmail && (
          <div className="rounded-lg border border-slate-800 bg-[#070C13] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
              <Mail className="h-4 w-4 text-amber-300" aria-hidden="true" />
              Business email
            </div>
            <p className="mt-2 break-all text-[12px] text-slate-300">{configuredEmail}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-amber-300">
              Configured from Creator information. Delivery and public-support use are not yet verified; this address is shown for reference only and is not an active contact link.
            </p>
          </div>
        )}

        {safePhone && (
          <div className="rounded-lg border border-slate-800 bg-[#070C13] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
              <Phone className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              Telephone
            </div>
            <a href={`tel:${safePhone.replace(/[^0-9+]/g, '')}`} className="mt-2 inline-block text-[12px] text-slate-300 hover:text-white">
              {safePhone}
            </a>
          </div>
        )}

        {configuredUrl && (
          <div className="rounded-lg border border-slate-800 bg-[#070C13] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
              <Globe className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              Support website
            </div>
            <a
              href={configuredUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 break-all text-[12px] text-cyan-300 hover:text-cyan-200"
            >
              {configuredUrl} <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-800 pt-3 text-[11px]">
        <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200">
          Device Bridge repository <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
        <a href={TABLET_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200">
          Agentic Universal O.S. source <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
