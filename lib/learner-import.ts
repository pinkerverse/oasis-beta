export const PRIVATE_SURNAME_PLACEHOLDER = "Not shared";

export type LearnerDateOrder = "DMY" | "MDY";

type ParsedLearnerDate = {
  date: string;
  isValid: boolean;
};

const monthNumbers: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function expandYear(year: number) {
  if (year >= 100) return year;
  return 2000 + year;
}

function buildIsoDate(
  yearValue: number,
  month: number,
  day: number
): ParsedLearnerDate {
  const year = expandYear(yearValue);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();

  if (
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getTime() > today.getTime()
  ) {
    return { date: "", isValid: false };
  }

  return {
    date: `${year.toString().padStart(4, "0")}-${month
      .toString()
      .padStart(2, "0")}-${day.toString().padStart(2, "0")}`,
    isValid: true,
  };
}

function parseTextMonth(value: string): ParsedLearnerDate | null {
  const parts = value
    .toLowerCase()
    .replace(/,/g, " ")
    .split(/[\s./-]+/)
    .filter(Boolean);

  if (parts.length !== 3) return null;

  const monthIndex = parts.findIndex(
    (part) => monthNumbers[part] !== undefined
  );

  if (monthIndex === -1) return null;

  const month = monthNumbers[parts[monthIndex]];
  const numericParts = parts.map((part) => Number(part));

  if (
    numericParts.some(
      (part, index) => index !== monthIndex && !Number.isInteger(part)
    )
  ) {
    return { date: "", isValid: false };
  }

  if (monthIndex === 0) {
    return buildIsoDate(numericParts[2], month, numericParts[1]);
  }

  if (monthIndex === 1) {
    if (parts[0].length === 4) {
      return buildIsoDate(numericParts[0], month, numericParts[2]);
    }

    return buildIsoDate(numericParts[2], month, numericParts[0]);
  }

  return buildIsoDate(numericParts[0], month, numericParts[1]);
}

export function inferLearnerDateOrder(
  values: Array<string | null | undefined>
): LearnerDateOrder | null {
  let dayFirstEvidence = 0;
  let monthFirstEvidence = 0;

  for (const rawValue of values) {
    const value = rawValue?.trim();
    if (!value) continue;

    const match = value.match(
      /^(\d{1,2})[\s./-](\d{1,2})[\s./-](\d{2}|\d{4})$/
    );

    if (!match) continue;

    const first = Number(match[1]);
    const second = Number(match[2]);

    if (first > 12 && second <= 12) dayFirstEvidence += 1;
    if (second > 12 && first <= 12) monthFirstEvidence += 1;
  }

  if (dayFirstEvidence > monthFirstEvidence) return "DMY";
  if (monthFirstEvidence > dayFirstEvidence) return "MDY";
  return null;
}

export function normaliseLearnerDate(
  rawValue: unknown,
  numericOrder: LearnerDateOrder = "DMY"
): ParsedLearnerDate {
  if (rawValue === null || rawValue === undefined) {
    return { date: "", isValid: true };
  }

  const value = String(rawValue).trim();
  if (!value) return { date: "", isValid: true };

  const textMonthDate = parseTextMonth(value);
  if (textMonthDate) return textMonthDate;

  const yearFirstMatch = value.match(
    /^(\d{4})[\s./-](\d{1,2})[\s./-](\d{1,2})$/
  );

  if (yearFirstMatch) {
    const second = Number(yearFirstMatch[2]);
    const third = Number(yearFirstMatch[3]);
    const usesYearDayMonth = second > 12 && third <= 12;

    return buildIsoDate(
      Number(yearFirstMatch[1]),
      usesYearDayMonth ? third : second,
      usesYearDayMonth ? second : third
    );
  }

  const yearLastMatch = value.match(
    /^(\d{1,2})[\s./-](\d{1,2})[\s./-](\d{2}|\d{4})$/
  );

  if (yearLastMatch) {
    const first = Number(yearLastMatch[1]);
    const second = Number(yearLastMatch[2]);
    const year = Number(yearLastMatch[3]);
    const order =
      first > 12
        ? "DMY"
        : second > 12
        ? "MDY"
        : numericOrder;

    return order === "DMY"
      ? buildIsoDate(year, second, first)
      : buildIsoDate(year, first, second);
  }

  // Spreadsheet applications sometimes export dates as Excel serial values.
  if (/^\d{5}$/.test(value)) {
    const serial = Number(value);
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + serial * 86_400_000);

    return buildIsoDate(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate()
    );
  }

  return { date: "", isValid: false };
}

export function normaliseOptionalSurname(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : PRIVATE_SURNAME_PLACEHOLDER;
}
