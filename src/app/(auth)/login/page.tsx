import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthFrame } from "@/components/auth/auth-frame";
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

  // Set by `/auth/confirm` or `/auth/callback` when a link or Google redirect could not
  // be used. Resolved through a fixed map, so an unrecognised value shows generic copy
  // rather than being echoed.
  const { error } = await searchParams;
  const notice = confirmErrorMessage(error);

  return (
    <AuthFrame
      eyebrow="Welcome back"
      headline="Your watches are exactly where you left them."
      sub="Sign in to see what opens next and how long you have until the drop."
      points={[
        "Live countdowns for every watch",
        "New York time and your time, side by side",
        "One tap to the booking page",
      ]}
      formTitle="Sign in"
      swapHref="/signup"
      swapLabel="New to FirstSeat? Create an account"
    >
      <LoginForm notice={notice} />
    </AuthFrame>
  );
}
