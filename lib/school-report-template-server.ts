import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normaliseSchoolReportFormatProfile,
  type SchoolReportKind,
  type SchoolReportFormatProfile,
} from "./school-report-template.ts";

export type ActiveSchoolReportTemplate = {
  id: string;
  name: string;
  reportKind: SchoolReportKind;
  profile: SchoolReportFormatProfile;
};

export async function loadActiveSchoolReportTemplate(
  db: SupabaseClient,
  schoolId: string,
  reportKind: SchoolReportKind
): Promise<ActiveSchoolReportTemplate | null> {
  const { data, error } = await db
    .from("school_report_templates")
    .select("id, name, report_kind, format_profile")
    .eq("school_id", schoolId)
    .eq("report_kind", reportKind)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw error;
  }
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    reportKind: data.report_kind as SchoolReportKind,
    profile: normaliseSchoolReportFormatProfile(data.format_profile),
  };
}
