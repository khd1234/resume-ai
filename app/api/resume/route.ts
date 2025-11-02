import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createResumeSchema = z.object({
  s3Key: z.string().min(1),
  filename: z.string().min(1).max(255),
  guestSessionId: z.string().optional(), // For guest users
});

async function getClientIp(req: NextRequest): Promise<string> {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwarded?.split(",")[0] || realIp || "unknown";
}

const getResumesSchema = z.object({
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
});

export async function POST(req: NextRequest) {
  try {
    // Check authentication (optional for guests)
    const session = await getServerSession(authOptions);

    // Parse and validate request body
    const body = await req.json();
    const validationResult = createResumeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { s3Key, filename, guestSessionId } = validationResult.data;

    // For guest users, require session ID
    if (!session?.user?.id && !guestSessionId) {
      return NextResponse.json(
        { error: "Session ID is required for guest uploads" },
        { status: 400 }
      );
    }

    const ipAddress = await getClientIp(req);

    // Create resume record in database
    const resume = await prisma.resume.create({
      data: {
        userId: session?.user?.id || null,
        s3Key,
        filename,
        status: "PENDING",
        guestSessionId: !session?.user?.id ? guestSessionId : null,
        guestIpAddress: !session?.user?.id ? ipAddress : null,
      },
    });

    // Create guest upload record for tracking if this is a guest upload
    if (!session?.user?.id && guestSessionId) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      await prisma.guestUpload.create({
        data: {
          sessionId: guestSessionId,
          ipAddress,
          expiresAt,
        },
      });
    }

    return NextResponse.json(
      {
        resumeId: resume.id,
        filename: resume.filename,
        status: resume.status,
        uploadedAt: resume.uploadedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating resume record:", error);
    return NextResponse.json(
      { error: "Failed to create resume record" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch user's resumes
    const resumes = await prisma.resume.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        result: {
          select: {
            score: true,
            atsScore: true,
            contentScore: true,
            extractedSkills: true,
            recommendations: true,
            strengths: true,
            improvementAreas: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await prisma.resume.count({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      resumes,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching resumes:", error);
    return NextResponse.json(
      { error: "Failed to fetch resumes" },
      { status: 500 }
    );
  }
}
