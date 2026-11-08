export const OBSERVATION_REVIEW_STATUSES = [
  "needs_review",
  "confirmed",
  "dismissed",
] as const;

export const OBSERVATION_PROCESSING_STATUSES = [
  "processing",
  "completed",
  "failed",
] as const;

export const OBSERVATION_CATEGORIES = [
  "unclassified",
  "internal_teacher_note",
  "share_later",
] as const;

export const OBSERVATION_SHARING_STATUSES = [
  "not_ready",
  "ready_to_share",
  "shared",
] as const;

export type ObservationReviewStatus =
  (typeof OBSERVATION_REVIEW_STATUSES)[number];
export type ObservationProcessingStatus =
  (typeof OBSERVATION_PROCESSING_STATUSES)[number];
export type ObservationCategory =
  (typeof OBSERVATION_CATEGORIES)[number];
export type ObservationSharingStatus =
  (typeof OBSERVATION_SHARING_STATUSES)[number];

export const OBSERVATION_PROCESSING_TIMEOUT_MS = 90_000;

export function isObservationCategory(
  value: unknown
): value is ObservationCategory {
  return OBSERVATION_CATEGORIES.includes(value as ObservationCategory);
}

export function isObservationSharingStatus(
  value: unknown
): value is ObservationSharingStatus {
  return OBSERVATION_SHARING_STATUSES.includes(
    value as ObservationSharingStatus
  );
}

export function localDateKey(date: Date) {
  const adjusted = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );
  return adjusted.toISOString().slice(0, 10);
}

export function observationNeedsAttention(observation: {
  review_status?: unknown;
}) {
  return observation.review_status !== "confirmed" &&
    observation.review_status !== "dismissed";
}

export function observationProcessingIsStale(
  observation: {
    processing_status?: unknown;
    updated_at?: unknown;
    created_at?: unknown;
  },
  now = Date.now()
) {
  if (observation.processing_status !== "processing") return false;

  const source =
    typeof observation.updated_at === "string"
      ? observation.updated_at
      : typeof observation.created_at === "string"
        ? observation.created_at
        : "";
  const startedAt = Date.parse(source);

  return Number.isFinite(startedAt) &&
    now - startedAt >= OBSERVATION_PROCESSING_TIMEOUT_MS;
}

export function inboxBadgeLabel(count: number) {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}
