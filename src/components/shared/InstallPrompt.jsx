import { useState, useEffect } from 'react';

const DISMISS_KEY = 'gofit_install_dismissed_at';
const DISMISS_DAYS = 7;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function wasDismissedRecently() {
  const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
  if (!ts) return false;
  return (Date.now() - ts) < DISMISS_DAYS * 86400000;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosBanner, setShowIosBanner]   = useState(false);
  const [dismissed, setDismissed]           = useState(wasDismissedRecently());

  useEffect(() => {
    if (isStandalone() || dismissed) return;

    // Android / Chrome / Edge — الحدث الرسمي
    function onBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS Safari مش بيدعم الحدث ده أصلاً — بانر تعليمات يدوية
    if (isIos()) setShowIosBanner(true);

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, [dismissed]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosBanner(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (dismissed || (!deferredPrompt && !showIosBanner)) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] p-3">
      <div className="max-w-sm mx-auto bg-slate-900 border-2 border-emerald-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <span className="text-2xl shrink-0">📲</span>
        <div className="flex-1 min-w-0">
          <p className="text-emerald-400 font-black text-sm">Install GoFit App</p>
          {deferredPrompt ? (
            <p className="text-slate-400 text-[11px] font-bold">Add to your home screen for quick access</p>
          ) : (
            <p className="text-slate-400 text-[11px] font-bold">Tap Share ⬆️ then "Add to Home Screen"</p>
          )}
        </div>
        {deferredPrompt && (
          <button onClick={install} className="bg-emerald-500 text-slate-900 text-xs font-black px-3 py-2 rounded-xl shrink-0">
            Install
          </button>
        )}
        <button onClick={dismiss} className="text-slate-500 text-lg leading-none px-1 shrink-0">✕</button>
      </div>
    </div>
  );
}
