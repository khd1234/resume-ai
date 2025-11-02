import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateSNSSignature,
  confirmSNSSubscription,
  parseSNSPayload,
  extractUserIdFromS3Key,
  type SNSMessage,
  type ProcessingCompletedPayload,
  type ProcessingErrorPayload,
  type ProcessingStartedPayload,
} from "@/lib/sns-validator";

/**
 * SNS Webhook endpoint to receive resume processing results from Lambda
 *
 * Handles:
 * - SubscriptionConfirmation: Confirms SNS topic subscription
 * - Notification: Processes resume results and updates database
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the SNS message
    const snsMessage: SNSMessage = await req.json();

    console.log("Received SNS message:", {
      type: snsMessage.Type,
      messageId: snsMessage.MessageId,
      topicArn: snsMessage.TopicArn,
    });

    // Validate the message is from our SNS topic
    const expectedTopicArn = process.env.AWS_SNS_TOPIC_ARN;
    if (expectedTopicArn && snsMessage.TopicArn !== expectedTopicArn) {
      console.error("Invalid topic ARN:", snsMessage.TopicArn);
      return NextResponse.json({ error: "Invalid topic ARN" }, { status: 403 });
    }

    // Validate SNS signature (IMPORTANT for security)
    const isValid = await validateSNSSignature(snsMessage);
    if (!isValid) {
      console.error("Invalid SNS signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // Handle subscription confirmation
    if (snsMessage.Type === "SubscriptionConfirmation") {
      console.log("Confirming SNS subscription...");

      if (snsMessage.SubscribeURL) {
        const confirmed = await confirmSNSSubscription(snsMessage.SubscribeURL);

        if (confirmed) {
          console.log("SNS subscription confirmed successfully");
          return NextResponse.json({ message: "Subscription confirmed" });
        } else {
          console.error("Failed to confirm subscription");
          return NextResponse.json({ error: "Subscription confirmation failed" }, { status: 500 });
        }
      }

      return NextResponse.json({ error: "No SubscribeURL provided" }, { status: 400 });
    }

    // Handle notification messages
    if (snsMessage.Type === "Notification") {
      const payload = parseSNSPayload(snsMessage);

      if (!payload) {
        console.error("Failed to parse SNS payload");
        return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
      }

      console.log("Processing SNS notification:", {
        eventType: payload.event_type,
        fileKey: payload.file_key,
      });

      // Extract user ID from S3 key
      const userId = extractUserIdFromS3Key(payload.file_key);
      if (!userId) {
        console.error("Failed to extract user ID from S3 key:", payload.file_key);
        return NextResponse.json({ error: "Invalid S3 key format" }, { status: 400 });
      }

      // Route to appropriate handler based on event type
      switch (payload.event_type) {
        case "processing_started":
          await handleProcessingStarted(payload as ProcessingStartedPayload, userId);
          break;

        case "processing_completed":
          await handleProcessingCompleted(payload as ProcessingCompletedPayload, userId);
          break;

        case "processing_error":
          await handleProcessingError(payload as ProcessingErrorPayload, userId);
          break;

        default:
          console.warn("Unknown event type:", (payload as any).event_type);
      }

      return NextResponse.json({ message: "Notification processed" });
    }

    // Unknown message type
    console.warn("Unknown SNS message type:", snsMessage.Type);
    return NextResponse.json({ error: "Unknown message type" }, { status: 400 });
  } catch (error) {
    console.error("Error processing SNS webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Handle processing started notification
 */
async function handleProcessingStarted(payload: ProcessingStartedPayload, userId: string) {
  try {
    console.log("Handling processing started:", payload.file_key);

    // Find the resume by S3 key
    // For guest uploads, userId from S3 key is "guest" but database userId is null
    const resume = await prisma.resume.findFirst({
      where: {
        s3Key: payload.file_key,
        userId: userId === "guest" ? null : userId,
      },
    });

    if (!resume) {
      console.error("Resume not found for S3 key:", payload.file_key);
      return;
    }

    await prisma.resume.update({
      where: { id: resume.id },
      data: { status: "PROCESSING" },
    });

    console.log("Updated resume status to PROCESSING:", resume.id);
  } catch (error) {
    console.error("Error handling processing started:", error);
    throw error;
  }
}

/**
 * Handle processing completed notification
 */
async function handleProcessingCompleted(payload: ProcessingCompletedPayload, userId: string) {
  try {
    console.log("Handling processing completed:", payload.file_key);

    // Find the resume by S3 key
    // For guest uploads, userId from S3 key is "guest" but database userId is null
    const resume = await prisma.resume.findFirst({
      where: {
        s3Key: payload.file_key,
        userId: userId === "guest" ? null : userId,
      },
    });

    if (!resume) {
      console.error("Resume not found for S3 key:", payload.file_key);
      return;
    }

    // Extract results from payload
    const results = payload.results;

    const extractedSkills = results.keywords_found || [];
    const recommendations = results.recommendations || [];
    const strengths = results.strengths || [];
    const improvementAreas = results.improvement_areas || [];

    // Extract section scores if available
    const sectionScores = results.section_scores || {};

    // Create or update the result
    await prisma.$transaction(async (tx) => {
      // Update resume status
      await tx.resume.update({
        where: { id: resume.id },
        data: { status: "COMPLETED" },
      });

      // Upsert the result with all structured data
      await tx.result.upsert({
        where: { resumeId: resume.id },
        create: {
          resumeId: resume.id,
          // Overall scores
          score: results.overall_score,
          atsScore: results.ats_compatibility,
          contentScore: results.content_quality,
          keywordDensity: results.keyword_density,
          // Section scores
          contactScore: sectionScores.contact_information,
          summaryScore: sectionScores.professional_summary,
          experienceScore: sectionScores.work_experience,
          educationScore: sectionScores.education,
          skillsScore: sectionScores.skills,
          formattingScore: sectionScores.formatting,
          // Extracted data and analysis
          extractedSkills: extractedSkills,
          recommendations: recommendations,
          strengths: strengths,
          improvementAreas: improvementAreas,
        },
        update: {
          // Overall scores
          score: results.overall_score,
          atsScore: results.ats_compatibility,
          contentScore: results.content_quality,
          keywordDensity: results.keyword_density,
          // Section scores
          contactScore: sectionScores.contact_information,
          summaryScore: sectionScores.professional_summary,
          experienceScore: sectionScores.work_experience,
          educationScore: sectionScores.education,
          skillsScore: sectionScores.skills,
          formattingScore: sectionScores.formatting,
          // Extracted data and analysis
          extractedSkills: extractedSkills,
          recommendations: recommendations,
          strengths: strengths,
          improvementAreas: improvementAreas,
        },
      });
    });

    console.log("Successfully stored results for resume:", resume.id, {
      score: results.overall_score,
      atsScore: results.ats_compatibility,
      contentScore: results.content_quality,
      skillsCount: extractedSkills.length,
      recommendationsCount: recommendations.length,
      strengthsCount: strengths.length,
    });
  } catch (error) {
    console.error("Error handling processing completed:", error);
    throw error;
  }
}

/**
 * Handle processing error notification
 */
async function handleProcessingError(payload: ProcessingErrorPayload, userId: string) {
  try {
    console.log("Handling processing error:", payload.file_key);

    // Find the resume by S3 key
    // For guest uploads, userId from S3 key is "guest" but database userId is null
    const resume = await prisma.resume.findFirst({
      where: {
        s3Key: payload.file_key,
        userId: userId === "guest" ? null : userId,
      },
    });

    if (!resume) {
      console.error("Resume not found for S3 key:", payload.file_key);
      return;
    }

    // Update resume status to FAILED
    await prisma.resume.update({
      where: { id: resume.id },
      data: { status: "FAILED" },
    });

    console.log("Updated resume status to FAILED:", resume.id, {
      errorType: payload.error_type,
      errorMessage: payload.error_message,
    });

    // Optionally: Store error details in a separate error log table
    // This could be useful for debugging and analytics
  } catch (error) {
    console.error("Error handling processing error:", error);
    throw error;
  }
}

// Allow GET for health checks
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "SNS Webhook",
    message: "This endpoint receives SNS notifications from Lambda",
  });
}
