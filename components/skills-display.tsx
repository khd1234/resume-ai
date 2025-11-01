"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SkillsDisplayProps {
  skills: string[];
}

export function SkillsDisplay({ skills }: SkillsDisplayProps) {
  if (!skills || skills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Extracted Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No skills extracted yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracted Skills ({skills.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-sm py-1 px-3"
            >
              {skill}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
