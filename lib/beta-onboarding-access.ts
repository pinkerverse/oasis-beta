export function canStartSchoolOnboarding({
  hasExistingAccountContext,
  hasPendingPlatformInvitation,
}: {
  hasExistingAccountContext: boolean;
  hasPendingPlatformInvitation: boolean;
}) {
  return hasExistingAccountContext || hasPendingPlatformInvitation;
}
