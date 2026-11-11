import type { AccountMode } from "@/lib/supabase/current-workspace";

export type OnboardingStep = -1 | 0 | 1 | 2 | 3 | 4 | 5;

export function getNextOnboardingStep(input: {
  hasSchool: boolean;
  hasAcademicYear: boolean;
  accountMode: AccountMode | null;
  learnerCount: number;
  hasActiveFramework: boolean;
}): OnboardingStep {
  if (!input.hasSchool) return -1;
  if (!input.hasAcademicYear) return 1;

  const schoolAdminOnly = input.accountMode === "school_admin";

  if (!schoolAdminOnly && input.learnerCount === 0) return 2;
  if (!input.hasActiveFramework) return 3;

  return schoolAdminOnly ? 5 : 4;
}
