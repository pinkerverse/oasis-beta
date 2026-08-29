import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

import { getCurrentSchoolId } from "@/lib/supabase/current-school";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_ATTACHMENT_SIZE =
  15 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "xlsx",
  "csv",
  "txt",
  "jpg",
  "jpeg",
  "png",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/jpeg",
  "image/png",
  "application/octet-stream",
]);

function getFileExtension(
  fileName: string
) {
  const parts = fileName
    .toLowerCase()
    .split(".");

  return parts.length > 1
    ? parts.pop() ?? ""
    : "";
}

export async function POST(
  request: Request
) {
  try {
    const schoolId =
      await getCurrentSchoolId();

    if (!schoolId) {
      return NextResponse.json(
        {
          error:
            "You must be signed in and linked to a school to contact OASIS Support.",
        },
        { status: 401 }
      );
    }

    const supabase =
      await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Your account could not be verified.",
        },
        { status: 401 }
      );
    }

    const supportEmail =
      process.env.OASIS_SUPPORT_EMAIL;

    const gmailUser =
      process.env.OASIS_SUPPORT_GMAIL_USER;

    const gmailAppPassword =
      process.env
        .OASIS_SUPPORT_GMAIL_APP_PASSWORD;

    if (
      !supportEmail ||
      !gmailUser ||
      !gmailAppPassword
    ) {
      console.error(
        "OASIS support email configuration is incomplete."
      );

      return NextResponse.json(
        {
          error:
            "OASIS Support is temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    const formData =
      await request.formData();

    const rawMessage =
      formData.get("message");

    const rawFrameworkName =
      formData.get("frameworkName");

    const rawImportError =
      formData.get("importError");

    const attachment =
      formData.get("attachment");

    const message =
      typeof rawMessage === "string"
        ? rawMessage.trim()
        : "";

    const frameworkName =
      typeof rawFrameworkName ===
      "string"
        ? rawFrameworkName.trim()
        : "";

    const importError =
      typeof rawImportError === "string"
        ? rawImportError.trim()
        : "";

    if (message.length < 10) {
      return NextResponse.json(
        {
          error:
            "Please provide a little more information about the problem.",
        },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        {
          error:
            "Your support message is too long. Please keep it under 5,000 characters.",
        },
        { status: 400 }
      );
    }

    let emailAttachment:
      | {
          filename: string;
          content: Buffer;
          contentType?: string;
        }
      | undefined;

    if (
      attachment instanceof File &&
      attachment.size > 0
    ) {
      if (
        attachment.size >
        MAX_ATTACHMENT_SIZE
      ) {
        return NextResponse.json(
          {
            error:
              "The attachment is too large. Maximum file size is 15 MB.",
          },
          { status: 400 }
        );
      }

      const extension =
        getFileExtension(
          attachment.name
        );

      if (
        !ALLOWED_EXTENSIONS.has(
          extension
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Unsupported attachment type. Please upload a PDF, DOCX, XLSX, CSV, TXT, JPG or PNG file.",
          },
          { status: 400 }
        );
      }

      if (
        attachment.type &&
        !ALLOWED_MIME_TYPES.has(
          attachment.type
        )
      ) {
        return NextResponse.json(
          {
            error:
              "The attachment format is not supported.",
          },
          { status: 400 }
        );
      }

      const attachmentBuffer =
        Buffer.from(
          await attachment.arrayBuffer()
        );

      emailAttachment = {
        filename: attachment.name,
        content: attachmentBuffer,
        contentType:
          attachment.type ||
          undefined,
      };
    }

    const transporter =
      nodemailer.createTransport({
        service: "gmail",

        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });

    const senderEmail =
      user.email ?? "Unknown";

    const subjectFramework =
      frameworkName
        ? ` — ${frameworkName}`
        : "";

    const emailText = `
OASIS Framework Support Request

User:
${senderEmail}

User ID:
${user.id}

School ID:
${schoolId}

Framework:
${frameworkName || "Not provided"}

Import / parser error:
${importError || "Not provided"}

Message:
${message}
    `.trim();

    await transporter.sendMail({
      from: {
        name: "OASIS Support",
        address: gmailUser,
      },

      to: supportEmail,

      replyTo:
        user.email || undefined,

      subject:
        `OASIS Framework Support${subjectFramework}`,

      text: emailText,

      attachments:
        emailAttachment
          ? [emailAttachment]
          : [],
    });

    return NextResponse.json({
      success: true,
      message:
        "Your support request has been sent.",
    });
  } catch (error) {
    console.error(
      "Framework support request failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Your support request could not be sent. Please try again.",
      },
      { status: 500 }
    );
  }
}