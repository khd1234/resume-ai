import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

// Get current upload limits
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      // Logged-in user
      const limitCheck = await checkUserUploadLimit(session.user.id);
      return NextResponse.json(limitCheck);
    } else {
      // Guest user - check via query params
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
