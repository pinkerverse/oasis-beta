import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentAccountContext,
  type AccountMode,
} from "@/lib/supabase/current-workspace";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ACCOUNT_MODES = new Set<AccountMode>([
  "teacher",
  "school_admin",
  "both",
]);

export async function GET() {
  const supabase = await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const schoolId = await getCurrentSchoolId();

  if (!schoolId) {
    return NextResponse.json({
      school: null,
    });
  }

  const { data: school, error } =
    await supabase
      .from("schools")
      .select("id, name, country")
      .eq("id", schoolId)
      .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    school,
    accountMode: (await getCurrentAccountContext())?.accountMode ?? null,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const existingContext = await getCurrentAccountContext();

  if (existingContext && !existingContext.isSchoolAdmin) {
    return NextResponse.json(
      { error: "School administrator access is required." },
      { status: 403 }
    );
  }

  const body = await request.json();

  const name =
    typeof body.name === "string"
      ? body.name.trim()
      : "";

  const country =
    typeof body.country === "string"
      ? body.country.trim()
      : "";

  const accountMode =
    typeof body.accountMode === "string" &&
    ACCOUNT_MODES.has(body.accountMode as AccountMode)
      ? (body.accountMode as AccountMode)
      : null;
  const confirmDuplicate = body.confirmDuplicate === true;

  if (!name || !country || !accountMode) {
    return NextResponse.json(
      {
        error:
          "Choose how you will use OASIS and enter the school name and country.",
      },
      { status: 400 }
    );
  }

  if (!confirmDuplicate) {
    const existingSchoolId = await getCurrentSchoolId();
    let matchingSchoolQuery = supabaseAdmin
      .from("schools")
      .select("id, name, country")
      .ilike("name", name)
      .ilike("country", country)
      .limit(5);

    if (existingSchoolId) {
      matchingSchoolQuery = matchingSchoolQuery.neq("id", existingSchoolId);
    }

    const { data: matchingSchools } = await matchingSchoolQuery;

    if (matchingSchools?.length) {
      return NextResponse.json(
        {
          error:
            "A school with this name and country already exists. Ask its owner for an invitation, or confirm that this is a separate school.",
          code: "SCHOOL_MAY_ALREADY_EXIST",
          matches: matchingSchools.map((school) => ({
            name: school.name,
            country: school.country,
          })),
        },
        { status: 409 }
      );
    }
  }

  const { data, error } =
    await supabase.rpc(
      "setup_current_school",
      {
        p_name: name,
        p_country: country,
      }
    );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const userId = claimsData.claims.sub as string;
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("school_memberships")
    .select("school_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError || !membership?.school_id) {
    return NextResponse.json(
      { error: "Your school account could not be prepared." },
      { status: 500 }
    );
  }

  const schoolId = membership.school_id as string;
  const needsClass = accountMode === "teacher" || accountMode === "both";
  const { error: schoolOwnerError } = await supabaseAdmin
    .from("schools")
    .update({ owner_user_id: userId, updated_at: new Date().toISOString() })
    .eq("id", schoolId)
    .is("owner_user_id", null);

  if (schoolOwnerError) {
    return NextResponse.json(
      { error: "School ownership could not be prepared." },
      { status: 500 }
    );
  }

  let workspaceId: string | null = null;

  if (needsClass) {
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("teacher_workspaces")
      .upsert(
        { school_id: schoolId, owner_user_id: userId },
        { onConflict: "school_id,owner_user_id" }
      )
      .select("id")
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: "Your class could not be prepared." },
        { status: 500 }
      );
    }

    workspaceId = workspace.id;
    const { error: classMembershipError } = await supabaseAdmin
      .from("teacher_workspace_memberships")
      .upsert(
        {
          school_id: schoolId,
          workspace_id: workspaceId,
          user_id: userId,
          role: "educator",
        },
        { onConflict: "workspace_id,user_id" }
      );

    if (classMembershipError) {
      return NextResponse.json(
        { error: "Your class access could not be prepared." },
        { status: 500 }
      );
    }
  }

  const { error: roleError } = await supabaseAdmin
    .from("school_memberships")
    .update({
      role: "admin",
      account_mode: accountMode,
      is_temporary_owner: accountMode === "teacher",
      current_workspace_id: workspaceId,
    })
    .eq("school_id", schoolId)
    .eq("user_id", userId);

  if (roleError) {
    return NextResponse.json(
      { error: "Your OASIS role could not be saved." },
      { status: 500 }
    );
  }

  const { data: preparedSchool } = await supabaseAdmin
    .from("schools")
    .select("id, name, country")
    .eq("id", schoolId)
    .single();

  return NextResponse.json({
    school: preparedSchool ?? data?.[0] ?? null,
    accountMode,
    workspaceId,
  });
}
