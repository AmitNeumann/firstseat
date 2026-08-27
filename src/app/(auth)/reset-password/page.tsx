import type { Metadata } from "next";
import Link from "next/link";

import { AuthFrame } from "@/components/auth/auth-frame";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { FormAlert } from "@/components/forms/fields";
import { getAuthUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Choose a new password — FirstSeat",
};

export default async function ResetPasswordPage() {
  const user = await getAuthUser();

  return (
    <AuthFrame
      eyebrow="Reset"
      headline="Choose a new password for your watches."
      sub="Once it is saved, you will be signed in and back on My Watches."
      points={[
        "Use at least 8 characters",
        "This replaces the old password immediately",
        "Google sign-in still works if you use that too",
      ]}
      formTitle="New password"
      swapHref="/login"
      swapLabel="Back to sign in"
    >
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="flex flex-col gap-3.5">
          <FormAlert tone="error">
            That reset link is not valid or has expired. Request a new one.
          </FormAlert>
          <Link
            href="/forgot-password"
            className="self-start rounded-lg px-1 py-1 text-[13px] font-semibold
                       text-clay-text hover:bg-honey-light"
          >
            Request a new reset link
          </Link>
        </div>
      )}
    </AuthFrame>
  );
}
