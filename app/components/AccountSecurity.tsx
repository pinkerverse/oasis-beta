"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

type TotpFactor = {
  id: string;
  friendly_name?: string;
};

type TotpEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

function qrCodeSource(value: string) {
  if (value.startsWith("data:")) return value;
  return `data:image/svg+xml;utf8,${encodeURIComponent(value)}`;
}

export default function AccountSecurity({
  mfaRequired,
}: {
  mfaRequired: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [verifiedFactor, setVerifiedFactor] = useState<TotpFactor | null>(null);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSecurityStatus = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    const [factorsResult, assuranceResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    if (factorsResult.error || assuranceResult.error) {
      setError("Your account security status could not be loaded.");
      setLoading(false);
      return;
    }

    const firstTotpFactor = factorsResult.data.totp[0] ?? null;
    setVerifiedFactor(firstTotpFactor);
    setCurrentLevel(assuranceResult.data.currentLevel);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadSecurityStatus(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadSecurityStatus]);

  async function startEnrollment() {
    setWorking(true);
    setError("");
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();
      const factorsResult = await supabase.auth.mfa.listFactors();

      if (factorsResult.error) throw factorsResult.error;

      const staleFactors = factorsResult.data.all.filter(
        (factor) =>
          factor.factor_type === "totp" && factor.status === "unverified"
      );

      for (const factor of staleFactors) {
        const { error: removeError } = await supabase.auth.mfa.unenroll({
          factorId: factor.id,
        });
        if (removeError) throw removeError;
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "OASIS authenticator",
      });

      if (enrollError) throw enrollError;

      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setCode("");
    } catch (enrollmentError) {
      setError(
        enrollmentError instanceof Error
          ? enrollmentError.message
          : "Authenticator setup could not be started."
      );
    } finally {
      setWorking(false);
    }
  }

  async function verifyAuthenticator() {
    const factorId = enrollment?.factorId ?? verifiedFactor?.id;

    if (!factorId || !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: verificationError } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId,
          code,
        });

      if (verificationError) throw verificationError;

      setEnrollment(null);
      setCode("");
      setMessage("Authenticator verified. Administrator actions are unlocked.");
      await loadSecurityStatus();
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "That code could not be verified."
      );
    } finally {
      setWorking(false);
    }
  }

  async function signOutOtherDevices() {
    setWorking(true);
    setError("");
    setMessage("");

    const supabase = createBrowserSupabaseClient();
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "others",
    });

    if (signOutError) {
      setError(signOutError.message || "Other sessions could not be signed out.");
    } else {
      setMessage("Other OASIS sessions have been signed out.");
    }

    setWorking(false);
  }

  const verifiedNow = currentLevel === "aal2";

  return (
    <section className="rounded-2xl border border-slate-200 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Account security
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {mfaRequired
              ? "An authenticator is required before you can manage people, permissions or OASIS administration."
              : "Add an authenticator for extra protection, especially on shared school devices."}
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
            verifiedNow
              ? "bg-emerald-100 text-emerald-800"
              : verifiedFactor
                ? "bg-amber-100 text-amber-900"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {loading
            ? "Checking…"
            : verifiedNow
              ? "Verified now"
              : verifiedFactor
                ? "Verification needed"
                : "Not set up"}
        </span>
      </div>

      {!loading && !verifiedFactor && !enrollment && (
        <button
          type="button"
          onClick={() => void startEnrollment()}
          disabled={working}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {working ? "Preparing…" : "Set up authenticator"}
        </button>
      )}

      {enrollment && (
        <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <p className="font-semibold text-slate-900">
            Scan this code with your authenticator app
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Google Authenticator, Microsoft Authenticator, 1Password and similar
            apps all work.
          </p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-fit rounded-2xl bg-white p-3 shadow-sm">
              <Image
                src={qrCodeSource(enrollment.qrCode)}
                width={176}
                height={176}
                alt="OASIS authenticator QR code"
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Can’t scan it?
              </p>
              <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-700">
                {enrollment.secret}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Keep this setup key private. OASIS will not show it again after
                verification.
              </p>
            </div>
          </div>
        </div>
      )}

      {!verifiedNow && (verifiedFactor || enrollment) && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block text-sm font-semibold text-slate-700">
            6-digit authenticator code
            <input
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono tracking-[0.25em] text-slate-900 sm:w-64"
            />
          </label>
          <button
            type="button"
            onClick={() => void verifyAuthenticator()}
            disabled={working || code.length !== 6}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {working ? "Verifying…" : "Verify authenticator"}
          </button>
        </div>
      )}

      <div className="mt-5 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => void signOutOtherDevices()}
          disabled={working}
          className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 transition hover:text-red-700 disabled:opacity-50"
        >
          Sign out all other devices
        </button>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Use this immediately if a school device is lost or someone may still be
          signed in.
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {message}
        </p>
      )}
    </section>
  );
}
