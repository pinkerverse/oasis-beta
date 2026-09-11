export type PrivacyFindingCategory =
  | "email_address"
  | "full_birth_date"
  | "likely_full_name"
  | "medical_information"
  | "phone_number"
  | "safeguarding_information";

export type PrivacyFinding = {
  category: PrivacyFindingCategory;
  kind: "direct_identifier" | "sensitive_case_information";
};

export type PrivacyReview = {
  findings: PrivacyFinding[];
  requiresReview: boolean;
};

const FINDING_LABELS: Record<PrivacyFindingCategory, string> = {
  email_address: "an email address",
  full_birth_date: "a full date of birth",
  likely_full_name: "a likely full name",
  medical_information: "medical or diagnostic information",
  phone_number: "a phone number",
  safeguarding_information: "safeguarding or child-protection information",
};

const NON_NAME_PHRASES = new Set([
  "adult support",
  "art area",
  "child protection",
  "circle time",
  "class teacher",
  "critical thinking",
  "early years",
  "learning area",
  "learning objective",
  "medical information",
  "morning circle",
  "outdoor area",
  "privacy review",
  "school child",
  "small group",
  "social services",
  "support staff",
  "whole class",
]);

const LEADING_NON_NAME_WORDS = new Set([
  "after",
  "although",
  "before",
  "during",
  "following",
  "inside",
  "later",
  "outside",
  "since",
  "today",
  "tomorrow",
  "when",
  "while",
  "yesterday",
]);

function hasLikelyFullName(
  value: string,
  context: "file_name" | "narrative"
) {
  const candidates = value.matchAll(
    /\b(\p{Lu}\p{Ll}{1,30}(?:[-'’]\p{Lu}?\p{Ll}+)?)[ \t]+(\p{Lu}\p{Ll}{1,30}(?:[-'’]\p{Lu}?\p{Ll}+)?)\b/gu
  );

  for (const candidate of candidates) {
    const firstWord = candidate[1].toLocaleLowerCase();
    const phrase = `${candidate[1]} ${candidate[2]}`.toLocaleLowerCase();

    if (
      !NON_NAME_PHRASES.has(phrase) &&
      !LEADING_NON_NAME_WORDS.has(firstWord)
    ) {
      if (context === "file_name") {
        return true;
      }

      const candidateStart = candidate.index ?? 0;
      const candidateEnd = candidateStart + candidate[0].length;
      const precedingText = value.slice(
        Math.max(0, candidateStart - 40),
        candidateStart
      );
      const followingText = value.slice(candidateEnd, candidateEnd + 45);

      if (
        /\b(?:called|child|learner|named|pupil|student)\s*$/i.test(
          precedingText
        ) ||
        /^\s+(?:asked|attempted|built|chose|completed|counted|created|demonstrated|described|drew|explained|explored|had|has|identified|is|joined|made|matched|noticed|played|responded|said|selected|shared|showed|sorted|used|was|worked|wrote)\b/i.test(
          followingText
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function hasPhoneNumber(value: string) {
  const candidates = value.match(
    /(?:^|[^\d])(?:\+?\d{1,3}[ .()-]?)?(?:\(?\d{2,4}\)?[ .-])\d{3,4}[ .-]\d{3,4}(?=$|[^\d])/g
  );

  return Boolean(
    candidates?.some(
      (candidate) => candidate.replace(/\D/g, "").length >= 8
    )
  );
}

function addFinding(
  findings: PrivacyFinding[],
  category: PrivacyFindingCategory,
  kind: PrivacyFinding["kind"]
) {
  if (!findings.some((finding) => finding.category === category)) {
    findings.push({ category, kind });
  }
}

export function reviewPrivacyText(
  value: unknown,
  options: { context?: "file_name" | "narrative" } = {}
): PrivacyReview {
  if (typeof value !== "string" || !value.trim()) {
    return { findings: [], requiresReview: false };
  }

  const findings: PrivacyFinding[] = [];

  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)) {
    addFinding(findings, "email_address", "direct_identifier");
  }

  if (
    /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/.test(
      value
    ) ||
    /\b(?:0?[1-9]|[12]\d|3[01])[/.](?:0?[1-9]|1[0-2])[/.](?:19|20)\d{2}\b/.test(
      value
    ) ||
    /\b(?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(?:19|20)\d{2}\b/i.test(
      value
    ) ||
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?[,]?\s+(?:19|20)\d{2}\b/i.test(
      value
    )
  ) {
    addFinding(findings, "full_birth_date", "direct_identifier");
  }

  if (hasLikelyFullName(value, options.context ?? "narrative")) {
    addFinding(findings, "likely_full_name", "direct_identifier");
  }

  if (hasPhoneNumber(value)) {
    addFinding(findings, "phone_number", "direct_identifier");
  }

  if (
    /\b(?:adhd|allerg(?:y|ic)|asthma|autis(?:m|tic)|blood pressure|diagnos(?:is|ed|tic)|diabetes|epilepsy|health record|medical (?:condition|record|report)|medication|prescription|seizure|therap(?:y|ist))\b/i.test(
      value
    )
  ) {
    addFinding(findings, "medical_information", "sensitive_case_information");
  }

  if (
    /\b(?:abuse|child protection|custody order|domestic violence|neglect|police report|safeguarding|self[- ]harm|social services)\b/i.test(
      value
    ) ||
    /\b(?:made|making|received|reported)\s+(?:a\s+)?disclosure\b/i.test(value) ||
    /\bsafeguarding\s+allegation\b/i.test(value)
  ) {
    addFinding(
      findings,
      "safeguarding_information",
      "sensitive_case_information"
    );
  }

  return {
    findings,
    requiresReview: findings.length > 0,
  };
}

export function privacyFindingLabels(review: PrivacyReview) {
  return review.findings.map((finding) => FINDING_LABELS[finding.category]);
}

export function privacyReviewMessage(review: PrivacyReview) {
  const labels = privacyFindingLabels(review);

  if (labels.length === 0) {
    return "";
  }

  const formattedLabels =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;

  return `OASIS noticed ${formattedLabels}. Review and remove sensitive details before continuing. Use learner initials or a school child ID, and keep medical or safeguarding case information in your school's approved system.`;
}

export function privacyReviewResponse(review: PrivacyReview) {
  return {
    code: "PRIVACY_REVIEW_REQUIRED",
    error: privacyReviewMessage(review),
    findings: review.findings.map((finding) => finding.category),
  };
}

export function hasEvidencePrivacyConfirmation(value: unknown) {
  return value === true || value === "true";
}
