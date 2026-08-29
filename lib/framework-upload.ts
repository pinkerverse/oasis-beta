import { createClient } from "@/lib/supabase/client";
import type { FrameworkDefinition } from "@/lib/framework";
import {
  MAX_FRAMEWORK_FILE_SIZE,
  MAX_FRAMEWORK_IMAGE_SIZE,
  getFrameworkContentType,
  isSupportedFrameworkFile,
} from "@/lib/framework-upload-config";

export type FrameworkExtractionMetadata = {
  type: string;
  tables: {
    pageNumber: number;
    tableNumber: number;
    rows: string[][];
  }[];
  pageCount?: number;
  tableExtractionAttempted?: boolean;
  tableContinuationCount?: number;
  ocrApplied?: boolean;
  visualMappingApplied?: boolean;
  layoutConfidence?: "high" | "medium" | "low";
  warnings?: string[];
};

export type FrameworkUploadProgress =
  | "preparing"
  | "uploading"
  | "reading";

type FrameworkExtractionResult = {
  success?: boolean;
  fileName?: string;
  text?: string;
  extraction?: FrameworkExtractionMetadata;
  mappedFramework?: FrameworkDefinition;
  requiresExtraction?: boolean;
  error?: string;
};

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

async function removeTemporaryFramework(path: string) {
  await fetch("/api/framework-upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  }).catch(() => undefined);
}

export async function uploadAndExtractFrameworkFile(
  file: File,
  onProgress?: (progress: FrameworkUploadProgress) => void
) {
  if (!isSupportedFrameworkFile(file.name)) {
    throw new Error(
      "Please upload a PDF, DOCX, TXT, JPG, PNG, or WebP framework file."
    );
  }

  if (file.size === 0) {
    throw new Error("The selected framework file is empty.");
  }

  if (file.size > MAX_FRAMEWORK_FILE_SIZE) {
    throw new Error("Framework files must be 35 MB or smaller.");
  }

  const contentType = getFrameworkContentType(file.name, file.type);

  if (contentType.startsWith("image/") && file.size > MAX_FRAMEWORK_IMAGE_SIZE) {
    throw new Error("Framework images must be 20 MB or smaller.");
  }
  onProgress?.("preparing");

  const prepareResponse = await fetch("/api/framework-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType,
    }),
  });
  const prepared = await readJson(prepareResponse);

  if (!prepareResponse.ok) {
    throw new Error(prepared.error || "The framework upload could not be prepared.");
  }

  const { bucket, path, token } = prepared as {
    bucket?: string;
    path?: string;
    token?: string;
  };

  if (!bucket || !path || !token) {
    throw new Error("The framework upload could not be prepared.");
  }

  onProgress?.("uploading");

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, {
      cacheControl: "0",
      contentType,
    });

  if (uploadError) {
    await removeTemporaryFramework(path);
    throw new Error("The framework file could not be uploaded securely.");
  }

  try {
    onProgress?.("reading");

    const extractionResponse = await fetch("/api/extract-framework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storagePath: path,
        fileName: file.name,
      }),
    });
    const result = (await readJson(
      extractionResponse
    )) as FrameworkExtractionResult;

    if (!extractionResponse.ok) {
      throw new Error(result.error || "The framework could not be read.");
    }

    return result;
  } catch (error) {
    await removeTemporaryFramework(path);
    throw error;
  }
}
