import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SignUpForm from "./signup-form";

export default async function SignUpPage() {
  const session = await getServerSession(authOptions);

  // Redirect to dashboard if already authenticated
  if (session) {
    redirect("/dashboard");
  }

  return <SignUpForm />;
}
