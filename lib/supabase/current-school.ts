import { createClient } from "@/lib/supabase/server";

export async function getCurrentSchoolId() {
  const supabase = await createClient();

const {
  data: claimsData,
  error: claimsError,
} = await supabase.auth.getClaims();

const claims = claimsData?.claims;

if (claimsError || !claims?.sub) {
  return null;
}

  const { data: membership, error: membershipError } =
    await supabase
      .from("school_memberships")
      .select("school_id")
      .eq("user_id", claims.sub)
      .maybeSingle();

  if (membershipError || !membership) {
    return null;
  }

  return membership.school_id as string;
}