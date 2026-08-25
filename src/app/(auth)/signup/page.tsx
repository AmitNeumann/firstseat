import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthFrame } from "@/components/auth/auth-frame";
import { SignupForm } from "@/components/auth/signup-form";
import { getAuthUser } from "@/lib/auth/dal";
import { DEFAULT_ALERT_LEAD_MINUTES } from "@/lib/watches/drop-time";

export const metadata: Metadata = {
  title: "Create an account — FirstSeat",
};

export default async function SignupPage() {
  if (await getAuthUser()) {
    redirect("/dashboard");
  }

  return (
    <AuthFrame
      eyebrow="Join FirstSeat"
      headline="Never miss a reservation again."
      sub="We turn every restaurant's release rule into your local clock, and nudge you just before the tables appear."
      points={[
        "Unlimited watches on the city's most sought-after tables.",
        `Alerts in your timezone, ${DEFAULT_ALERT_LEAD_MINUTES} minutes early`,
        "Booking link ready the second it opens",
      ]}
      formTitle="Create your account"
      swapHref="/login"
      swapLabel="Already have an account? Sign in"
      belowForm={
        <div className="text-[12px] leading-snug text-muted [text-wrap:wrap]">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="font-medium text-clay hover:text-clay-dark">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-clay hover:text-clay-dark">
            Privacy Policy
          </Link>
          .
        </div>
      }
    >
      <SignupForm />
    </AuthFrame>
  );
}
