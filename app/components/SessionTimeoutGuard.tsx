"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

const IDLE_LIMIT_MS = 60 * 60 * 1000;
const SESSION_LIMIT_MS = 12 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "oasis:last-activity-at";
const SESSION_STARTED_KEY = "oasis:session-started-at";

function readTimestamp(key: string) {
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function clearSessionTimers() {
  window.localStorage.removeItem(LAST_ACTIVITY_KEY);
  window.localStorage.removeItem(SESSION_STARTED_KEY);
}

export default function SessionTimeoutGuard() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let signedIn = false;
    let signingOut = false;

    function initialiseTimers() {
      const now = Date.now();
      signedIn = true;
      if (!readTimestamp(SESSION_STARTED_KEY)) {
        window.localStorage.setItem(SESSION_STARTED_KEY, String(now));
      }
      if (!readTimestamp(LAST_ACTIVITY_KEY)) {
        window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      }
    }

    function recordActivity() {
      if (signedIn && !signingOut) {
        window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      }
    }

    async function enforceTimeout() {
      if (!signedIn || signingOut) return;

      const now = Date.now();
      const lastActivity = readTimestamp(LAST_ACTIVITY_KEY) ?? now;
      const sessionStarted = readTimestamp(SESSION_STARTED_KEY) ?? now;
      const idleExpired = now - lastActivity >= IDLE_LIMIT_MS;
      const sessionExpired = now - sessionStarted >= SESSION_LIMIT_MS;

      if (!idleExpired && !sessionExpired) return;

      signingOut = true;
      clearSessionTimers();
      await supabase.auth.signOut({ scope: "local" });
      const reason = idleExpired
        ? "For your protection, OASIS signed you out after 60 minutes without activity."
        : "For your protection, OASIS requires a fresh sign-in after 12 hours.";
      router.replace(`/login?error=${encodeURIComponent(reason)}`);
      router.refresh();
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) initialiseTimers();
      else clearSessionTimers();
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) initialiseTimers();
        if (event === "SIGNED_OUT") {
          signedIn = false;
          clearSessionTimers();
        }
      }
    );

    const activityEvents = ["pointerdown", "keydown", "touchstart"] as const;
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, { passive: true })
    );
    const interval = window.setInterval(() => void enforceTimeout(), 60_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void enforceTimeout();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      listener.subscription.unsubscribe();
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity)
      );
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router]);

  return null;
}
