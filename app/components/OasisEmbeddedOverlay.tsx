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
      }

      if (event.data?.type === OVERLAY_MESSAGE.close) {
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

  if (!kind) return null;

  const title =
    kind === "observation" ? "Add Observation" : "Today’s Focus";
  const ready = readySource === source;

  return (
    <div className="fixed inset-0 z-50 bg-transparent">
      <iframe
        key={source}
        ref={frameRef}
        src={source}
        title={title}
        className={`h-full w-full border-0 bg-transparent transition-opacity ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
