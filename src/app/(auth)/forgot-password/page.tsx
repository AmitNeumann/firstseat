import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthFrame } from "@/components/auth/auth-frame";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { confirmErrorMessage } from "@/lib/auth/confirm-errors";
import { getAuthUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Forgot password — FirstSeat",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAuthUser()) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const notice = confirmErrorMessage(error);

  return (
    <AuthFrame
      eyebrow="Reset"
      headline="We'll send you a link to choose a new password."
      sub="Enter the email you use to sign in. We'll send a reset link if we can."
      points={[
        "The link expires, so open it soon",
        "It has to be opened in the same browser you started in",
        "You can still sign in with Google if you used that",
      ]}
      formTitle="Forgot password"
      swapHref="/login"
      swapLabel="Back to sign in"
    >
      <ForgotPasswordForm notice={notice} />
    </AuthFrame>
  );
}
