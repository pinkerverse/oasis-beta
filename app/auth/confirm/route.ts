import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null, fallback: string) {
  if (value?.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const isInvitation = type === "invite";
  const isRecovery = type === "recovery";
  const next = safeNextPath(
    requestUrl.searchParams.get("next"),
    isRecovery ? "/reset-password" : "/accept-invitation"
  );

  if (tokenHash && (isInvitation || isRecovery)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: isRecovery ? "recovery" : "invite",
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set(
    "error",
    isRecovery
      ? "That password-reset link is invalid or has expired. Please request a new one."
      : "That invitation is invalid or has expired. Please ask OASIS for a new one."
  );
  return NextResponse.redirect(loginUrl);
}
