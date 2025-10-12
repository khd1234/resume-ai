"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>View and manage your profile information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>
                    <strong>Email:</strong> {session.user?.email}
                  </p>
                  <p>
                    <strong>Name:</strong> {session.user?.name || "Not set"}
                  </p>
                  {session.user?.image && (
                    <div>
                      <strong>Avatar:</strong>
                      <img src={session.user.image} alt="Profile" className="w-10 h-10 rounded-full mt-2" />
                    </div>
                  )}
                </div>
                <Button className="mt-4" onClick={() => router.push("/profile")}>
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resume Upload</CardTitle>
                <CardDescription>Upload and analyze your resumes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Upload your resume to get AI-powered analysis and insights.</p>
                <Button disabled>Upload Resume (Coming Soon)</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Analysis</CardTitle>
                <CardDescription>View your recent resume analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">No resumes analyzed yet. Upload your first resume to get started!</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
