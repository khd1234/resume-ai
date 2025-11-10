"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { ResumeList } from "@/components/resume-list";
import { Upload } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your resumes and view analysis results</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Email:</strong> {session.user?.email}
                  </p>
                  <p className="text-sm">
                    <strong>Name:</strong> {session.user?.name || "Not set"}
                  </p>
                  {session.user?.image && (
                    <div>
                      <strong>Avatar:</strong>
                      <Image src={session.user.image} alt="Profile" width={40} height={40} className="rounded-full mt-2" />
                    </div>
                  )}
                </div>
                <Button className="mt-4 w-full" variant="outline" onClick={() => router.push("/profile")}>
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {/* Upload Resume Card */}
            <div className="lg:col-span-2">
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                    Get Your Resume Score
                  </CardTitle>
                  <CardDescription>
                    Upload a new resume for AI-powered analysis and feedback
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Get instant feedback on your resume with detailed scoring, skill extraction, and personalized recommendations.
                  </p>
                  <Link href="/upload">
                    <Button size="lg" className="w-full">
                      <Upload className="h-5 w-5 mr-2" />
                      Analyze Resume
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Resume List */}
          <div className="mt-6">
            <ResumeList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>
    </div>
  );
}
