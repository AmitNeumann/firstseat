import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { confirmErrorMessage } from "@/lib/auth/confirm-errors";
import { getAuthUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Sign in — FirstSeat",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Checks the auth user rather than the app user: this page has no need to touch the
  // database, and an already signed-in visitor has no use for a login form.
  if (await getAuthUser()) {
    redirect("/dashboard");
  }

  // Set by `/auth/confirm` when a confirmation link could not be used. Resolved through a
  // fixed map, so an unrecognised value shows generic copy rather than being echoed.
  const { error } = await searchParams;
  const notice = confirmErrorMessage(error);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted">Sign in to manage your watches.</p>
      </div>

      <LoginForm notice={notice} />

      <p className="text-sm text-muted">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
          Create one
        </Link>
      </p>
    </div>
  );
}
