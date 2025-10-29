"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumeUpload } from "@/components/resume-upload";
import { ResumeList } from "@/components/resume-list";

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

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
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

            <div className="lg:col-span-2">
              <ResumeUpload onUploadSuccess={handleUploadSuccess} />
            </div>
          </div>

          <div className="mt-6">
            <ResumeList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>
    </div>
  );
}
