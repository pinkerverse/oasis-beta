import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type BetaAccountMode = "teacher" | "school_admin" | "both";

const BOOTSTRAP_PLATFORM_OWNER_EMAILS = ["s.eichhorn.se@gmail.com"];

function normaliseEmail(value: string) {
  return value.trim().toLowerCase();
}

function configuredPlatformOwnerEmails() {
  const configured = process.env.OASIS_PLATFORM_OWNER_EMAILS ?? "";
  const supportEmail = process.env.OASIS_SUPPORT_EMAIL ?? "";

  return new Set(
    `${BOOTSTRAP_PLATFORM_OWNER_EMAILS.join(",")},${configured},${supportEmail}`
      .split(",")
      .map(normaliseEmail)
      .filter(Boolean)
  );
}

export function isPlatformOwnerEmail(email: string | null | undefined) {
  if (!email) return false;
  return configuredPlatformOwnerEmails().has(normaliseEmail(email));
}

export async function getCurrentPlatformOwner(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user && isPlatformOwnerEmail(user.email) ? user : null;
}

export async function getPendingPlatformInvitation(
  userId: string,
  email: string
) {
  const now = new Date().toISOString();
  const normalisedEmail = normaliseEmail(email);

  const { data, error } = await supabaseAdmin
    .from("platform_invitations")
    .select(
      "id, name, email, school_name, account_mode, personal_message, auth_user_id, expires_at, beta_request_id"
    )
    .eq("email", normalisedEmail)
    .eq("status", "pending")
    .gt("expires_at", now)
    .or(`auth_user_id.is.null,auth_user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Could not load the current platform invitation:", error);
    return null;
  }

  return data;
}
