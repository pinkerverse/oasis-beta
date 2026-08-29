import { NextResponse } from "next/server";

import {
  FRAMEWORK_MIME_TYPES,
  FRAMEWORK_UPLOAD_BUCKET,
  MAX_FRAMEWORK_FILE_SIZE,
  MAX_FRAMEWORK_IMAGE_SIZE,
  getFrameworkContentType,
  isSupportedFrameworkFile,
} from "@/lib/framework-upload-config";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

async function ensureFrameworkBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(
    FRAMEWORK_UPLOAD_BUCKET
  );

  const bucketOptions = {
    public: false,
    fileSizeLimit: MAX_FRAMEWORK_FILE_SIZE,
    allowedMimeTypes: [...FRAMEWORK_MIME_TYPES],
  };

  if (data) {
    const { error } = await supabaseAdmin.storage.updateBucket(
      FRAMEWORK_UPLOAD_BUCKET,
      bucketOptions
    );

    if (error) throw error;
    return;
  }

  const { error } = await supabaseAdmin.storage.createBucket(
    FRAMEWORK_UPLOAD_BUCKET,
    bucketOptions
  );

  if (error && !error.message.toLowerCase().includes("already")) {
    throw error;
  }
}

async function removeStaleFrameworks(schoolId: string) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const { data, error } = await supabaseAdmin.storage
    .from(FRAMEWORK_UPLOAD_BUCKET)
    .list(schoolId, { limit: 100, sortBy: { column: "created_at", order: "asc" } });

  if (error || !data) return;

  const stalePaths = data
    .filter(
      (item) =>
        item.name &&
        item.created_at &&
        new Date(item.created_at).getTime() < cutoff
    )
    .map((item) => `${schoolId}/${item.name}`);

  if (stalePaths.length > 0) {
    await supabaseAdmin.storage.from(FRAMEWORK_UPLOAD_BUCKET).remove(stalePaths);
  }
}

function isSchoolFrameworkPath(path: string, schoolId: string) {
  return path.startsWith(`${schoolId}/`) && !path.includes("..");
}

export async function POST(request: Request) {
  try {
    const schoolId = await getCurrentSchoolId();

    if (!schoolId) {
      return NextResponse.json(
        { error: "You must be signed in to upload a framework." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const fileName = typeof body?.fileName === "string" ? body.fileName : "";
    const fileSize = Number(body?.fileSize);
    const contentType = getFrameworkContentType(
      fileName,
      typeof body?.contentType === "string" ? body.contentType : ""
    );

    if (!isSupportedFrameworkFile(fileName)) {
      return NextResponse.json(
        {
          error:
            "Please upload a PDF, DOCX, TXT, JPG, PNG, or WebP framework file.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json(
        { error: "The selected framework file is empty." },
        { status: 400 }
      );
    }

    if (fileSize > MAX_FRAMEWORK_FILE_SIZE) {
      return NextResponse.json(
        { error: "Framework files must be 35 MB or smaller." },
        { status: 400 }
      );
    }

    if (contentType.startsWith("image/") && fileSize > MAX_FRAMEWORK_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Framework images must be 20 MB or smaller." },
        { status: 400 }
      );
    }

    if (!(FRAMEWORK_MIME_TYPES as readonly string[]).includes(contentType)) {
      return NextResponse.json(
        {
          error:
            "Please upload a PDF, DOCX, TXT, JPG, PNG, or WebP framework file.",
        },
        { status: 400 }
      );
    }

    await ensureFrameworkBucket();
    await removeStaleFrameworks(schoolId);

    const extension = fileName.toLowerCase().split(".").pop();
    const path = `${schoolId}/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await supabaseAdmin.storage
      .from(FRAMEWORK_UPLOAD_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) throw error || new Error("No upload token was returned.");

    return NextResponse.json({
      bucket: FRAMEWORK_UPLOAD_BUCKET,
      path,
      token: data.token,
    });
  } catch (error) {
    console.error("Framework upload preparation failed:", error);

    return NextResponse.json(
      { error: "The secure framework upload could not be prepared." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const schoolId = await getCurrentSchoolId();

  if (!schoolId) return new NextResponse(null, { status: 401 });

  const body = await request.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path : "";

  if (!isSchoolFrameworkPath(path, schoolId)) {
    return new NextResponse(null, { status: 403 });
  }

  const { error } = await supabaseAdmin.storage
    .from(FRAMEWORK_UPLOAD_BUCKET)
    .remove([path]);

  return new NextResponse(null, { status: error ? 500 : 204 });
}
