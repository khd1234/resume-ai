"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  message: string;
}

export function ResumeUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowedTypes.includes(file.type)) {
      return "Please select a PDF or DOCX file.";
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return "File size must be less than 2MB.";
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setUploadState({
        status: "error",
        progress: 0,
        message: error,
      });
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadState({
      status: "idle",
      progress: 0,
      message: "",
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadState({
        status: "uploading",
        progress: 10,
        message: "Requesting upload URL...",
      });

      // Step 1: Get pre-signed URL from backend
      const uploadResponse = await fetch("/api/resume/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || "Failed to get upload URL");
      }

      const { uploadUrl, s3Key } = await uploadResponse.json();

      setUploadState({
        status: "uploading",
        progress: 30,
        message: "Uploading to S3...",
      });

      // Step 2: Upload file to S3 using pre-signed URL
      const s3Response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!s3Response.ok) {
        throw new Error("Failed to upload file to S3");
      }

      setUploadState({
        status: "uploading",
        progress: 70,
        message: "Saving metadata...",
      });

      // Step 3: Save resume metadata to database
      const metadataResponse = await fetch("/api/resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          s3Key,
          filename: selectedFile.name,
        }),
      });

      if (!metadataResponse.ok) {
        const error = await metadataResponse.json();
        throw new Error(error.error || "Failed to save resume metadata");
      }

      setUploadState({
        status: "success",
        progress: 100,
        message: "Resume uploaded successfully!",
      });

      // Reset file input
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Reset state after 3 seconds
      setTimeout(() => {
        setUploadState({
          status: "idle",
          progress: 0,
          message: "",
        });
      }, 3000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadState({
        status: "error",
        progress: 0,
        message: error instanceof Error ? error.message : "Upload failed. Please try again.",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Resume</CardTitle>
        <CardDescription>
          Upload your resume in PDF or DOCX format (max 2MB)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* File Input */}
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={handleFileSelect}
              disabled={uploadState.status === "uploading"}
              className="hidden"
              id="resume-upload"
            />
            <label
              htmlFor="resume-upload"
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                uploadState.status === "uploading"
                  ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              <Upload className="h-6 w-6 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {selectedFile ? selectedFile.name : "Click to select resume"}
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF or DOCX (max 2MB)</p>
              </div>
            </label>
          </div>

          {/* Selected File Info */}
          {selectedFile && uploadState.status !== "uploading" && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                <p className="text-xs text-blue-700">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadState.status === "uploading" && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadState.message}
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadState.status === "success" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-900">{uploadState.message}</p>
            </div>
          )}

          {/* Error Message */}
          {uploadState.status === "error" && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-red-900">{uploadState.message}</p>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadState.status === "uploading"}
            className="w-full"
          >
            {uploadState.status === "uploading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Resume
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
