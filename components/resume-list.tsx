"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Clock, CheckCircle, XCircle } from "lucide-react";

interface Resume {
  id: string;
  filename: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  uploadedAt: string;
  result?: {
    score: number | null;
    atsScore?: number | null;
    contentScore?: number | null;
    extractedSkills: string[];
    recommendations?: string[];
    strengths?: string[];
    improvementAreas?: string[];
  };
}

interface ResumeListProps {
  refreshTrigger?: number;
}

export function ResumeList({ refreshTrigger }: ResumeListProps) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResumes();
  }, [refreshTrigger]);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/resume");

      if (!response.ok) {
        throw new Error("Failed to fetch resumes");
      }

      const data = await response.json();
      setResumes(data.resumes);
    } catch (err) {
      console.error("Error fetching resumes:", err);
      setError(err instanceof Error ? err.message : "Failed to load resumes");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Resume["status"]) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "PROCESSING":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "FAILED":
        return <XCircle className="h-4 w-4" />;
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

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-red-600">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Resumes</CardTitle>
        <CardDescription>
          {resumes.length === 0
            ? "No resumes uploaded yet"
            : `${resumes.length} resume${resumes.length === 1 ? "" : "s"} uploaded`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {resumes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Upload your first resume to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {resume.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(resume.uploadedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {resume.result?.score !== null && resume.result?.score !== undefined && (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        Score: {resume.result.score.toFixed(1)}
                      </p>
                      <div className="flex gap-2 text-xs text-gray-500">
                        {resume.result.atsScore !== null && resume.result.atsScore !== undefined && (
                          <span>ATS: {resume.result.atsScore.toFixed(0)}</span>
                        )}
                        {resume.result.extractedSkills.length > 0 && (
                          <span>{resume.result.extractedSkills.length} skills</span>
                        )}
                      </div>
                    </div>
                  )}
                  <Badge
                    variant="outline"
                    className={`flex items-center gap-1 ${getStatusColor(resume.status)}`}
                  >
                    {getStatusIcon(resume.status)}
                    {resume.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
