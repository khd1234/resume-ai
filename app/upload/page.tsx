"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, XCircle, Loader2, ArrowLeft, AlertCircle } from "lucide-react";

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  message: string;
}

interface UploadLimit {
  current: number;
  max: number;
}

export default function UploadPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLimit, setUploadLimit] = useState<UploadLimit | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch upload limit when component mounts
  useEffect(() => {
    fetchUploadLimit();
  }, [session]);

  const fetchUploadLimit = async () => {
    try {
      const response = await fetch("/api/resume/upload/limit");
      if (response.ok) {
        const data = await response.json();
        setUploadLimit(data);
      }
    } catch (error) {
      console.error("Error fetching upload limit:", error);
    }
  };

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

  const getSessionId = (): string => {
    // Get or create a session ID for guest users
    let sessionId = localStorage.getItem("guestSessionId");
    if (!sessionId) {
      sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("guestSessionId", sessionId);
    }
    return sessionId;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Check upload limit
    if (uploadLimit && uploadLimit.current >= uploadLimit.max) {
      setUploadState({
        status: "error",
        progress: 0,
        message: session 
          ? "You've reached your upload limit. Please try again later or contact support."
          : "You've reached the guest upload limit. Please sign in for more uploads.",
      });
      return;
    }

    try {
      setUploadState({
        status: "uploading",
        progress: 10,
        message: "Requesting upload URL...",
      });

      // Prepare request body
      const requestBody: any = {
        filename: selectedFile.name,
        contentType: selectedFile.type,
        fileSize: selectedFile.size,
      };

      // Add session ID for guest users
      if (!session) {
        requestBody.guestSessionId = getSessionId();
      }

      // Step 1: Get pre-signed URL from backend
      const uploadResponse = await fetch("/api/resume/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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
      const metadataBody: any = {
        s3Key,
        filename: selectedFile.name,
      };

      // Add guest tracking info if not authenticated
      if (!session) {
        metadataBody.guestSessionId = getSessionId();
      }

      const metadataResponse = await fetch("/api/resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadataBody),
      });

      if (!metadataResponse.ok) {
        const error = await metadataResponse.json();
        throw new Error(error.error || "Failed to save resume metadata");
      }

      const { resumeId: newResumeId } = await metadataResponse.json();
      setResumeId(newResumeId);

      setUploadState({
        status: "success",
        progress: 100,
        message: "Resume uploaded successfully!",
      });

      // Update upload limit
      fetchUploadLimit();

      // Reset file input
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Redirect to results page after 2 seconds
      setTimeout(() => {
        router.push(`/results/${newResumeId}`);
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadState({
        status: "error",
        progress: 0,
        message: error instanceof Error ? error.message : "Upload failed. Please try again.",
      });
    }
  };

  const isLimitReached = uploadLimit ? uploadLimit.current >= uploadLimit.max : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/">
              <h1 className="text-2xl font-bold text-gray-900 cursor-pointer">Resume AI</h1>
            </Link>
            <div className="space-x-4">
              {authStatus === "loading" ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : session ? (
                <>
                  <Link href="/dashboard">
                    <Button variant="outline">Dashboard</Button>
                  </Link>
                  <span className="text-sm text-gray-600">
                    {session.user?.email}
                  </span>
                </>
              ) : (
                <>
                  <Link href="/auth/signin">
                    <Button variant="outline">Sign in</Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button>Sign Up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href={session ? "/dashboard" : "/"}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {session ? "Dashboard" : "Home"}
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Get Your Resume Score
          </h1>
          <p className="text-lg text-gray-600">
            Upload your resume and receive instant AI-powered analysis
          </p>
        </div>

        {/* Upload Limit Info */}
        {uploadLimit && (
          <div className="mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isLimitReached ? "bg-red-100" : "bg-blue-100"}`}>
                      {isLimitReached ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {session ? "Logged-in User" : "Guest User"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {uploadLimit.current} of {uploadLimit.max} uploads used today
                      </p>
                    </div>
                  </div>
                  <Badge variant={isLimitReached ? "destructive" : "secondary"}>
                    {uploadLimit.max - uploadLimit.current} remaining
                  </Badge>
                </div>
                {!session && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">
                      💡 <Link href="/auth/signup" className="font-semibold underline">Sign up</Link> to get 5 uploads per day and save your resume history!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Resume</CardTitle>
            <CardDescription>
              We accept PDF or DOCX files (max 2MB). Your resume will be analyzed in 30-60 seconds.
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
                  disabled={uploadState.status === "uploading" || isLimitReached}
                  className="hidden"
                  id="resume-upload"
                />
                <label
                  htmlFor="resume-upload"
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-12 border-2 border-dashed rounded-lg transition-colors ${
                    uploadState.status === "uploading" || isLimitReached
                      ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                      : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                  }`}
                >
                  <Upload className={`h-8 w-8 ${isLimitReached ? "text-gray-300" : "text-gray-400"}`} />
                  <div className="text-center">
                    <p className="text-base font-medium text-gray-700">
                      {selectedFile ? selectedFile.name : isLimitReached ? "Upload limit reached" : "Click to select resume"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">PDF or DOCX (max 2MB)</p>
                  </div>
                </label>
              </div>

              {/* Selected File Info */}
              {selectedFile && uploadState.status !== "uploading" && (
                <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
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
                <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">{uploadState.message}</p>
                    <p className="text-xs text-green-700 mt-1">Redirecting to results...</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {uploadState.status === "error" && (
                <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <p className="text-sm font-medium text-red-900">{uploadState.message}</p>
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadState.status === "uploading" || isLimitReached}
                className="w-full"
                size="lg"
              >
                {uploadState.status === "uploading" ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Analyze Resume
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Analysis</h3>
                <p className="text-sm text-gray-600">
                  Get comprehensive insights with our advanced AI engine
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="font-semibold text-gray-900 mb-2">Instant Results</h3>
                <p className="text-sm text-gray-600">
                  Receive detailed feedback in under 60 seconds
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="font-semibold text-gray-900 mb-2">Actionable Tips</h3>
                <p className="text-sm text-gray-600">
                  Get specific recommendations to improve your resume
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
