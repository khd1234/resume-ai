import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SignInForm from "./signin-form";

export default async function SignInPage() {
  const session = await getServerSession(authOptions);

  // Redirect to dashboard if already authenticated
  if (session) {
    redirect("/dashboard");
  }

  return <SignInForm />;
}
