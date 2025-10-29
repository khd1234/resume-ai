import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generatePresignedUploadUrl,
  validateResumeFileType,
  validateResumeFileSize,
} from "@/lib/s3";
import { z } from "zod";

const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string(),
  fileSize: z.number().positive(),
});

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = uploadRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { filename, contentType, fileSize } = validationResult.data;

    // Validate file type
    if (!validateResumeFileType(contentType)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only PDF and DOCX files are allowed.",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (!validateResumeFileSize(fileSize)) {
      return NextResponse.json(
        {
          error: "File size exceeds the maximum limit of 2MB.",
        },
        { status: 400 }
      );
    }

    // Generate pre-signed URL
    const { url, key } = await generatePresignedUploadUrl({
      userId: session.user.id,
      filename,
      contentType,
    });

    return NextResponse.json({
      uploadUrl: url,
      s3Key: key,
      expiresIn: 300, // 5 minutes
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
