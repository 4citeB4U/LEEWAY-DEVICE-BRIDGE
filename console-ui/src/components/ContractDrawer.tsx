import React from 'react';
import { Building2, CheckCircle2, FileText, Info, ShieldCheck, UserRound, X } from 'lucide-react';
import { ContractDocument, LEEWAY_PRODUCT_BOUNDARY } from '../data/bridgeData';

interface ContractDrawerProps {
  activeDoc: ContractDocument | null;
  onClose: () => void;
}

function OwnershipCard({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#070C13] p-3.5">
      <div className={`flex items-center gap-2 text-xs font-semibold ${tone}`}>
        {icon}
        {title}
      </div>
      <ul className="mt-2.5 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-slate-300">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Human-readable contract inspector. Raw JSON is available only on request. */
export const ContractDrawer: React.FC<ContractDrawerProps> = ({ activeDoc, onClose }) => {
  if (!activeDoc) return null;
  const { readable } = activeDoc;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/65"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-[#0B121B] border-l border-slate-800 h-full flex flex-col shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-800">
          <div className="flex items-start gap-2.5">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" aria-hidden="true" />
            <div>
              <h2 id="drawer-title" className="text-base font-semibold text-slate-100">
                {activeDoc.title}
              </h2>
              <p className="text-xs text-slate-400">{activeDoc.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <section className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-300">
              <Info className="h-4 w-4" aria-hidden="true" /> In plain language
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{readable.summary}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{readable.explanation}</p>
          </section>

          <section className="space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-100">Who is responsible for what</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <OwnershipCard
                title="LeeWay owns"
                icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
                items={readable.leewayOwns}
                tone="text-cyan-300"
              />
              <OwnershipCard
                title="You own"
                icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
                items={readable.youOwn}
                tone="text-emerald-300"
              />
              <OwnershipCard
                title="Not a LeeWay product"
                icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                items={readable.notLeeway}
                tone="text-amber-300"
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-[#070C13] p-4">
            <h3 className="text-sm font-semibold text-slate-100">What counts as a LeeWay product</h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">LeeWay products</p>
                <ul className="mt-2 space-y-1.5">
                  {LEEWAY_PRODUCT_BOUNDARY.leewayProducts.map((item) => (
                    <li key={item} className="text-[12px] leading-relaxed text-slate-300">• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">Not LeeWay products</p>
                <ul className="mt-2 space-y-1.5">
                  {LEEWAY_PRODUCT_BOUNDARY.notLeewayProducts.map((item) => (
                    <li key={item} className="text-[12px] leading-relaxed text-slate-300">• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-100">Key facts</h3>
            <dl className="overflow-hidden rounded-xl border border-slate-800">
              {readable.facts.map((fact, index) => (
                <div
                  key={fact.label}
                  className={`grid grid-cols-1 gap-1 px-3.5 py-2.5 sm:grid-cols-[180px_1fr] ${
                    index % 2 === 0 ? 'bg-[#070C13]' : 'bg-[#0B121B]'
                  }`}
                >
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{fact.label}</dt>
                  <dd className="text-[12px] leading-relaxed text-slate-200">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <details className="group rounded-xl border border-slate-800 bg-[#060B11]">
            <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-slate-400 hover:text-slate-200">
              Show technical schema (JSON)
            </summary>
            <pre className="max-h-72 overflow-auto border-t border-slate-800 px-4 py-3 text-[11px] font-mono leading-relaxed text-cyan-200">
              {JSON.stringify(activeDoc.payload, null, 2)}
            </pre>
          </details>
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400">
          <span>Observed != Verified · no sample data is presented as live</span>
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
