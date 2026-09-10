import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type BetaAccountMode = "teacher" | "school_admin" | "both";

function normaliseEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function isPlatformAdministrator(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("platform_administrators")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Could not verify OASIS platform access:", error);
    return false;
  }

  return Boolean(data);
}

export async function getCurrentPlatformOwner(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isPlatformAdministrator(user.id))) {
    return null;
  }

  return user;
}

export async function hasCurrentMfaSession() {
  const supabase = await createClient();
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  return !error && data.currentLevel === "aal2";
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
