"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  DICTATION_MAX_BYTES,
  DICTATION_MAX_SECONDS,
  type DictationMode,
  validateDictationAudio,
} from "@/lib/dictation";

type VoiceDictationProps = {
  mode: DictationMode;
  disabled?: boolean;
  onTranscript: (text: string) => void;
};

type DictationStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "transcribing";

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function recordingFileName(mediaType: string) {
  if (mediaType.includes("mp4")) return "oasis-dictation.m4a";
  if (mediaType.includes("ogg")) return "oasis-dictation.ogg";
  if (mediaType.includes("wav")) return "oasis-dictation.wav";
  return "oasis-dictation.webm";
}

function preferredMediaType() {
  if (typeof MediaRecorder === "undefined") return "";

  return (
    ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
      MediaRecorder.isTypeSupported(type)
    ) ?? ""
  );
}

export default function VoiceDictation({
  mode,
  disabled = false,
  onTranscript,
}: VoiceDictationProps) {
  const [expanded, setExpanded] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  function clearTimers() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    timerRef.current = null;
    maxTimerRef.current = null;
  }

  function releaseMicrophone() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearTimers();
      releaseMicrophone();
      const recorder = recorderRef.current;

      if (recorder?.state === "recording") recorder.stop();
      recorderRef.current = null;
      chunksRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!expanded || status !== "idle") return;

    function closeWhenClickingOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setExpanded(false);
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }

    document.addEventListener("mousedown", closeWhenClickingOutside);
    document.addEventListener("keydown", closeWithEscape);

    return () => {
      document.removeEventListener("mousedown", closeWhenClickingOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [expanded, status]);

  async function sendRecording(blob: Blob) {
    const mediaType = blob.type || "audio/webm";
    const audio = new File([blob], recordingFileName(mediaType), {
      type: mediaType,
    });
    const validationError = validateDictationAudio(audio);

    if (validationError) {
      setError(validationError);
      setStatus("idle");
      return;
    }

    if (audio.size > DICTATION_MAX_BYTES) {
      setError("That recording is too large. Keep voice notes under three minutes.");
      setStatus("idle");
      return;
    }

    try {
      setStatus("transcribing");
      const formData = new FormData();
      formData.append("audio", audio);
      formData.append("mode", mode);
      formData.append("privacyConfirmed", "true");

      const response = await fetch("/api/transcribe-dictation", {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || typeof result.text !== "string") {
        throw new Error(
          result.error || "OASIS could not transcribe that recording. Please try again."
        );
      }

      onTranscript(result.text);
      setMessage(
        result.polished === false
          ? mode === "observation"
            ? "Added the transcript. Review it, then analyze the observation."
            : "Added the transcript. Review it before saving."
          : mode === "observation"
            ? "Added a polished observation draft. Review it, then analyze it."
            : "Added a polished note draft. Review it before saving."
      );
    } catch (transcriptionError) {
      setError(
        transcriptionError instanceof Error
          ? transcriptionError.message
          : "OASIS could not transcribe that recording. Please try again."
      );
    } finally {
      if (mountedRef.current) setStatus("idle");
    }
  }

  async function startRecording() {
    setError("");
    setMessage("");

    if (!privacyConfirmed) {
      setError("Confirm the privacy reminder before recording.");
      return;
    }

    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      setStatus("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaType = preferredMediaType();
      const recorder = mediaType
        ? new MediaRecorder(stream, { mimeType: mediaType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      setSeconds(0);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener(
        "stop",
        () => {
          clearTimers();
          releaseMicrophone();
          recorderRef.current = null;
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          chunksRef.current = [];

          if (mountedRef.current) void sendRecording(blob);
        },
        { once: true }
      );
      recorder.start(1_000);
      setStatus("recording");
      timerRef.current = setInterval(() => {
        setSeconds((current) => current + 1);
      }, 1_000);
      maxTimerRef.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, DICTATION_MAX_SECONDS * 1_000);
    } catch (recordingError) {
      clearTimers();
      releaseMicrophone();
      recorderRef.current = null;
      setStatus("idle");
      setError(
        recordingError instanceof DOMException && recordingError.name === "NotAllowedError"
          ? "Microphone access was not allowed. Enable it in your browser and try again."
          : "OASIS could not start the microphone. Please try again."
      );
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }

  const busy = status !== "idle";
  const buttonLabel =
    status === "recording"
      ? `Recording voice note, ${formatDuration(seconds)}`
      : status === "transcribing"
        ? "Transcribing voice note"
        : "Dictate with microphone";

  return (
    <div ref={rootRef} className="absolute right-3 top-3 z-30">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        disabled={disabled || busy}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={buttonLabel}
        title={buttonLabel}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border bg-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 ${
          status === "recording"
            ? "border-red-300 text-red-600"
            : status === "transcribing" || status === "requesting"
              ? "border-cyan-300 text-cyan-700"
              : expanded
                ? "border-cyan-400 text-cyan-800"
                : "border-slate-200 text-slate-600 hover:border-cyan-300 hover:text-cyan-800"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[18px] w-[18px]"
        >
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M6.5 10.5a5.5 5.5 0 0 0 11 0" />
          <path d="M12 16v4" />
          <path d="M9 20h6" />
        </svg>
        {status === "recording" && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-white bg-red-500" />
        )}
      </button>

      {expanded && (
        <div
          id={panelId}
          className="absolute right-0 top-12 w-80 max-w-[calc(100vw-3rem)] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl sm:w-96"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Voice dictation</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                OASIS will turn your recording into an editable draft.
              </p>
            </div>
            {!busy && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Close voice dictation"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  className="h-4 w-4"
                >
                  <path d="m5 5 10 10M15 5 5 15" />
                </svg>
              </button>
            )}
          </div>

          <label className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <input
              type="checkbox"
              checked={privacyConfirmed}
              onChange={(event) => setPrivacyConfirmed(event.target.checked)}
              disabled={busy}
              className="mt-1 h-4 w-4 shrink-0 accent-cyan-700"
            />
            <span>
              I will use learner initials only and will not record medical,
              safeguarding, family-contact or other sensitive information. Audio is
              sent to OpenAI for transcription and is not saved by OASIS.
            </span>
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {status === "recording" ? (
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Stop recording · {formatDuration(seconds)}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startRecording()}
                disabled={disabled || busy || !privacyConfirmed}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {status === "requesting"
                  ? "Opening microphone…"
                  : status === "transcribing"
                    ? "Transcribing and polishing…"
                    : "Start recording"}
              </button>
            )}
            <span className="text-xs text-slate-500">
              Up to 3 minutes. You can edit the draft before saving.
            </span>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p className="mt-3 text-xs font-semibold text-emerald-700">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}
