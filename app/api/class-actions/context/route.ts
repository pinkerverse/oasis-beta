import type { FrameworkDefinition } from "@/lib/framework";
import { loadPlanningFramework } from "@/lib/planning-server";
import {
  getCurrentWorkspaceContext,
  isSchoolAdmin,
} from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type FrameworkMatch = {
  strand?: string;
  assessmentStatus?: string;
  finalLevel?: string;
  suggestedLevel?: string;
  teacherOverride?: string;
  statementMatches?: Array<{
    statementId?: string;
    statementText?: string;
    developmentalLevel?: number | null;
  }>;
};

type EvidenceRecord = {
  learnerId: string;
  observedOn: string;
  frameworkMatches: FrameworkMatch[];
  directObservation: boolean;
};

function localDateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function mondayKey(now = new Date()) {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return localDateKey(monday);
}

function matches(value: unknown): FrameworkMatch[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is FrameworkMatch =>
          Boolean(entry) && typeof entry === "object"
      )
    : [];
}

function statusIndex(value: string, labels: string[]) {
  const normalized = value.trim().toLowerCase();
  return labels.findIndex((label) => label.trim().toLowerCase() === normalized);
}

function createFocusItems({
  assessmentLabels,
  evidence,
  framework,
  learners,
}: {
  assessmentLabels: string[];
  evidence: EvidenceRecord[];
  framework: FrameworkDefinition;
  learners: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
  }>;
}) {
  const weekStart = mondayKey();
  const daySeed = Math.floor(Date.now() / 86_400_000);
  const areas = framework.areaDefinitions.filter(
    (area) =>
      !/characteristics of effective teaching and learning/i.test(area.name)
  );

  return learners
    .map((learner, learnerIndex) => {
      const learnerEvidence = evidence
        .filter((record) => record.learnerId === learner.id)
        .sort((first, second) =>
          second.observedOn.localeCompare(first.observedOn)
        );
      const weeklyObservationCount = learnerEvidence.filter(
        (record) =>
          record.directObservation && record.observedOn >= weekStart
      ).length;
      const areaCounts = new Map<string, number>();
      const latestByArea = new Map<
        string,
        { match: FrameworkMatch; observedOn: string }
      >();

      for (const record of learnerEvidence) {
        for (const match of record.frameworkMatches) {
          if (!match.strand) continue;
          areaCounts.set(match.strand, (areaCounts.get(match.strand) ?? 0) + 1);
          if (!latestByArea.has(match.strand)) {
            latestByArea.set(match.strand, {
              match,
              observedOn: record.observedOn,
            });
          }
        }
      }

      const latest = learnerEvidence
        .flatMap((record) =>
          record.frameworkMatches.map((match) => ({ match, record }))
        )
        .find(({ match }) => Boolean(match.strand));
      const latestStatus = latest
        ? latest.match.teacherOverride ||
          latest.match.finalLevel ||
          latest.match.assessmentStatus ||
          latest.match.suggestedLevel ||
          ""
        : "";
      const latestStatusIndex = statusIndex(latestStatus, assessmentLabels);
      const latestAreaCount = latest?.match.strand
        ? areaCounts.get(latest.match.strand) ?? 0
        : 0;
      const kind =
        latest && latestStatusIndex >= 0 &&
        latestStatusIndex < Math.max(1, Math.ceil(assessmentLabels.length / 2))
          ? "Support"
          : latest && latestStatusIndex === assessmentLabels.length - 1 && latestAreaCount >= 2
            ? "Stretch"
            : "Observe";
      const selectedArea =
        kind === "Observe"
          ? [...areas].sort((first, second) => {
              const countDifference =
                (areaCounts.get(first.name) ?? 0) -
                (areaCounts.get(second.name) ?? 0);
              if (countDifference !== 0) return countDifference;
              const firstDate = latestByArea.get(first.name)?.observedOn ?? "";
              const secondDate = latestByArea.get(second.name)?.observedOn ?? "";
              return firstDate.localeCompare(secondDate);
            })[0]
          : areas.find((area) => area.name === latest?.match.strand) ?? areas[0];
      const latestStatement = latest?.match.statementMatches?.[0];
      const statement =
        kind !== "Observe" && latestStatement
          ? selectedArea?.statements.find(
              (candidate) => candidate.id === latestStatement.statementId
            ) ?? selectedArea?.statements[0]
          : selectedArea?.statements.length
            ? selectedArea.statements[
                (daySeed + learnerIndex) % selectedArea.statements.length
              ]
            : undefined;
      const progression = statement?.progression?.length
        ? statement.progression[
            kind === "Stretch" ? statement.progression.length - 1 : 0
          ]
        : undefined;
      const frameworkStatement =
        latestStatement?.statementText || statement?.text || selectedArea?.name || "Current learning";
      const lookFor =
        progression?.descriptors.filter(Boolean).join(" · ") ||
        statement?.guidance ||
        frameworkStatement;

      return {
        guidanceId: `${localDateKey(new Date())}:${learner.id}:${kind.toLowerCase()}`,
        learnerId: learner.id,
        learnerName: `${learner.firstName ?? ""}${learner.lastName ?? ""}` || "Learner",
        kind,
        area: selectedArea?.name ?? "Current learning",
        reason:
          kind === "Support"
            ? `Recent evidence was recorded as ${latestStatus}.`
            : kind === "Stretch"
              ? "Repeated evidence suggests a deeper application may be useful."
              : "This is one of the learner’s least represented areas this week.",
        frameworkStatementId: statement?.id ?? latestStatement?.statementId ?? null,
        frameworkStatement,
        developmentalLevel:
          progression?.level ?? latestStatement?.developmentalLevel ?? null,
        progressionLabel: progression?.label ?? null,
        readinessLabel:
          kind === "Support"
            ? "Build confidence"
            : kind === "Stretch"
              ? "Ready to deepen"
              : "Notice naturally",
        lookFor,
        prompt: null,
        weeklyObservationCount,
      };
    })
    .sort(
      (first, second) =>
        first.weeklyObservationCount - second.weeklyObservationCount ||
        first.learnerName.localeCompare(second.learnerName)
    )
    .slice(0, 8);
}

export async function GET() {
  const context = await getCurrentWorkspaceContext();

  if (!context) {
    return Response.json(
      { error: "Sign in to your class to use classroom actions." },
      { status: 401 }
    );
  }

  try {
    const db = await createClient();
    const frameworkRecord = await loadPlanningFramework(context);
    let learnerQuery = db
      .from("learners")
      .select("id, first_name, last_name, date_of_birth")
      .eq("school_id", context.schoolId)
      .eq("active", true);
    learnerQuery = isSchoolAdmin(context.role)
      ? learnerQuery.or(
          `workspace_id.eq.${context.workspaceId},workspace_id.is.null`
        )
      : learnerQuery.eq("workspace_id", context.workspaceId);

    let observationQuery = db
      .from("observations")
      .select(
        "learner_ids, observation_date, created_at, framework_matches, review_status"
      )
      .eq("school_id", context.schoolId)
      .eq("review_status", "confirmed");
    observationQuery = isSchoolAdmin(context.role)
      ? observationQuery.or(
          `workspace_id.eq.${context.workspaceId},workspace_id.is.null`
        )
      : observationQuery.eq("workspace_id", context.workspaceId);

    const [learnerResult, observationResult, noteResult, settingsResult] =
      await Promise.all([
        learnerQuery.order("first_name"),
        observationQuery
          .order("observation_date", { ascending: false })
          .limit(500),
        db
          .from("learner_teacher_notes")
          .select("learner_id, observed_on, framework_matches")
          .eq("school_id", context.schoolId)
          .eq("workspace_id", context.workspaceId)
          .order("observed_on", { ascending: false })
          .limit(500),
        db
          .from("school_assessment_settings")
          .select("status_labels, expected_observations_per_learner_per_week")
          .eq("school_id", context.schoolId)
          .maybeSingle(),
      ]);

    if (learnerResult.error || observationResult.error || noteResult.error) {
      throw new Error("Class action data could not be loaded.");
    }

    const learners = (learnerResult.data ?? []).map((learner) => ({
      id: learner.id as string,
      firstName: learner.first_name as string | null,
      lastName: learner.last_name as string | null,
      dateOfBirth: learner.date_of_birth as string | null,
    }));
    const evidence: EvidenceRecord[] = [
      ...(observationResult.data ?? []).flatMap((observation) =>
        (Array.isArray(observation.learner_ids)
          ? observation.learner_ids
          : []
        ).flatMap((learnerId) =>
          typeof learnerId === "string"
            ? [
                {
                  learnerId,
                  observedOn:
                    observation.observation_date ||
                    observation.created_at?.slice(0, 10) ||
                    "",
                  frameworkMatches: matches(observation.framework_matches),
                  directObservation: true,
                },
              ]
            : []
        )
      ),
      ...(noteResult.data ?? []).map((note) => ({
        learnerId: note.learner_id as string,
        observedOn: (note.observed_on as string) || "",
        frameworkMatches: matches(note.framework_matches),
        directObservation: false,
      })),
    ];
    const configuredLabels = Array.isArray(settingsResult.data?.status_labels)
      ? settingsResult.data.status_labels.filter(
          (label): label is string => typeof label === "string" && Boolean(label.trim())
        )
      : [];
    const assessmentLabels =
      configuredLabels.length >= 2
        ? configuredLabels
        : [...frameworkRecord.definition.assessmentLevels]
            .sort((first, second) => first.order - second.order)
            .map((level) => level.label);
    const weeklyTarget = Math.max(
      1,
      Number(
        settingsResult.data?.expected_observations_per_learner_per_week ?? 2
      ) || 2
    );
    const weekStart = mondayKey();
    const weeklyCounts = Object.fromEntries(
      learners.map((learner) => [
        learner.id,
        evidence.filter(
          (record) =>
            record.directObservation &&
            record.learnerId === learner.id &&
            record.observedOn >= weekStart
        ).length,
      ])
    );

    return Response.json(
      {
        learners,
        frameworkKey: frameworkRecord.definition.key,
        weeklyTarget,
        weeklyCounts,
        focusItems: createFocusItems({
          assessmentLabels,
          evidence,
          framework: frameworkRecord.definition,
          learners,
        }),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Classroom actions could not be loaded.",
      },
      { status: 503 }
    );
  }
}
