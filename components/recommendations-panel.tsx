"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, TrendingUp, AlertCircle } from "lucide-react";

interface RecommendationsPanelProps {
  recommendations?: string[];
  strengths?: string[];
  improvementAreas?: string[];
}

export function RecommendationsPanel({
  recommendations,
  strengths,
  improvementAreas,
}: RecommendationsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Strengths */}
      {strengths && strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-sm text-gray-700">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span className="text-sm text-gray-700">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Areas for Improvement */}
      {improvementAreas && improvementAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {improvementAreas.map((area, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">!</span>
                  <span className="text-sm text-gray-700">{area}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {(!recommendations || recommendations.length === 0) &&
        (!strengths || strengths.length === 0) &&
        (!improvementAreas || improvementAreas.length === 0) && (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-gray-500">
                No analysis available yet. Results will appear once your resume is processed.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
