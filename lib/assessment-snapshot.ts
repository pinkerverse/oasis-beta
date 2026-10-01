export function canStartSnapshotAreaFromObservation({
  fromSelection,
  isAtOrBeforeCutoff,
}: {
  fromSelection: string;
  isAtOrBeforeCutoff: boolean;
}) {
  if (fromSelection === "Baseline") {
    return false;
  }

  if (fromSelection === "First Evidence") {
    return true;
  }

  return isAtOrBeforeCutoff;
}
