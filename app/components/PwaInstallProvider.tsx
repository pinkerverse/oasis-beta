"use client";

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { closeModalOnBackdropPress } from "@/lib/modal-backdrop";

const INSTALL_URL = "https://useoasis.app";
const DISMISS_KEY = "oasis-install-shortcut-dismissed-v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallContextValue = {
  canPromptInstall: boolean;
  isStandalone: boolean;
  openInstallGuide: () => void;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error("usePwaInstall must be used inside PwaInstallProvider");
  }
  return context;
}

function ShareIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5" />
      <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function InstructionStep({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm ring-1 ring-slate-200">
        {icon}
      </span>
      <span className="pt-1 text-sm leading-6 text-slate-700">{children}</span>
    </li>
  );
}

function InstallGuide({
  canPromptInstall,
  onClose,
  onNativeInstall,
}: {
  canPromptInstall: boolean;
  onClose: () => void;
  onNativeInstall: () => Promise<void>;
}) {
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [qrCode, setQrCode] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const platformTimer = window.setTimeout(
      () => setPlatform(isAndroid ? "android" : "ios"),
      0
    );
    closeButtonRef.current?.focus();

    let cancelled = false;
    void import("qrcode").then(async ({ default: QRCode }) => {
      const image = await QRCode.toDataURL(INSTALL_URL, {
        width: 264,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      if (!cancelled) setQrCode(image);
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      cancelled = true;
      window.clearTimeout(platformTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      className="oasis-modal-backdrop fixed inset-0 z-[120] flex justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
      onPointerDown={(event) => closeModalOnBackdropPress(event, onClose)}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="oasis-install-title"
        className="oasis-modal-surface w-full max-w-4xl overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
      >
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-indigo-50 px-5 py-6 sm:px-8 sm:py-8">
          <div aria-hidden="true" className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-200/30 blur-3xl" />
          <div className="relative flex items-start gap-4 pr-12">
            <Image src="/icons/oasis-192.png" alt="" width={64} height={64} className="h-14 w-14 rounded-2xl shadow-lg ring-1 ring-slate-900/10 sm:h-16 sm:w-16" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700">OASIS on every device</p>
              <h2 id="oasis-install-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Take OASIS with you</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Open OASIS from your phone or tablet home screen—no app store required.</p>
            </div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close installation guide" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-xl text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900 sm:right-6 sm:top-6">×</button>
        </div>

        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
          <div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Choose your device">
              <button type="button" role="tab" aria-selected={platform === "ios"} onClick={() => setPlatform("ios")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${platform === "ios" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>iPhone / iPad</button>
              <button type="button" role="tab" aria-selected={platform === "android"} onClick={() => setPlatform("android")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${platform === "android" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Android</button>
            </div>

            <ol className="mt-5 space-y-3">
              {platform === "ios" ? (
                <>
                  <InstructionStep icon={<ShareIcon />}>Open <strong>useoasis.app</strong> in Safari, then tap the Share button.</InstructionStep>
                  <InstructionStep icon={<AddIcon />}>Scroll down and choose <strong>Add to Home Screen</strong>.</InstructionStep>
                  <InstructionStep icon={<span className="text-sm font-bold">Add</span>}>Confirm by tapping <strong>Add</strong>. OASIS will appear with your other apps.</InstructionStep>
                </>
              ) : (
                <>
                  <InstructionStep icon={<MenuIcon />}>Open <strong>useoasis.app</strong> in Chrome and tap the three-dot menu.</InstructionStep>
                  <InstructionStep icon={<AddIcon />}>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</InstructionStep>
                  <InstructionStep icon={<span className="text-sm font-bold">OK</span>}>Confirm the installation. OASIS will open in its own app window.</InstructionStep>
                </>
              )}
            </ol>

            {canPromptInstall && (
              <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4">
                <p className="text-sm font-semibold text-slate-900">This browser can install OASIS for you.</p>
                <button type="button" onClick={() => void onNativeInstall()} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">Install OASIS</button>
              </div>
            )}
          </div>

          <aside className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-sm font-semibold text-slate-900">Open OASIS on your phone</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Scan with your phone camera, then follow the steps for your device.</p>
            <div className="mt-4 flex h-[216px] w-[216px] items-center justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              {qrCode ? <Image unoptimized src={qrCode} alt="QR code for useoasis.app" width={192} height={192} className="h-full w-full" /> : <div className="h-36 w-36 animate-pulse rounded-xl bg-slate-100" aria-label="Preparing QR code" />}
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">useoasis.app</p>
          </aside>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-8">
          OASIS still needs an internet connection. Installation adds a convenient app icon and full-screen workspace; it does not store learner records offline.
        </div>
      </section>
    </div>
  );
}

export default function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showShortcut, setShowShortcut] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const safariStandalone = "standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const syncStandalone = () => setIsStandalone(displayMode.matches || safariStandalone);
    const syncOnline = () => setOnline(navigator.onLine);
    syncStandalone();
    syncOnline();

    const shortcutTimer = window.setTimeout(() => {
      try {
        setShowShortcut(localStorage.getItem(DISMISS_KEY) !== "1");
      } catch {
        setShowShortcut(true);
      }
    }, 0);

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const installed = () => {
      setInstallEvent(null);
      setIsStandalone(true);
      setShowGuide(false);
    };

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    displayMode.addEventListener("change", syncStandalone);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      }).catch(() => {
        // Installation guidance remains useful if registration is unavailable.
      });
    }

    return () => {
      window.clearTimeout(shortcutTimer);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
      displayMode.removeEventListener("change", syncStandalone);
    };
  }, []);

  const openInstallGuide = useCallback(() => setShowGuide(true), []);
  const closeInstallGuide = useCallback(() => setShowGuide(false), []);
  const promptNativeInstall = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setShowGuide(false);
    setInstallEvent(null);
  }, [installEvent]);

  const dismissShortcut = useCallback(() => {
    setShowShortcut(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Dismissal still applies for the current page if storage is unavailable.
    }
  }, []);

  const context = useMemo(() => ({
    canPromptInstall: Boolean(installEvent),
    isStandalone,
    openInstallGuide,
  }), [installEvent, isStandalone, openInstallGuide]);

  return (
    <PwaInstallContext.Provider value={context}>
      {children}

      {!online && (
        <div role="status" aria-live="polite" className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[130] mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-950 shadow-lg">
          OASIS needs an internet connection. Reconnect to continue working safely.
        </div>
      )}

      {!isStandalone && showShortcut && !showGuide && (
        <div className="oasis-install-fab fixed right-6 z-[55] items-center gap-2" style={{ bottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))" }}>
          <button type="button" onClick={openInstallGuide} className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_12px_35px_-10px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10 transition hover:-translate-y-0.5 hover:shadow-xl" aria-label="Get OASIS on your phone">
            <Image src="/icons/oasis-192.png" alt="" width={48} height={48} className="h-11 w-11 rounded-xl" />
            <span role="tooltip" className="pointer-events-none absolute bottom-full right-0 mb-3 w-max max-w-56 translate-y-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">Get OASIS on your phone</span>
          </button>
          <button type="button" onClick={dismissShortcut} aria-label="Dismiss installation shortcut" title="Dismiss" className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-400 shadow-sm transition hover:text-slate-800">×</button>
        </div>
      )}

      {showGuide && <InstallGuide canPromptInstall={Boolean(installEvent)} onClose={closeInstallGuide} onNativeInstall={promptNativeInstall} />}
    </PwaInstallContext.Provider>
  );
}
