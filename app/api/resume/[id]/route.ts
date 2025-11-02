import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Fetch resume - allow access for both authenticated users and guests
    const resume = await prisma.resume.findUnique({
      where: {
        id: params.id,
      },
      include: {
        result: {
          select: {
            score: true,
            atsScore: true,
            contentScore: true,
            keywordDensity: true,
            contactScore: true,
            summaryScore: true,
            experienceScore: true,
            educationScore: true,
            skillsScore: true,
            formattingScore: true,
            extractedSkills: true,
            recommendations: true,
            strengths: true,
            improvementAreas: true,
          },
        },
      },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // If resume belongs to a user, check if the requesting user is authorized
    if (resume.userId) {
      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (!user || resume.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    // For guest resumes (userId is null), allow access without authentication

    return NextResponse.json({ resume });
  } catch (error) {
    console.error("Error fetching resume:", error);
    return NextResponse.json(
      { error: "Failed to fetch resume" },
      { status: 500 }
    );
  }
}
