import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface PresignedUrlOptions {
  userId: string;
  filename: string;
  contentType: string;
}

/**
 * Generate a pre-signed URL for uploading a resume to S3
 * @param options - Upload options including userId, filename, and contentType
 * @returns Pre-signed URL and S3 key
 */
export async function generatePresignedUploadUrl(
  options: PresignedUrlOptions
): Promise<{ url: string; key: string }> {
  const { userId, filename, contentType } = options;

  // Generate unique S3 key: resumes/{userId}/{timestamp}-{filename}
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `resumes/${userId}/${timestamp}-${sanitizedFilename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    ContentType: contentType,
  });

  // URL expires in 5 minutes
  const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });

  return { url, key };
}

/**
 * Validate file type for resume uploads
 * @param contentType - MIME type of the file
 * @returns true if valid, false otherwise
 */
export function validateResumeFileType(contentType: string): boolean {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/msword", // .doc
  ];
  return allowedTypes.includes(contentType);
}

/**
 * Validate file size (max 2MB)
 * @param size - File size in bytes
 * @returns true if valid, false otherwise
 */
export function validateResumeFileSize(size: number): boolean {
  const maxSize = 2 * 1024 * 1024; // 2MB
  return size <= maxSize;
}

export { s3Client };
