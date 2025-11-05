"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { User, LogOut, LayoutDashboard, Upload as UploadIcon } from "lucide-react";

interface NavbarProps {
  showAuthButtons?: boolean;
}

export function Navbar({ showAuthButtons = true }: NavbarProps) {
  const { data: session, status } = useSession();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src="/images/logo.png"
              alt="Resume AI Logo"
              width={130}
              height={130}
              className="object-contain"
            />
            {/* <span className="text-xl font-bold text-gray-900">Resume AI</span> */}
          </Link>

          {/* Navigation Links */}
          {showAuthButtons && (
            <nav className="flex items-center gap-4">
              {status === "loading" ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : session ? (
                <>
                  {/* Quick Actions */}
                  <Link href="/upload">
                    <Button variant="default" size="sm">
                      <UploadIcon className="h-4 w-4 mr-2" />
                      Analyze Resume
                    </Button>
                  </Link>

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        {session.user?.image ? (
                          <Image
                            src={session.user.image}
                            alt="Profile"
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline max-w-[150px] truncate">
                          {session.user?.name || session.user?.email}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{session.user?.name || "User"}</p>
                        <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard" className="cursor-pointer">
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link href="/upload">
                    <Button variant="ghost" size="sm">
                      Try Free
                    </Button>
                  </Link>
                  <Link href="/auth/signin">
                    <Button variant="outline" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="sm">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
