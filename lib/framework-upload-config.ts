export const FRAMEWORK_UPLOAD_BUCKET = "framework-uploads";
export const MAX_FRAMEWORK_FILE_SIZE = 35 * 1024 * 1024;
export const MAX_FRAMEWORK_IMAGE_SIZE = 20 * 1024 * 1024;

export const FRAMEWORK_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

function getFrameworkExtension(fileName: string) {
  const extension = fileName.toLowerCase().split(".").pop();

  if (
    extension === "pdf" ||
    extension === "docx" ||
    extension === "txt" ||
    extension === "jpg" ||
    extension === "jpeg" ||
    extension === "png" ||
    extension === "webp"
  ) {
    return extension;
  }

  return null;
}

export function getFrameworkContentType(fileName: string, contentType = "") {
  const extension = getFrameworkExtension(fileName);

  if (extension === "pdf") return "application/pdf";
  if (extension === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (extension === "txt") return "text/plain";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";

  return contentType;
}

export function isSupportedFrameworkFile(fileName: string) {
  return getFrameworkExtension(fileName) !== null;
}
