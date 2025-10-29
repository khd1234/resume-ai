import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createResumeSchema = z.object({
  s3Key: z.string().min(1),
  filename: z.string().min(1).max(255),
});

const getResumesSchema = z.object({
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
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
    const validationResult = createResumeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { s3Key, filename } = validationResult.data;

    // Create resume record in database
    const resume = await prisma.resume.create({
      data: {
        userId: session.user.id,
        s3Key,
        filename,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      {
        id: resume.id,
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
            extractedSkills: true,
            summary: true,
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
