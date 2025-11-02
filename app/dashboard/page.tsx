"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {session.user?.name || session.user?.email}</span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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
                      <img src={session.user.image} alt="Profile" className="w-10 h-10 rounded-full mt-2" />
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
