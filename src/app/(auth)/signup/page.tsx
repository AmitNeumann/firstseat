import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { getAuthUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Create an account — FirstSeat",
};

export default async function SignupPage() {
  if (await getAuthUser()) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted">
          Start watching for tables at the restaurants you cannot get into.
        </p>
      </div>

      <SignupForm />

      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
