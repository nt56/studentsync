import cloudinary from "@/lib/cloudinary";

export type UploadCategory = "profiles" | "events";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface UploadResult {
  success: true;
  filePath: string; // Cloudinary secure URL
  fileName: string;
  publicId: string; // Cloudinary public ID for deletion
}

interface UploadError {
  success: false;
  error: string;
}

/**
 * Upload a file to Cloudinary under a folder based on category.
 * Returns the Cloudinary secure URL for storage in user/event documents.
 */
export async function saveUploadedFile(
  file: File,
  category: UploadCategory,
): Promise<UploadResult | UploadError> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      error: `Invalid file type "${file.type}". Allowed: ${ALLOWED_TYPES.join(", ")}`,
    };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 5MB`,
    };
  }

  // Convert file to base64 data URI for Cloudinary upload
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataURI = `data:${file.type};base64,${base64}`;

  // Upload to Cloudinary
  const result = await cloudinary.uploader.upload(dataURI, {
    folder: `studentsync/${category}`,
    resource_type: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });

  return {
    success: true,
    filePath: result.secure_url,
    fileName: result.public_id.split("/").pop() || result.public_id,
    publicId: result.public_id,
  };
}

/**
 * Delete an uploaded file from Cloudinary (best-effort, won't throw)
 */
export async function deleteUploadedFile(
  publicIdOrUrl: string,
): Promise<boolean> {
  try {
    // If given a full URL, extract public_id
    let publicId = publicIdOrUrl;
    if (publicIdOrUrl.startsWith("http")) {
      // Extract public_id from Cloudinary URL
      // URL format: https://res.cloudinary.com/<cloud>/image/upload/v123/folder/filename.ext
      const parts = publicIdOrUrl.split("/upload/");
      if (parts[1]) {
        // Remove version prefix (v123/) and file extension
        publicId = parts[1].replace(/^v\d+\//, "").replace(/\.[^.]+$/, "");
      }
    }
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch {
    return false;
  }
}
