"use client";

import { useEffect, useRef, useState } from "react";

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

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        disabled={disabled || busy}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-800"
          >
            🎙
          </span>
          Dictate instead
        </span>
        <span className="text-sm text-slate-500" aria-hidden="true">
          {expanded ? "⌃" : "⌄"}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <label className="flex items-start gap-2 rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
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
