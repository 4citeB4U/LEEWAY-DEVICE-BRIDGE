import React, { useEffect, useRef, useState } from 'react';
import {
  Eye,
  Layers,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { StatusIndicator } from './StatusBadge';

const VIRTUAL_TABLET_EMBED_URL = 'https://4citeb4u.github.io/Leeway-Agent-Virtual-Tablet/';

type PreviewFrameSize = 'desktop' | 'tablet' | 'mobile';

interface VirtualTabletPreviewProps {
  onActionLog: (message: string, level: 'info' | 'success' | 'warning', source: string) => void;
  onFocusTabletBridge: () => void;
}

export const VirtualTabletPreview: React.FC<VirtualTabletPreviewProps> = ({
  onActionLog,
  onFocusTabletBridge,
}) => {
  const [frameSize, setFrameSize] = useState<PreviewFrameSize>('desktop');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [inFocus, setInFocus] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Eye-focus: light up this section as the operator scrolls toward the tablet.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInFocus(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setInFocus(entry.isIntersecting);
      },
      { threshold: 0.2, rootMargin: '-8% 0px -12% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleReload = () => {
    setIframeLoaded(false);
    setReloadNonce((n) => n + 1);
    onActionLog('Reloaded LeeWay Agentic Universal O.S. display', 'info', 'Agentic Universal O.S.');
  };

  const frameWidthClass =
    frameSize === 'mobile'
      ? 'max-w-[390px]'
      : frameSize === 'tablet'
        ? 'max-w-[960px]'
        : 'w-full';

  return (
    <section
      ref={sectionRef}
      id="virtual-tablet"
      className={`lw-focus-section ${inFocus ? 'lw-focus-section--active' : ''}`}
      data-testid="virtual-tablet-preview"
      data-focus={inFocus ? 'active' : 'idle'}
      aria-label="LeeWay Agentic Universal O.S. focus area"
    >
      <span className="lw-focus-scan" aria-hidden="true" />
      <span className="lw-focus-flag">
        <Eye className="lw-focus-flag__eye" aria-hidden="true" />
        Focus area · LeeWay Agentic Universal O.S.
      </span>

      {/* Header & In-Page Display Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-display font-semibold text-slate-100 flex items-center gap-2">
              <Tablet className="w-4 h-4 text-cyan-400 shrink-0" />
              LeeWay Agentic Universal O.S.
            </h2>
            <StatusIndicator
              status={iframeLoaded ? 'verified' : 'in_progress'}
              label={iframeLoaded ? 'INTERACTIVE · ACTIVE' : 'INITIALIZING'}
              compact
            />
          </div>
          <p className="text-xs text-slate-400">
            Standalone interactive Agentic Universal O.S. workstation running directly inside the bridge display.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center bg-[#070C13] border border-slate-800 rounded-lg p-0.5 text-xs"
            role="group"
            aria-label="Agentic Universal O.S. display size"
          >
            <button
              type="button"
              onClick={() => setFrameSize('desktop')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                frameSize === 'desktop' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setFrameSize('tablet')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                frameSize === 'tablet' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" /> Tablet
            </button>
            <button
              type="button"
              onClick={() => setFrameSize('mobile')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                frameSize === 'mobile' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile
            </button>
          </div>

          <button
            type="button"
            onClick={onFocusTabletBridge}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Focus 3D Tablet Node
          </button>

          <button
            type="button"
            onClick={handleReload}
            aria-label="Reload Agentic Universal O.S. display"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload
          </button>
        </div>
      </div>

      {/* Scroll-revealed explanation: what it is and what it does. */}
      <div className={`lw-focus-note ${inFocus ? 'lw-focus-note--visible' : ''}`}>
        <span className="lw-focus-note__eye" aria-hidden="true"><Eye className="h-5 w-5" /></span>
        <div className="lw-focus-note__copy">
          <h3>What the Agentic Universal O.S. is</h3>
          <p>
            A LeeWay-owned, browser-based workstation embedded in the bridge. It gives a verified
            account its own private place to run LeeWay tools, hold documents, and keep device work
            in one session — isolated from Creator business records.
          </p>
          <h3>What it does</h3>
          <p>
            It mirrors the tablet lane of the Digital Bridge: state is observed, paired devices are
            listed for the signed-in account, and actions are routed back through the LeeWay Runtime
            for authorization. Sample data here is for demonstration only; nothing executes until the
            authoritative Runtime confirms it.
          </p>
          <p className="lw-focus-note__source">
            Powered by LeeWay Industries · no third-party model keys or external AI services.
          </p>
        </div>
      </div>

      {/* Dedicated Always-On Interactive Virtual Tablet Display */}
      <div className="rounded-xl border border-slate-800 bg-[#060B11] p-2 sm:p-3 flex justify-center">
        <div
          className={`${frameWidthClass} w-full transition-all duration-200 rounded-xl border border-slate-800/90 bg-[#060B11] overflow-hidden`}
        >
          <div className="relative w-full h-[620px] bg-[#060B11]">
            {!iframeLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-slate-400 pointer-events-none">
                <span>Initializing LeeWay Agentic Universal O.S.…</span>
              </div>
            )}
            <iframe
              key={reloadNonce}
              src={VIRTUAL_TABLET_EMBED_URL}
              title="LeeWay Agentic Universal O.S. Interactive Display"
              className="w-full h-full border-0 bg-[#060B11]"
              loading="eager"
              onLoad={() => setIframeLoaded(true)}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
