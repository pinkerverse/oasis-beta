import { NextResponse } from "next/server";

import { getCurrentAccountContext } from "@/lib/supabase/current-workspace";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function startOfCurrentWeek() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start.toISOString();
}

export async function GET() {
  const context = await getCurrentAccountContext();

  if (!context?.isSchoolAdmin) {
    return NextResponse.json(
      { error: "School administrator access is required." },
      { status: 403 }
    );
  }

  const [schoolResult, workspaceResult, classMemberResult, learnerResult, observationResult, teamResult] =
    await Promise.all([
      supabaseAdmin
        .from("schools")
        .select("id, name, country")
        .eq("id", context.schoolId)
        .single(),
      supabaseAdmin
        .from("teacher_workspaces")
        .select("id, name, owner_user_id, created_at")
        .eq("school_id", context.schoolId)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("teacher_workspace_memberships")
        .select("workspace_id, user_id")
        .eq("school_id", context.schoolId),
      supabaseAdmin
        .from("learners")
        .select("id, workspace_id")
        .eq("school_id", context.schoolId)
        .eq("active", true),
      supabaseAdmin
        .from("observations")
        .select("id, workspace_id, learner_ids, observation_date, created_at")
        .eq("school_id", context.schoolId)
        .gte("observation_date", startOfCurrentWeek().slice(0, 10)),
      supabaseAdmin
        .from("school_memberships")
        .select("user_id, role")
        .eq("school_id", context.schoolId),
    ]);

  const firstError = [
    schoolResult.error,
    workspaceResult.error,
    classMemberResult.error,
    learnerResult.error,
    observationResult.error,
    teamResult.error,
  ].find(Boolean);

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const userIds = [
    ...new Set((classMemberResult.data ?? []).map((item) => item.user_id)),
  ];
  const userNames = new Map<string, string>();

  await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
      const metadata = data.user?.user_metadata;
      const name =
        typeof metadata?.full_name === "string"
          ? metadata.full_name
          : typeof metadata?.name === "string"
            ? metadata.name
            : data.user?.email ?? "Educator";
      userNames.set(userId, name);
    })
  );

  const learners = learnerResult.data ?? [];
  const observations = observationResult.data ?? [];
  const classMembers = classMemberResult.data ?? [];
  const classes = (workspaceResult.data ?? []).map((workspace) => {
    const classLearners = learners.filter(
      (learner) => learner.workspace_id === workspace.id
    );
    const classObservations = observations.filter(
      (observation) => observation.workspace_id === workspace.id
    );
    const observedLearnerIds = new Set(
      classObservations.flatMap((observation) => observation.learner_ids ?? [])
    );
    const educators = classMembers
      .filter((member) => member.workspace_id === workspace.id)
      .map((member) => ({
        id: member.user_id,
        name: userNames.get(member.user_id) ?? "Educator",
      }));

    return {
      id: workspace.id,
      name: workspace.name,
      canOpen: context.workspaceIds.includes(workspace.id),
      educators,
      learnerCount: classLearners.length,
      learnersObservedThisWeek: classLearners.filter((learner) =>
        observedLearnerIds.has(learner.id)
      ).length,
      observationsThisWeek: classObservations.length,
    };
  });

  return NextResponse.json({
    school: schoolResult.data,
    account: {
      hasClass: context.hasClass,
      isOwner: context.isSchoolOwner,
      isTemporaryOwner: context.isTemporaryOwner,
      currentWorkspaceId: context.workspaceId,
    },
    summary: {
      classCount: classes.length,
      educatorCount: new Set(classMembers.map((member) => member.user_id)).size,
      learnerCount: learners.length,
      observationsThisWeek: observations.length,
    },
    classes,
  });
}
