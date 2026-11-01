import OpenAI from "openai";

import { findPriorPtcPortraitReuse } from "@/lib/asb-midyear-report";
import {
  genericSchoolReportToPlainText,
  normaliseGenericSchoolReport,
} from "@/lib/generic-school-report";
import { loadImportedLearnerContext } from "@/lib/document-import-server";
import { DOCUMENT_CONTEXT_RULES } from "@/lib/document-import";
import {
  getLearnerInitials,
  replaceLearnerNamesWithInitials,
} from "@/lib/learner-privacy";
import { privacyReviewResponse, reviewPrivacyText } from "@/lib/privacy-guardrails";
import {
  EARLY_YEARS_REPORT_WRITING_PROMPT,
  reportFrameworkBridgePrompt,
} from "@/lib/report-writing-quality";
import {
  isSchoolReportKind,
  schoolReportTemplatePrompt,
} from "@/lib/school-report-template";
import { loadActiveSchoolReportTemplate } from "@/lib/school-report-template-server";
import { recordSecurityEvent } from "@/lib/security-audit";
import {
  getCurrentWorkspaceContext,
  isSchoolAdmin,
} from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function cleanText(value: unknown, maximumLength = 2600) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maximumLength)
    : "";
}

function priorPtcText(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const report = value as Record<string, unknown>;
  if (Array.isArray(report.learnerProfile)) {
    return report.learnerProfile.flatMap((item) => item && typeof item === "object"
      ? [cleanText((item as Record<string, unknown>).text, 1800)]
      : []).filter(Boolean).join(" ");
  }
  if (Array.isArray(report.sections)) {
    return report.sections.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const section = item as Record<string, unknown>;
      return [cleanText(section.text, 3000), ...(Array.isArray(section.bullets) ? section.bullets.map((bullet) => cleanText(bullet, 500)) : [])];
    }).filter(Boolean).join(" ");
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentWorkspaceContext();
    if (!context) return Response.json({ error: "Sign in to your class before generating a report." }, { status: 401 });
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const learnerId = cleanText(body.learnerId, 100);
    const reportKind = body.reportKind;
    if (!learnerId) return Response.json({ error: "Choose a learner first." }, { status: 400 });
    if (!isSchoolReportKind(reportKind)) return Response.json({ error: "Choose a school report type." }, { status: 400 });

    const db = await createClient();
    const template = await loadActiveSchoolReportTemplate(db, context.schoolId, reportKind);
    if (!template) {
      return Response.json({ error: "Your school has not activated this report format yet. Open School report formats in Tools to upload or approve one." }, { status: 404 });
    }

    let learnerQuery = db.from("learners")
      .select("id, first_name, last_name")
      .eq("id", learnerId)
      .eq("school_id", context.schoolId)
      .eq("active", true);
    learnerQuery = isSchoolAdmin(context.role)
      ? learnerQuery.or(`workspace_id.eq.${context.workspaceId},workspace_id.is.null`)
      : learnerQuery.eq("workspace_id", context.workspaceId);

    let classQuery = db.from("learners")
      .select("first_name, last_name")
      .eq("school_id", context.schoolId)
      .eq("active", true);
    classQuery = isSchoolAdmin(context.role)
      ? classQuery.or(`workspace_id.eq.${context.workspaceId},workspace_id.is.null`)
      : classQuery.eq("workspace_id", context.workspaceId);

    let observationQuery = db.from("observations")
      .select("id, observation, observation_date, created_at, next_steps, teacher_notes, framework_matches")
      .eq("school_id", context.schoolId)
      .contains("learner_ids", [learnerId]);
    observationQuery = isSchoolAdmin(context.role)
      ? observationQuery.or(`workspace_id.eq.${context.workspaceId},workspace_id.is.null`)
      : observationQuery.eq("workspace_id", context.workspaceId);

    const [learnerResult, classResult, observationResult, teacherNoteResult, priorPtcResult, frameworkResult] = await Promise.all([
      learnerQuery.maybeSingle(),
      classQuery,
      observationQuery.order("observation_date", { ascending: false }).order("created_at", { ascending: false }).limit(60),
      db.from("learner_teacher_notes")
        .select("id, observed_on, note, context, attainment_signal, support_level, pattern")
        .eq("school_id", context.schoolId)
        .eq("workspace_id", context.workspaceId)
        .eq("learner_id", learnerId)
        .order("observed_on", { ascending: false })
        .limit(30),
      db.from("learner_report_history")
        .select("report_data")
        .eq("school_id", context.schoolId)
        .eq("workspace_id", context.workspaceId)
        .eq("learner_id", learnerId)
        .eq("report_kind", "ptc")
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from("framework_versions")
        .select("definition")
        .eq("school_id", context.schoolId)
        .eq("status", "active")
        .maybeSingle(),
    ]);
    if (learnerResult.error || !learnerResult.data) return Response.json({ error: "Learner not found." }, { status: 404 });
    if (classResult.error || observationResult.error) throw new Error("Learner evidence could not be loaded.");

    const privacyIdentities = (classResult.data ?? []).map((learner) => ({ firstName: learner.first_name, lastName: learner.last_name }));
    const learnerInitials = getLearnerInitials({ firstName: learnerResult.data.first_name, lastName: learnerResult.data.last_name });
    const observations = (observationResult.data ?? []).flatMap((entry) => {
      const observation = replaceLearnerNamesWithInitials(cleanText(entry.observation), privacyIdentities);
      if (!observation) return [];
      return [{
        id: entry.id,
        date: entry.observation_date || entry.created_at,
        observation,
        teacherNotes: replaceLearnerNamesWithInitials(cleanText(entry.teacher_notes, 1200), privacyIdentities),
        nextSteps: Array.isArray(entry.next_steps) ? entry.next_steps.map((step) => replaceLearnerNamesWithInitials(cleanText(step, 500), privacyIdentities)).filter(Boolean) : [],
        frameworkMatches: entry.framework_matches,
      }];
    });
    const teacherNotes = (teacherNoteResult.data ?? []).flatMap((note) => {
      const text = replaceLearnerNamesWithInitials(cleanText(note.note, 1800), privacyIdentities);
      if (!text || reviewPrivacyText(text).requiresReview) return [];
      return [{ id: `teacher-note:${note.id}`, date: note.observed_on, note: text, context: cleanText(note.context, 120), attainmentSignal: note.attainment_signal, supportLevel: note.support_level, pattern: note.pattern }];
    });
    const importedContext = await loadImportedLearnerContext(context, learnerId, privacyIdentities);
    const priorPtc = reportKind === "ptc" ? "" : priorPtcText(priorPtcResult.data?.report_data);
    const sourceText = JSON.stringify({ observations, teacherNotes, importedContext });
    const privacyReview = reviewPrivacyText(sourceText);
    if (privacyReview.requiresReview) {
      await recordSecurityEvent({ actorUserId: context.userId, eventKey: "privacy_guardrail_triggered", outcome: "denied", request, schoolId: context.schoolId, severity: "warning", targetId: learnerId, targetType: `school_${reportKind}_report` });
      return Response.json(privacyReviewResponse(privacyReview), { status: 422 });
    }
    if (!observations.length && !teacherNotes.length && !importedContext.length) {
      return Response.json({ error: "OASIS needs at least one observation, teacher note or reviewed learner upload before writing this report." }, { status: 400 });
    }

    const validEvidenceIds = new Set<string>([
      ...observations.map((entry) => entry.id),
      ...teacherNotes.map((entry) => entry.id),
    ]);
    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["sections"],
      properties: {
        sections: {
          type: "array",
          minItems: template.profile.sections.length,
          maxItems: template.profile.sections.length,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "text", "bullets", "evidenceEntryIds"],
            properties: {
              key: { type: "string", enum: template.profile.sections.map((section) => section.key) },
              text: { type: "string" },
              bullets: { type: "array", maxItems: 8, items: { type: "string" } },
              evidenceEntryIds: { type: "array", maxItems: 8, items: { type: "string" } },
            },
          },
        },
      },
    } as const;

    let report = null;
    let reuseFeedback = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const prompt = `You are an experienced early-years educator writing a ${reportKind} draft for learner ${learnerInitials}. Use only the supplied learner evidence. Never invent, diagnose, infer family information, or turn support into independence. Use initials only.\n\n${EARLY_YEARS_REPORT_WRITING_PROMPT}\n\n${reportFrameworkBridgePrompt(frameworkResult.data?.definition)}\n\nREPORT OUTPUT CONTRACT\n- Include evidence IDs only in evidenceEntryIds.\n- Every section key must appear exactly once in the supplied order. For narrative sections, bullets must be empty. For bullet sections, text must be empty. Mixed sections may use both.\n- Follow each section word limit and the total limit. If no limit is stated, be concise without making the section thin.\n${priorPtc ? "- This is a later report. The prior PTC is exclusion material only: use new evidence and different examples. Do not copy, lightly paraphrase, or reuse its sentences, structure, anecdotes or learning moments.\n" : ""}${reuseFeedback}\n\nPRIVATE SCHOOL FORMAT — APPLIES ONLY TO THIS SCHOOL\n${schoolReportTemplatePrompt(template.profile)}\n\n${DOCUMENT_CONTEXT_RULES}\n\nLEARNER EVIDENCE\n${sourceText}\n\nPRIOR PTC TO AVOID REPEATING\n${priorPtc || "None"}`;
      const response = await openai.responses.create({
        model: process.env.REPORT_HELPER_MODEL || "gpt-4.1-mini",
        store: false,
        temperature: 0,
        input: prompt,
        text: { format: { type: "json_schema", name: "school_report_draft", strict: true, schema } },
      });
      if (response.status !== "completed" || !response.output_text) throw new Error("Report generation did not finish.");
      report = normaliseGenericSchoolReport({
        value: JSON.parse(response.output_text),
        learnerId,
        learnerInitials,
        templateId: template.id,
        templateName: template.name,
        reportKind,
        profile: template.profile,
        validEvidenceIds,
      });
      const reused = priorPtc ? findPriorPtcPortraitReuse(genericSchoolReportToPlainText(report), priorPtc) : [];
      if (!reused.length) break;
      report = null;
      reuseFeedback = `\nYour previous attempt reused or lightly paraphrased these prior-PTC sentences. Rewrite using different evidence and examples: ${JSON.stringify(reused)}`;
    }
    if (!report) return Response.json({ error: "OASIS could not create a sufficiently distinct report from the saved PTC. Add a newer teacher note or observation and try again." }, { status: 409 });

    const outputPrivacy = reviewPrivacyText(genericSchoolReportToPlainText(report));
    if (outputPrivacy.requiresReview) return Response.json(privacyReviewResponse(outputPrivacy), { status: 422 });
    const saved = await db.from("learner_report_history").insert({
      school_id: context.schoolId,
      workspace_id: context.workspaceId,
      learner_id: learnerId,
      created_by: context.userId,
      report_kind: reportKind,
      report_data: report,
    });
    if (saved.error) throw new Error("The private report history could not be saved.");
    return Response.json({ report, template: { id: template.id, name: template.name } });
  } catch (error) {
    console.error("School report draft generation failed:", error);
    return Response.json({ error: error instanceof Error && /^(Learner evidence|The private)/.test(error.message) ? error.message : "The report could not be generated right now. No learner evidence was changed." }, { status: 500 });
  }
}
