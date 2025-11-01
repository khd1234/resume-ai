"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ScoreBreakdownProps {
  scores: {
    overall?: number | null;
    atsScore?: number | null;
    contentScore?: number | null;
    contactScore?: number | null;
    summaryScore?: number | null;
    experienceScore?: number | null;
    educationScore?: number | null;
    skillsScore?: number | null;
    formattingScore?: number | null;
    keywordDensity?: number | null;
  };
}

export function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  const scoreItems = [
    {
      label: "Overall Score",
      value: scores.overall,
      description: "Combined assessment of your resume",
      color: "text-blue-600",
      bgColor: "bg-blue-600",
    },
    {
      label: "ATS Compatibility",
      value: scores.atsScore,
      description: "How well your resume passes ATS systems",
      color: "text-green-600",
      bgColor: "bg-green-600",
    },
    {
      label: "Content Quality",
      value: scores.contentScore,
      description: "Quality and relevance of your content",
      color: "text-purple-600",
      bgColor: "bg-purple-600",
    },
    {
      label: "Contact Information",
      value: scores.contactScore,
      description: "Completeness of contact details",
      color: "text-orange-600",
      bgColor: "bg-orange-600",
    },
    {
      label: "Summary Section",
      value: scores.summaryScore,
      description: "Professional summary effectiveness",
      color: "text-cyan-600",
      bgColor: "bg-cyan-600",
    },
    {
      label: "Experience Section",
      value: scores.experienceScore,
      description: "Work experience presentation",
      color: "text-indigo-600",
      bgColor: "bg-indigo-600",
    },
    {
      label: "Education Section",
      value: scores.educationScore,
      description: "Educational background clarity",
      color: "text-pink-600",
      bgColor: "bg-pink-600",
    },
    {
      label: "Skills Section",
      value: scores.skillsScore,
      description: "Skills listing and organization",
      color: "text-teal-600",
      bgColor: "bg-teal-600",
    },
    {
      label: "Formatting",
      value: scores.formattingScore,
      description: "Document structure and readability",
      color: "text-amber-600",
      bgColor: "bg-amber-600",
    },
    {
      label: "Keyword Density",
      value: scores.keywordDensity,
      description: "Relevant keyword usage",
      color: "text-lime-600",
      bgColor: "bg-lime-600",
    },
  ];

  const getScoreColor = (value: number) => {
    if (value >= 80) return "text-green-600";
    if (value >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scoreItems.map((item) => {
          if (item.value === null || item.value === undefined) return null;

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <span className={`text-xl font-bold ${getScoreColor(item.value)}`}>
                  {item.value.toFixed(0)}
                </span>
              </div>
              <div className="relative">
                <Progress value={item.value} className="h-2" />
                <div
                  className={`absolute top-0 left-0 h-2 rounded-full ${item.bgColor} transition-all`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
