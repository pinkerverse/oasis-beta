"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type OasisEmbeddedOverlayKind = "observation" | "focus";

type OasisEmbeddedOverlayProps = {
  kind: OasisEmbeddedOverlayKind | null;
  selectedLearnerIds?: string[];
  onClose: () => void;
};

const OVERLAY_MESSAGE = {
  close: "oasis:close-header-overlay",
  ready: "oasis:header-overlay-ready",
} as const;

export default function OasisEmbeddedOverlay({
  kind,
  selectedLearnerIds = [],
  onClose,
}: OasisEmbeddedOverlayProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [readySource, setReadySource] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [slowLoadKey, setSlowLoadKey] = useState("");
  const source = useMemo(() => {
    if (!kind) return "";

    const params = new URLSearchParams({
      embedded: "1",
      panel: kind,
    });

    if (selectedLearnerIds[0]) {
      params.set("learner", selectedLearnerIds[0]);
    }

    return `/?${params.toString()}`;
  }, [kind, selectedLearnerIds]);
  const fallbackSource = useMemo(() => {
    if (!kind) return "/";

    const params = new URLSearchParams({ panel: kind });

    if (selectedLearnerIds[0]) {
      params.set("learner", selectedLearnerIds[0]);
    }

    return `/?${params.toString()}`;
  }, [kind, selectedLearnerIds]);
  const loadKey = `${source}:${loadAttempt}`;
  const loadingSlow = slowLoadKey === loadKey;

  useEffect(() => {
    if (!kind) return;

    function handleMessage(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      ) {
        return;
      }

      if (event.data?.type === OVERLAY_MESSAGE.ready) {
        setReadySource(source);
        setSlowLoadKey("");
      }

      if (event.data?.type === OVERLAY_MESSAGE.close) {
        setReadySource("");
        setSlowLoadKey("");
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("message", handleMessage);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("message", handleMessage);
    };
  }, [kind, onClose, source]);

  useEffect(() => {
    if (!kind || readySource === source) {
      return;
    }

    const slowTimer = window.setTimeout(() => {
      setSlowLoadKey(loadKey);
    }, 8000);

    return () => window.clearTimeout(slowTimer);
  }, [kind, loadKey, readySource, source]);

  if (!kind) return null;

  const title =
    kind === "observation" ? "Add Observation" : "Today’s Focus";
  const ready = readySource === source;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm">
      {!ready && (
        <div className="flex h-full items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="embedded-overlay-loading-title"
            aria-describedby="embedded-overlay-loading-description"
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl sm:p-8"
          >
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 to-indigo-100"
              aria-hidden="true"
            >
              <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-cyan-200 border-t-cyan-700" />
            </div>

            <h2
              id="embedded-overlay-loading-title"
              className="mt-5 text-xl font-bold text-slate-900"
            >
              Preparing {title}
            </h2>
            <p
              id="embedded-overlay-loading-description"
              className="mt-2 text-sm leading-6 text-slate-600"
              aria-live="polite"
            >
              {loadingSlow
                ? "This is taking longer than expected. You can try again or open it from your class page."
                : "OASIS is gathering the latest learner and class evidence."}
            </p>

            {loadingSlow && (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setReadySource("");
                    setSlowLoadKey("");
                    setLoadAttempt((current) => current + 1);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => window.location.assign(fallbackSource)}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Open from My Class
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setReadySource("");
                setSlowLoadKey("");
                onClose();
              }}
              className="mt-4 text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <iframe
        key={loadKey}
        ref={frameRef}
        src={source}
        title={title}
        className={`absolute inset-0 h-full w-full border-0 bg-transparent transition-opacity ${
          ready ? "visible opacity-100" : "invisible opacity-0"
        }`}
      />
    </div>
  );
}
