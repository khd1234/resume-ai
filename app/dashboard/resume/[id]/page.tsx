"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Loader2, Clock, CheckCircle, XCircle } from "lucide-react";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { SkillsDisplay } from "@/components/skills-display";
import { RecommendationsPanel } from "@/components/recommendations-panel";

interface Resume {
  id: string;
  filename: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  uploadedAt: string;
  result?: {
    score: number | null;
    atsScore: number | null;
    contentScore: number | null;
    keywordDensity: number | null;
    contactScore: number | null;
    summaryScore: number | null;
    experienceScore: number | null;
    educationScore: number | null;
    skillsScore: number | null;
    formattingScore: number | null;
    extractedSkills: string[];
    recommendations: string[];
    strengths: string[];
    improvementAreas: string[];
  };
}

export default function ResumeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResumeDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/resume/${params.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Resume not found");
        }
        throw new Error("Failed to fetch resume details");
      }

      const data = await response.json();
      setResume(data.resume);
    } catch (err) {
      console.error("Error fetching resume details:", err);
      setError(err instanceof Error ? err.message : "Failed to load resume");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchResumeDetails();
    
    // Auto-refresh every 5 seconds if status is PENDING or PROCESSING
    const interval = setInterval(() => {
      if (resume?.status === "PENDING" || resume?.status === "PROCESSING") {
        fetchResumeDetails();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchResumeDetails, resume?.status]);

  const getStatusIcon = (status: Resume["status"]) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-5 w-5" />;
      case "PROCESSING":
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5" />;
      case "FAILED":
        return <XCircle className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: Resume["status"]) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "PROCESSING":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-300";
      case "FAILED":
        return "bg-red-100 text-red-800 border-red-300";
    }
  };

  if (loading && !resume) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-red-600">
                <XCircle className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-semibold">{error || "Resume not found"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-gray-400" />
                  <div>
                    <CardTitle className="text-2xl">{resume.filename}</CardTitle>
                    <CardDescription>
                      Uploaded {new Date(resume.uploadedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`flex items-center gap-2 px-4 py-2 ${getStatusColor(resume.status)}`}
                >
                  {getStatusIcon(resume.status)}
                  {resume.status}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Processing State */}
        {(resume.status === "PENDING" || resume.status === "PROCESSING") && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-spin" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {resume.status === "PENDING" ? "Processing will begin shortly..." : "Analyzing your resume..."}
                </h3>
                <p className="text-sm text-gray-600">
                  This usually takes 30-60 seconds. This page will update automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Failed State */}
        {resume.status === "FAILED" && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-red-600">
                <XCircle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Processing Failed</h3>
                <p className="text-sm text-gray-600">
                  There was an error processing your resume. Please try uploading again.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {resume.status === "COMPLETED" && resume.result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <ScoreBreakdown
                scores={{
                  overall: resume.result.score,
                  atsScore: resume.result.atsScore,
                  contentScore: resume.result.contentScore,
                  contactScore: resume.result.contactScore,
                  summaryScore: resume.result.summaryScore,
                  experienceScore: resume.result.experienceScore,
                  educationScore: resume.result.educationScore,
                  skillsScore: resume.result.skillsScore,
                  formattingScore: resume.result.formattingScore,
                  keywordDensity: resume.result.keywordDensity,
                }}
              />
              <SkillsDisplay skills={resume.result.extractedSkills || []} />
            </div>

            {/* Right Column */}
            <div>
              <RecommendationsPanel
                recommendations={resume.result.recommendations}
                strengths={resume.result.strengths}
                improvementAreas={resume.result.improvementAreas}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
