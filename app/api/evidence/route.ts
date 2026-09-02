import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  isSchoolAdmin,
  type CurrentWorkspaceContext,
} from "@/lib/supabase/current-workspace";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "observation-evidence";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

async function ensureEvidenceBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);

  if (data) return;

  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: [...ALLOWED_TYPES],
  });

  if (error && !error.message.toLowerCase().includes("already")) {
    throw error;
  }
}

async function canAccessEvidencePath(
  path: string,
  context: CurrentWorkspaceContext
) {
  if (
    path.includes("..") ||
    !path.startsWith(`${context.schoolId}/`)
  ) {
    return false;
  }

  if (
    path.startsWith(
      `${context.schoolId}/${context.workspaceId}/`
    )
  ) {
    return true;
  }

  let observationQuery = supabaseAdmin
    .from("observations")
    .select("id")
    .eq("school_id", context.schoolId)
    .eq("image_url", path);

  observationQuery = isSchoolAdmin(context.role)
    ? observationQuery.or(
        "workspace_id.eq." +
          context.workspaceId +
          ",workspace_id.is.null"
      )
    : observationQuery.eq("workspace_id", context.workspaceId);

  const { data } = await observationQuery.maybeSingle();
  return Boolean(data);
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentWorkspaceContext();

    if (!context) {
      return NextResponse.json(
        { error: "You must be signed in to upload evidence." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Choose an image to upload." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Use a JPEG, PNG, WebP or GIF image." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Photo evidence must be 8 MB or smaller." },
        { status: 400 }
      );
    }

    await ensureEvidenceBucket();

    const extension =
      file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path =
      `${context.schoolId}/${context.workspaceId}/` +
      `${crypto.randomUUID()}.${extension}`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;

    return NextResponse.json({ path });
  } catch (error) {
    console.error("Evidence upload failed:", error);
    return NextResponse.json(
      { error: "The photo evidence could not be uploaded." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const context = await getCurrentWorkspaceContext();

  if (!context) return new NextResponse(null, { status: 401 });

  const path = new URL(request.url).searchParams.get("path") ?? "";

  if (!(await canAccessEvidencePath(path, context))) {
    return new NextResponse(null, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(path);

  if (error || !data) return new NextResponse(null, { status: 404 });

  return new NextResponse(data, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": data.type || "application/octet-stream",
    },
  });
}

export async function DELETE(request: Request) {
  const context = await getCurrentWorkspaceContext();

  if (!context) return new NextResponse(null, { status: 401 });

  const path = new URL(request.url).searchParams.get("path") ?? "";

  if (!(await canAccessEvidencePath(path, context))) {
    return new NextResponse(null, { status: 403 });
  }

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .remove([path]);

  return new NextResponse(null, { status: error ? 500 : 204 });
}
