"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Resume AI</h1>
            <div className="space-x-4">
              {status === "loading" ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : session ? (
                <>
                  <Link href="/dashboard">
                    <Button variant="outline">Dashboard</Button>
                  </Link>
                  <Button onClick={() => signOut({ callbackUrl: "/" })}>Sign out</Button>
                </>
              ) : (
                <>
                  <Link href="/auth/signin">
                    <Button variant="outline">Sign in</Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">AI-Powered</span>
            <span className="block text-blue-600">Resume Analysis</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Upload your resume and get instant AI-powered analysis, skills extraction, and improvement suggestions.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link href="/upload">
                <Button size="lg" className="w-full">
                  Get Your Resume Score
                </Button>
              </Link>
            </div>
            {session ? (
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <Link href="/dashboard">
                  <Button variant="outline" size="lg" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                  <Link href="/auth/signin">
                    <Button variant="outline" size="lg" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="text-2xl mr-3">🔍</span>
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Get comprehensive analysis of your resume with AI-powered insights and recommendations.</CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="text-2xl mr-3">⚡</span>
                  Instant Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Upload your resume and receive detailed analysis within seconds using AWS Lambda processing.</CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="text-2xl mr-3">🔒</span>
                  Secure & Private
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Your data is securely stored and processed with enterprise-grade security and privacy protection.</CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">© 2024 Resume AI. Built with Next.js and AWS.</p>
        </div>
      </footer>
    </div>
  );
}
