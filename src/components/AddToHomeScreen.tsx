'use client';

import { useEffect, useState } from 'react';
import { dictionaries, type AppDict } from '@/lib/i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'tresh:a2hs-dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Ana ekrana ekleme çağrısı. iOS'ta Safari izin diyaloğu göstermeden önce
 * uygulamanın ana ekrana eklenmiş (standalone) olmasını şart koşar — bu
 * yüzden "push izni istemiyor" şikayetinin gerçek çözümü burada.
 */
export default function AddToHomeScreen({ d }: { d: AppDict }) {
  const [dismissed, setDismissed] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(ios);
    setDismissed(false);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (dismissed) return null;
  if (!isIos && !deferredPrompt) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  return (
    <div className="mt-3 rounded-2xl border p-3.5" style={{ borderColor: 'rgba(255,150,74,0.3)', background: 'rgba(255,150,74,0.06)' }}>
      <div className="flex items-start gap-2.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 flex-none text-overflow">
          {isIos ? (
            <path d="M12 3v12m0-12 4 4m-4-4-4 4M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M12 3v12m0-12 4 4m-4-4-4 4M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
        <div className="flex-1">
          <div className="text-[13px] text-content-primary">{isIos ? d.installIosTitle : d.installAndroidTitle}</div>
          <div className="mt-1 text-[11.5px] leading-relaxed text-content-secondary">
            {isIos ? d.installIosBody : d.installAndroidBody}
          </div>
          {isIos && (
            <ol className="mt-2 flex flex-col gap-1 text-[11.5px] leading-relaxed text-content-secondary">
              {d.installIosSteps.map((step, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="flex-none text-overflow">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
          {!isIos && deferredPrompt && (
            <button
              onClick={install}
              className="mt-2.5 rounded-lg border border-overflow/40 bg-overflow/15 px-3 py-1.5 text-[12px] text-overflow"
            >
              {d.installAndroidCta}
            </button>
          )}
        </div>
        <button onClick={dismiss} aria-label={d.installDismiss} title={d.installDismiss} className="flex-none px-1 text-content-secondary">
          ×
        </button>
      </div>
    </div>
  );
}
