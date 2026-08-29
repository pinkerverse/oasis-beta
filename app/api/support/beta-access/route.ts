import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const ALLOWED_ROLES = new Set([
  "Teacher",
  "School leader",
  "Early years practitioner",
  "Teaching assistant",
  "Other",
]);

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalRateLimit = globalThis as typeof globalThis & {
  oasisBetaAccessRateLimit?: Map<string, RateLimitEntry>;
};

const rateLimitStore =
  globalRateLimit.oasisBetaAccessRateLimit ?? new Map<string, RateLimitEntry>();

globalRateLimit.oasisBetaAccessRateLimit = rateLimitStore;

function getClientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(request: Request) {
  const now = Date.now();
  const key = getClientKey(request);
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return true;

  current.count += 1;
  return false;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const requestOrigin = new URL(request.url).origin;
    const origin = request.headers.get("origin");

    if (origin && origin !== requestOrigin) {
      return NextResponse.json(
        { error: "This request could not be verified." },
        { status: 403 }
      );
    }

    if (isRateLimited(request)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const name = readString(body?.name);
    const email = readString(body?.email).toLowerCase();
    const school = readString(body?.school);
    const role = readString(body?.role);
    const note = readString(body?.note);
    const website = readString(body?.website);

    if (website) {
      return NextResponse.json({
        success: true,
        message: "Thanks—your beta access request has been sent to OASIS.",
      });
    }

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "Enter your name." },
        { status: 400 }
      );
    }

    if (email.length > 254 || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (school.length < 2 || school.length > 160) {
      return NextResponse.json(
        { error: "Enter your school or setting." },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        { error: "Choose a valid role." },
        { status: 400 }
      );
    }

    if (note.length > 1000) {
      return NextResponse.json(
        { error: "Please keep your note under 1,000 characters." },
        { status: 400 }
      );
    }

    const supportEmail = process.env.OASIS_SUPPORT_EMAIL;
    const gmailUser = process.env.OASIS_SUPPORT_GMAIL_USER;
    const gmailAppPassword = process.env.OASIS_SUPPORT_GMAIL_APP_PASSWORD;

    if (!supportEmail || !gmailUser || !gmailAppPassword) {
      console.error("OASIS beta access email configuration is incomplete.");
      return NextResponse.json(
        {
          error:
            "Beta access requests are temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });
    const safeSchoolForSubject = school.replace(/[\r\n]+/g, " ").slice(0, 80);

    await transporter.sendMail({
      from: {
        name: "OASIS Beta",
        address: gmailUser,
      },
      to: supportEmail,
      replyTo: email,
      subject: `OASIS Beta Access Request — ${safeSchoolForSubject}`,
      text: `
OASIS Beta Access Request

Name:
${name}

Email:
${email}

School or setting:
${school}

Role:
${role}

What they would like to use OASIS for:
${note || "Not provided"}
      `.trim(),
    });

    return NextResponse.json({
      success: true,
      message:
        "Thanks—your request has been sent. We’ll contact you about beta access.",
    });
  } catch (error) {
    console.error("Beta access request failed:", error);
    return NextResponse.json(
      { error: "Your request could not be sent. Please try again." },
      { status: 500 }
    );
  }
}
