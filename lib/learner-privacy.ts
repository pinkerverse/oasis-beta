export type LearnerNameParts = {
  firstName?: string | null;
  lastName?: string | null;
};

function firstCharacter(value: string | null | undefined) {
  return Array.from(value?.trim() ?? "")[0] ?? "";
}

export function getLearnerInitials(
  learnerOrFirstName: LearnerNameParts | string | null | undefined,
  lastName?: string | null
) {
  const firstName =
    typeof learnerOrFirstName === "object" && learnerOrFirstName !== null
      ? learnerOrFirstName.firstName
      : learnerOrFirstName;
  const surname =
    typeof learnerOrFirstName === "object" && learnerOrFirstName !== null
      ? learnerOrFirstName.lastName
      : lastName;
  const privateSurname = /^not shared$/i.test(surname?.trim() ?? "")
    ? ""
    : surname;
  const initials = `${firstCharacter(firstName)}${firstCharacter(privateSurname)}`
    .toLocaleUpperCase()
    .trim();

  return initials || "—";
}

export function formatLearnerBirthMonthYear(
  value: string | null | undefined
) {
  const match = value?.match(/^(\d{4})-(\d{2})/);

  if (!match) {
    return "Birth month not shared";
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(Date.UTC(year, month - 1, 1));

  if (
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    Number.isNaN(date.getTime())
  ) {
    return "Birth month not shared";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function birthMonthInputValue(
  value: string | null | undefined
) {
  return /^\d{4}-\d{2}/.test(value ?? "") ? (value ?? "").slice(0, 7) : "";
}

export function birthMonthToStoredDate(value: string) {
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : "";
}

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function replaceLearnerNamesWithInitials(
  value: string,
  learners: LearnerNameParts[]
) {
  const firstNameCounts = new Map<string, number>();

  for (const learner of learners) {
    const firstName = learner.firstName?.trim().toLocaleLowerCase();

    if (firstName) {
      firstNameCounts.set(firstName, (firstNameCounts.get(firstName) ?? 0) + 1);
    }
  }

  const replacements = learners.flatMap((learner) => {
    const firstName = learner.firstName?.trim() ?? "";
    const lastName = learner.lastName?.trim() ?? "";
    const fullName = `${firstName} ${lastName}`.trim();
    const initials = getLearnerInitials(learner);
    const aliases = [fullName];

    if (
      firstName.length > 1 &&
      firstNameCounts.get(firstName.toLocaleLowerCase()) === 1
    ) {
      aliases.push(firstName);
    }

    return aliases
      .filter((alias) => alias.length > 1)
      .map((alias) => ({ alias, initials }));
  });

  return replacements
    .sort((first, second) => second.alias.length - first.alias.length)
    .reduce((text, replacement) => {
      const matcher = new RegExp(
        `(^|[^\\p{L}\\p{N}])${escapeRegularExpression(replacement.alias)}(?=$|[^\\p{L}\\p{N}])`,
        "giu"
      );

      return text.replace(
        matcher,
        (_match, prefix: string) => `${prefix}${replacement.initials}`
      );
    }, value);
}
