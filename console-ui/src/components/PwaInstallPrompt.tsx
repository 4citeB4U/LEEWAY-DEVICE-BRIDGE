import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const iosStandalone = 'standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || iosStandalone);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setMessage('LeeWay web app installed on this device.');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) {
    return <p className="mt-4 text-sm text-emerald-300" role="status">
      LeeWay browser app is installed. Device permissions still require separate authorization.
    </p>;
  }

  return (
    <section className="mt-5 rounded-lg border border-cyan-900/50 bg-[#09141E] p-3 text-xs text-slate-300" aria-label="Install LeeWay web application">
      <div className="flex items-center gap-2 font-semibold text-cyan-200">
        <Smartphone size={16} aria-hidden="true" /> Install LeeWay browser app
      </div>
      <p className="mt-1">Available across supported operating systems using your browser. No unsigned native installer or configuration profile is required.</p>
      {promptEvent ? (
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-cyan-500 px-3 py-2 font-semibold text-slate-950"
          onClick={async () => {
            try {
              await promptEvent.prompt();
              const choice = await promptEvent.userChoice;
              setMessage(choice.outcome === 'accepted'
                ? 'Installation accepted. Your browser will confirm completion.'
                : 'Installation dismissed. You can try again from your browser menu.');
              setPromptEvent(null);
            } catch {
              setMessage('Use your browser install menu to add LeeWay as an app.');
            }
          }}
        ><Download size={15} aria-hidden="true"/> Install web app</button>
      ) : (
        <details className="mt-2">
          <summary className="cursor-pointer font-semibold text-cyan-300">Installation steps for my device</summary>
          <p className="mt-2">Apple iPhone/iPad: Safari → Share → Add to Home Screen. Mac: Safari → File → Add to Dock where supported.</p>
          <p className="mt-1">Windows/Linux/Android: open the LeeWay site in a compatible browser, then use its Install App or Add to Home Screen menu when available.</p>
          <p className="mt-1">Browser installation is the secure web interface; native camera, Metal, accessibility and other device capabilities require a separate authorized adapter.</p>
        </details>
      )}
      {message && <p className="mt-2 text-amber-200" role="status">{message}</p>}
    </section>
  );
}
