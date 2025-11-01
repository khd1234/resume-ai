import crypto from "crypto";

export interface SNSMessage {
  Type: string;
  MessageId: string;
  Token?: string; // For SubscriptionConfirmation
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  UnsubscribeURL?: string;
  SubscribeURL?: string;
}

export interface ProcessingStartedPayload {
  event_type: "processing_started";
  file_key: string;
  bucket: string;
  timestamp: string;
  file_size?: number;
  file_type?: string;
}

export interface ProcessingCompletedPayload {
  event_type: "processing_completed";
  file_key: string;
  bucket: string;
  timestamp: string;
  status: "completed";
  results: {
    overall_score: number;
    section_scores?: {
      contact_information?: number;
      professional_summary?: number;
      work_experience?: number;
      education?: number;
      skills?: number;
      formatting?: number;
    };
    ats_compatibility?: number;
    content_quality?: number;
    keyword_density?: number;
    recommendations?: string[];
    keywords_found?: string[]; // Lambda sends this, not 'skills'
    improvement_areas?: string[];
    strengths?: string[];
    analysis_metadata?: any;
    [key: string]: any;
  };
}

export interface ProcessingErrorPayload {
  event_type: "processing_error";
  file_key: string;
  bucket: string;
  timestamp: string;
  status: "error";
  error_message: string;
  error_type: string;
}

export type SNSPayload = ProcessingStartedPayload | ProcessingCompletedPayload | ProcessingErrorPayload;

/**
 * Validates SNS message signature to ensure it came from AWS
 * @param message - The SNS message to validate
 * @returns true if valid, false otherwise
 */
export async function validateSNSSignature(message: SNSMessage): Promise<boolean> {
  try {
    const certUrl = message.SigningCertURL;

    // Verify the certificate URL is from AWS
    if (!certUrl.startsWith("https://sns.") || !certUrl.includes(".amazonaws.com/")) {
      console.error("Invalid certificate URL:", certUrl);
      return false;
    }

    // Download the certificate
    const certResponse = await fetch(certUrl);
    if (!certResponse.ok) {
      console.error("Failed to fetch certificate");
      return false;
    }

    const cert = await certResponse.text();

    // Build the string to sign based on message type
    // The fields MUST be in alphabetical order as per AWS SNS specification
    let stringToSign = "";

    if (message.Type === "Notification") {
      const fields: string[] = [];

      fields.push("Message\n" + message.Message);
      fields.push("MessageId\n" + message.MessageId);

      if (message.Subject) {
        fields.push("Subject\n" + message.Subject);
      }

      fields.push("Timestamp\n" + message.Timestamp);
      fields.push("TopicArn\n" + message.TopicArn);
      fields.push("Type\n" + message.Type);

      stringToSign = fields.join("\n") + "\n";
    } else if (message.Type === "SubscriptionConfirmation" || message.Type === "UnsubscribeConfirmation") {
      const fields: string[] = [];

      fields.push("Message\n" + message.Message);
      fields.push("MessageId\n" + message.MessageId);
      fields.push("SubscribeURL\n" + (message.SubscribeURL || ""));
      fields.push("Timestamp\n" + message.Timestamp);
      fields.push("Token\n" + (message.Token || ""));
      fields.push("TopicArn\n" + message.TopicArn);
      fields.push("Type\n" + message.Type);

      stringToSign = fields.join("\n") + "\n";
    }

    // Verify the signature
    const verifier = crypto.createVerify("RSA-SHA1");
    verifier.update(stringToSign, "utf8");

    const isValid = verifier.verify(cert, message.Signature, "base64");

    if (!isValid) {
      console.error("SNS signature validation failed");
      console.debug("String to sign:", stringToSign);
    }

    return isValid;
  } catch (error) {
    console.error("Error validating SNS signature:", error);
    return false;
  }
}

/**
 * Confirms SNS subscription by calling the SubscribeURL
 * @param subscribeUrl - The subscription confirmation URL
 */
export async function confirmSNSSubscription(subscribeUrl: string): Promise<boolean> {
  try {
    const response = await fetch(subscribeUrl);
    if (!response.ok) {
      console.error("Failed to confirm SNS subscription");
      return false;
    }
    console.log("SNS subscription confirmed successfully");
    return true;
  } catch (error) {
    console.error("Error confirming SNS subscription:", error);
    return false;
  }
}

/**
 * Parses the SNS message payload
 * @param message - The SNS message
 * @returns Parsed payload
 */
export function parseSNSPayload(message: SNSMessage): SNSPayload | null {
  try {
    return JSON.parse(message.Message) as SNSPayload;
  } catch (error) {
    console.error("Error parsing SNS message:", error);
    return null;
  }
}

/**
 * Extracts user ID from S3 key
 * Format: uploads/{userId}/{timestamp}-{filename} or resumes/{userId}/{timestamp}-{filename}
 */
export function extractUserIdFromS3Key(s3Key: string): string | null {
  try {
    const parts = s3Key.split("/");
    if (parts.length >= 2 && (parts[0] === "uploads" || parts[0] === "resumes")) {
      return parts[1];
    }
    return null;
  } catch (error) {
    console.error("Error extracting user ID from S3 key:", error);
    return null;
  }
}
