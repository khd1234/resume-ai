import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generatePresignedUploadUrl,
  validateResumeFileType,
  validateResumeFileSize,
} from "@/lib/s3";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string(),
  fileSize: z.number().positive(),
  guestSessionId: z.string().optional(), // For guest users
});

// Rate limit constants
const GUEST_UPLOAD_LIMIT = 3;
const USER_UPLOAD_LIMIT = 5;
const RATE_LIMIT_WINDOW_HOURS = 24;

async function getClientIp(req: NextRequest): Promise<string> {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwarded?.split(",")[0] || realIp || "unknown";
}

async function checkGuestUploadLimit(sessionId: string, ipAddress: string): Promise<{ allowed: boolean; current: number; max: number }> {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - RATE_LIMIT_WINDOW_HOURS);

  // Count uploads in the last 24 hours by session ID or IP
  const uploadCount = await prisma.guestUpload.count({
    where: {
      OR: [
        { sessionId, uploadedAt: { gte: cutoffTime } },
        { ipAddress, uploadedAt: { gte: cutoffTime } },
      ],
    },
  });

  return {
    allowed: uploadCount < GUEST_UPLOAD_LIMIT,
    current: uploadCount,
    max: GUEST_UPLOAD_LIMIT,
  };
}

async function checkUserUploadLimit(userId: string): Promise<{ allowed: boolean; current: number; max: number }> {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - RATE_LIMIT_WINDOW_HOURS);

  // Count uploads in the last 24 hours for this user
  const uploadCount = await prisma.resume.count({
    where: {
      userId,
      uploadedAt: { gte: cutoffTime },
    },
  });

  return {
    allowed: uploadCount < USER_UPLOAD_LIMIT,
    current: uploadCount,
    max: USER_UPLOAD_LIMIT,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication (optional for guests)
    const session = await getServerSession(authOptions);

    // Parse and validate request body
    const body = await req.json();
    const validationResult = uploadRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { filename, contentType, fileSize, guestSessionId } = validationResult.data;

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

    // Check rate limits
    if (session?.user?.id) {
      // Logged-in user
      const limitCheck = await checkUserUploadLimit(session.user.id);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { 
            error: `Upload limit reached. You can upload ${limitCheck.max} resumes per 24 hours.`,
            current: limitCheck.current,
            max: limitCheck.max,
          },
          { status: 429 }
        );
      }
    } else {
      // Guest user
      if (!guestSessionId) {
        return NextResponse.json(
          { error: "Session ID is required for guest uploads" },
          { status: 400 }
        );
      }

      const ipAddress = await getClientIp(req);
      const limitCheck = await checkGuestUploadLimit(guestSessionId, ipAddress);
      
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { 
            error: `Guest upload limit reached. Sign in to get ${USER_UPLOAD_LIMIT} uploads per day.`,
            current: limitCheck.current,
            max: limitCheck.max,
          },
          { status: 429 }
        );
      }
    }

    // Generate pre-signed URL
    const { url, key } = await generatePresignedUploadUrl({
      userId: session?.user?.id || "guest",
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

// New endpoint to get current upload limits
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      // Logged-in user
      const limitCheck = await checkUserUploadLimit(session.user.id);
      return NextResponse.json(limitCheck);
    } else {
      // Guest user - check via query params or headers
      const { searchParams } = new URL(req.url);
      const sessionId = searchParams.get("sessionId");
      
      if (!sessionId) {
        return NextResponse.json({
          current: 0,
          max: GUEST_UPLOAD_LIMIT,
          allowed: true,
        });
      }

      const ipAddress = await getClientIp(req);
      const limitCheck = await checkGuestUploadLimit(sessionId, ipAddress);
      return NextResponse.json(limitCheck);
    }
  } catch (error) {
    console.error("Error checking upload limit:", error);
    return NextResponse.json(
      { error: "Failed to check upload limit" },
      { status: 500 }
    );
  }
}
